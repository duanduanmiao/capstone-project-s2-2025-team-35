using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Model;
using System.Linq;

namespace ReactApp1.Server.Data
{
    public class EventRepository : IEventRepository
    {
        private readonly EventDbContext _context;

        public EventRepository(EventDbContext context)
        {
            _context = context;
        }




        public IEnumerable<Event> GetLeastRegisteredEvents(int count)
        {
            return _context.Events
                      .OrderBy(e => e.Registrations.Count)
                      .Take(count)
                      .Select(e => new Event
                      {
                          Id = e.Id,
                          Title = e.Title,
                          StartAt = e.StartAt,
                          EndAt = e.EndAt,
                          Location = e.Location,
                          Description = e.Description,
                          ImageS3Key = e.ImageS3Key,
                          Capacity = e.Capacity,
                          Category = e.Category,
                          Tags = e.Tags,
                          OrganizerId = e.OrganizerId,
                          CreatedAt = e.CreatedAt,
                          Registered = e.Registrations.Count
                      })
                      .ToList();
        }


        public IEnumerable<Event> GetAllEvents(string? category, string? search)
        {

            var query = _context.Events.AsQueryable();

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(e => e.Category.ToLower() == category.ToLower());
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim().ToLower();
                query = query.Where(e =>
                    e.Title.ToLower().Contains(searchTerm) ||
                    e.Location.ToLower().Contains(searchTerm)
                );
            }
            return query
                .Select(e => new Event
                {
                    Id = e.Id,
                    Title = e.Title,
                    StartAt = e.StartAt,
                    EndAt = e.EndAt,
                    Location = e.Location,
                    Description = e.Description,
                    ImageS3Key = e.ImageS3Key,
                    Capacity = e.Capacity,
                    Category = e.Category,
                    Tags = e.Tags,
                    OrganizerId = e.OrganizerId,
                    CreatedAt = e.CreatedAt,
                    Registered = e.Registrations.Count
                })
                .ToList();
        }


        public Event? GetEventById(int id)
        {
            return _context.Events
                .Where(x => x.Id == id)
                .Select(e => new Event
                {
                    Id = e.Id,
                    Title = e.Title,
                    StartAt = e.StartAt,
                    EndAt = e.EndAt,
                    Location = e.Location,
                    Description = e.Description,
                    ImageS3Key = e.ImageS3Key,
                    Capacity = e.Capacity,
                    Category = e.Category,
                    Tags = e.Tags,
                    OrganizerId = e.OrganizerId,
                    CreatedAt = e.CreatedAt,
                    Registered = e.Registrations.Count
                })
                .FirstOrDefault();
        }

        // check if Already registered
        public bool IsUserRegistered(int eventId, int userId) =>
            _context.EventRegistrations.Any(r => r.EventId == eventId && r.UserId == userId);

        // check if Time conflict (overlaps with user&#x27;s other registered events)
        // check if Time conflict (overlaps with user's other registered events)
        public bool HasTimeConflict(int userId, DateTime startAt, DateTime endAt, int? excludeEventId = null)
        {

            return _context.Events
                .Where(e =>
                    _context.EventRegistrations.Any(r => r.UserId == userId && r.EventId == e.Id) &&
                    (excludeEventId == null || e.Id != excludeEventId))
                .Any(e => e.StartAt < endAt && startAt < e.EndAt);
        }

        
        public Event? FindFirstTimeConflict(int userId, DateTime startAt, DateTime endAt, int? excludeEventId = null)
        {
            return _context.Events
                .Where(e =>
                    _context.EventRegistrations.Any(r => r.UserId == userId && r.EventId == e.Id) &&
                    (excludeEventId == null || e.Id != excludeEventId) &&
                    e.StartAt < endAt && startAt < e.EndAt)
                .OrderBy(e => e.StartAt)
                .Select(e => new Event {
                    Id = e.Id,
                    Title = e.Title,
                    StartAt = e.StartAt,
                    EndAt = e.EndAt
                })
                .FirstOrDefault();
        }
        
        // ✅ Register (explicitly pass userId)
        public bool RegisterForEvent(int eventId, int userId)
        {

            var e = _context.Events.FirstOrDefault(x => x.Id == eventId);
            if (e == null) return false;

            var currentCount = _context.EventRegistrations.Count(r => r.EventId == eventId);
            if (currentCount >= e.Capacity) return false;
            if (e.EndAt < DateTime.UtcNow) return false;

            if (IsUserRegistered(eventId, userId)) return false;

            _context.EventRegistrations.Add(new EventRegistration
            {
                EventId = eventId,
                UserId = userId,
                RegisteredAt = DateTime.UtcNow
            });
            _context.SaveChanges();
            return true;

        }


