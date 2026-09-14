using ReactApp1.Server.Model;

namespace ReactApp1.Server.Data
{
    public interface IEventRepository
    {
        IEnumerable<Event> GetLeastRegisteredEvents(int count);
        IEnumerable<Event> GetAllEvents(string? category, string? search);
        Event? GetEventById(int id);
        IEnumerable<Event> GetEventsByOrganizer(int organizerId);
        bool HasRoomClash(int organizerId, string location, DateTime startAt, DateTime endAt, int? ignoreEventId = null);
        int CreateEvent(Event e);
        bool UpdateEvent(Event e);
        // check register status
        bool IsUserRegistered(int eventId, int userId);
        // check time conflict
        bool HasTimeConflict(int userId, DateTime startAt, DateTime endAt, int? excludeEventId = null);

        // register for event 
        bool RegisterForEvent(int eventId, int userId);
        Event? FindFirstTimeConflict(int userId, DateTime startAt, DateTime endAt, int? excludeEventId = null);
        
        // unregister for event
        bool UnregisterForEvent(int eventId, int userId);
        
        IEnumerable<AgendaItem> GetAgenda(int eventId);
        AgendaItem? GetAgendaItem(int id);
        Task<AgendaItem> AddAgendaItem(int eventId, AgendaItem item);
        bool UpdateAgendaItem(AgendaItem item);
        bool DeleteAgendaItem(int id);
        bool ReorderAgenda(int eventId, IEnumerable<(int id, int order)> newOrders);

        Task<bool> HasEventExpiredAsync(int eventId);
    }
}