        public IEnumerable<Event> GetEventsByOrganizer(int organizerId)
        {
            return _context.Events
            .Where(e => e.OrganizerId == organizerId)
            .OrderByDescending(e => e.StartAt)
            .Select(e => new Event
            {
                Id = e.Id,
                Title = e.Title,
                StartAt = e.StartAt,
                EndAt = e.EndAt,
                Location = e.Location,
                Description = e.Description,
                ImageS3Key = e.ImageS3Key,
                Capacity = e.Capacity,
                Category = e.Category,
                Tags = e.Tags,
                OrganizerId = e.OrganizerId,
                CreatedAt = e.CreatedAt,
                Registered = e.Registrations.Count() // 一次 SQL 就能算出来
            })
            .ToList();
        }


        public bool HasRoomClash(int organizerId, string location, DateTime startAt, DateTime endAt, int? ignoreEventId = null)
        {
            var norm = location.Trim().ToLower();
            return _context.Events.Any(e =>
                e.OrganizerId == organizerId &&
                e.Location.ToLower() == norm &&
                e.StartAt < endAt && startAt < e.EndAt &&
                (ignoreEventId == null || e.Id != ignoreEventId.Value));
        }

        public int CreateEvent(Event e)
        {
            _context.Events.Add(e);
            _context.SaveChanges();
            return e.Id;
        }

        public bool UpdateEvent(Event e)
        {
            var existing = _context.Events.FirstOrDefault(x => x.Id == e.Id && x.OrganizerId == e.OrganizerId);
            if (existing == null) return false;

            existing.Title = e.Title;
            existing.StartAt = e.StartAt;
            existing.EndAt = e.EndAt;
            existing.Location = e.Location;
            existing.Capacity = e.Capacity;
            existing.Category = e.Category;
            existing.Description = e.Description;

            if (!string.IsNullOrEmpty(e.ImageS3Key))
            {
                existing.ImageS3Key = e.ImageS3Key;
            }
            _context.SaveChanges();
            return true;
        }

        public bool UnregisterForEvent(int eventId, int userId)
        {
            var reg = _context.EventRegistrations
                .FirstOrDefault(r => r.EventId == eventId && r.UserId == userId);
            if (reg == null) return false;
            _context.EventRegistrations.Remove(reg);
            _context.SaveChanges();
            return true;
        }
        public IEnumerable<AgendaItem> GetAgenda(int eventId)
            => _context.AgendaItems.Where(a => a.EventId == eventId).OrderBy(a => a.Order).ToList();

        public AgendaItem? GetAgendaItem(int id)
            => _context.AgendaItems.FirstOrDefault(a => a.Id == id);

        public async Task<AgendaItem> AddAgendaItem(int eventId, AgendaItem item)
        {
            item.EventId   = eventId;
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            // ✅ EF 可翻译写法：把 Order 投成可空，再用 ?? -1
            var currentMax = await _context.AgendaItems
                .Where(a => a.EventId == eventId)
                .Select(a => (int?)a.Order)
                .MaxAsync() ?? -1;

            item.Order = currentMax + 1;

            _context.AgendaItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public bool UpdateAgendaItem(AgendaItem item)
        {
            item.UpdatedAt = DateTime.UtcNow;
            _context.AgendaItems.Update(item);
            return _context.SaveChanges() > 0;
        }

        public bool DeleteAgendaItem(int id)
        {
            var a = _context.AgendaItems.FirstOrDefault(x => x.Id == id);
            if (a == null) return false;
            _context.AgendaItems.Remove(a);
            return _context.SaveChanges() > 0;
        }

        public bool ReorderAgenda(int eventId, IEnumerable<(int id, int order)> newOrders)
        {
            var map = newOrders.ToDictionary(x => x.id, x => x.order);
            var items = _context.AgendaItems.Where(a => a.EventId == eventId).ToList();
            foreach (var it in items)
            {
                if (map.TryGetValue(it.Id, out var ord))
                {
                    it.Order = ord;
                    it.UpdatedAt = DateTime.UtcNow;
                }
            }
            return _context.SaveChanges() > 0;
        }

        public async Task<bool> HasEventExpiredAsync(int eventId)
        {
            var now = DateTime.UtcNow;
            Event e = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            return now < e.EndAt;
        }
    }
}