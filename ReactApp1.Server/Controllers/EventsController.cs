using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Data;
using ReactApp1.Server.Model;
using ReactApp1.Server.DTOs;
using ReactApp1.Server.Services;
using System.Numerics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using ReactApp1.Server.Model.Dto;

namespace ReactApp1.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly IEventRepository _eventRepository;
        private readonly EventDbContext _db;
        private readonly S3UploadService _s3UploadService;

        public EventsController(IEventRepository eventRepository, EventDbContext db, S3UploadService s3UploadService)
        {
            _eventRepository = eventRepository;
            _db = db;
            _s3UploadService = s3UploadService;
        }

        private string? GenerateImageUrl(string? s3Key)
        {
            if (string.IsNullOrEmpty(s3Key)) return null;
            return _s3UploadService.GeneratePublicUrl(s3Key);
        }


       
        [AllowAnonymous]
        [HttpGet("least-registered")]
        public ActionResult<IEnumerable<EventDto>> GetLeastRegisteredEvents([FromQuery] int count = 5)
        {
            if (count <= 0)
            {
                return BadRequest("Count must be a positive number.");
            }

            var events = _eventRepository.GetLeastRegisteredEvents(count);

            var eventDtos = events.Select(e => new EventDto
            {
                Id = e.Id,
                Title = e.Title,
                StartAt = e.StartAt,
                EndAt = e.EndAt,
                Location = e.Location,
                Description = e.Description,
                ImageUrl = GenerateImageUrl(e.ImageS3Key),
                Capacity = e.Capacity,
                Category = e.Category,
                Tags = e.Tags,
                Registered = e.Registered,
                OrganizerId = e.OrganizerId,
                CreatedAt = e.CreatedAt
            }).ToList();

            return Ok(eventDtos);
        }

        // Unify any DateTime to UTC
        private static DateTime EnsureUtc(DateTime dt)
        {
            return dt.Kind switch
            {
                DateTimeKind.Utc   => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _                  => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };
        }

        // 接受 DateTimeOffset 的重载，并在 Agenda 相关端点用它
        private static DateTime EnsureUtc(DateTimeOffset dto) => dto.UtcDateTime;

        // GET: api/events
        [AllowAnonymous] // 公开
        [HttpGet]
        public ActionResult<IEnumerable<EventDto>> GetAllEvents([FromQuery] string? category, [FromQuery] string? search)
        {
            var events = _eventRepository.GetAllEvents(category, search);

            var eventDtos = events.Select(e => new EventDto
            {
                Id = e.Id,
                Title = e.Title,
                StartAt = EnsureUtc(e.StartAt),
                EndAt = EnsureUtc(e.EndAt),
                Location = e.Location,
                Description = e.Description,
                ImageUrl = GenerateImageUrl(e.ImageS3Key),
                Capacity = e.Capacity,
                Category = e.Category,
                Tags = e.Tags,
                Registered = e.Registered,
                OrganizerId = e.OrganizerId,
                CreatedAt = EnsureUtc(e.CreatedAt)
            }).ToList();

            return Ok(eventDtos);
        }

        // GET: api/events/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous] // 公开
        public ActionResult<EventDto> GetEventDetail(int id)
        {
            var e = _eventRepository.GetEventById(id);
            if (e == null) return NotFound();

            var user = GetCurrentUser();
            var isReg   = user != null && _eventRepository.IsUserRegistered(id, user.Id);
            var canEdit = user != null && user.Role == UserRole.Organizer && e.OrganizerId == user.Id; // 只有“该活动的拥有者”可编辑

            var dto = new EventDto
            {
                Id = e.Id,
                Title = e.Title,
                StartAt = EnsureUtc(e.StartAt),
                EndAt = EnsureUtc(e.EndAt),
                Location = e.Location,
                Description = e.Description,
                ImageUrl = GenerateImageUrl(e.ImageS3Key),
                Capacity = e.Capacity,
                Category = e.Category,
                Tags = e.Tags,
                Registered = e.Registered,
                OrganizerId = e.OrganizerId,
                CreatedAt = EnsureUtc(e.CreatedAt),
                IsRegistered = isReg,
                CanEdit = canEdit
            };
            return Ok(dto);
        }

        // Resolving organizerId (Header → query → default 1)
        // private int ResolveOrganizerId()
        // {
        //     if (Request.Headers.TryGetValue("X-Debug-UserId", out var hv) && int.TryParse(hv, out var hid)) return hid;
        //     if (int.TryParse(Request.Query["organizerId"], out var qid)) return qid;
        //     return 1;
        // }

        // Create: POST /api/Events
        [HttpPost]
        [Authorize(Policy = "OrganizerOnly")] // 只有组织者
        public ActionResult Create([FromBody] EventCreateDto dto)
        {
            var user = GetCurrentUser();
            if (user is null) return Unauthorized();

            var startUtc = EnsureUtc(dto.StartAt);
            var endUtc   = EnsureUtc(dto.EndAt);

            if (endUtc <= startUtc)
            {
                var ms = new ModelStateDictionary();
                ms.AddModelError("endAt", "End time must be after start time.");
                return ValidationProblem(ms);
            }

            if (_eventRepository.HasRoomClash(user.Id, dto.Location, startUtc, endUtc))
                return Conflict(new { message = "Room already booked in that time slot." });

            var imageUrl = SaveImageDataUrl(dto.ImageDataUrl);

            var entity = new Event
            {
                Title = dto.Title,
                StartAt = startUtc,
                EndAt = endUtc,
                Location = dto.Location,
                Capacity = dto.Capacity,
                Category = dto.Category,
                Description = dto.Description,
                ImageS3Key = imageUrl,
                OrganizerId = user.Id,
                CreatedAt = DateTime.UtcNow
            };

            var id = _eventRepository.CreateEvent(entity);
            return CreatedAtAction(nameof(GetEventDetail), new { id }, null);
        }

        // Update: PUT /api/Events/{id}
        [HttpPut("{id:int}")]
        [Authorize(Policy = "OrganizerOnly")] // 只有组织者
        public ActionResult Update(int id, [FromBody] EventUpdateDto dto)
        {
            var user = GetCurrentUser();
            if (user is null) return Unauthorized();

            var organizerId = user.Id;
            var startUtc    = EnsureUtc(dto.StartAt);
            var endUtc      = EnsureUtc(dto.EndAt);

            if (endUtc <= startUtc)
            {
                var ms = new ModelStateDictionary();
                ms.AddModelError("endAt", "End time must be after start time.");
                return ValidationProblem(ms);
            }

            if (_eventRepository.HasRoomClash(organizerId, dto.Location, startUtc, endUtc, ignoreEventId: id))
                return Conflict(new { message = "Room already booked in that time slot." });

            var imageUrl = SaveImageDataUrl(dto.ImageDataUrl);

            var entity = new Event
            {
                Id = id,
                Title = dto.Title,
                StartAt = startUtc,
                EndAt = endUtc,
                Location = dto.Location,
                Capacity = dto.Capacity,
                Category = dto.Category,
                Description = dto.Description,
                ImageS3Key = imageUrl,
                OrganizerId = organizerId
            };

            var ok = _eventRepository.UpdateEvent(entity);
            if (!ok) return NotFound();

            return NoContent();
        }

        // Save data: Image/... to wwwroot/uploads/events
        private string? SaveImageDataUrl(string? dataUrl)
        {
            if (string.IsNullOrWhiteSpace(dataUrl)) return null;

            var m = System.Text.RegularExpressions.Regex.Match(
                dataUrl, @"^data:(?<mime>image\/[a-zA-Z0-9\+\.\-]+);base64,(?<b64>.+)$");
            if (!m.Success) return null;

            var mime = m.Groups["mime"].Value.ToLowerInvariant();
            var b64  = m.Groups["b64"].Value;

            byte[] bytes;
            try { bytes = Convert.FromBase64String(b64); }
            catch { return null; }

            // It is explicitly declared as string to avoid type inference to int
            string ext = mime switch
            {
                "image/png"  => ".png",
                "image/jpeg" => ".jpg",
                "image/jpg"  => ".jpg",
                _            => ".bin"
            };

            var dir  = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "events");
            Directory.CreateDirectory(dir);
            var file = $"{Guid.NewGuid()}{ext}";
            var full = Path.Combine(dir, file);

            /// Use fully qualified names to avoid references to ControllerBase.File(...) conflict
            global::System.IO.File.WriteAllBytes(full, bytes);

            return $"/uploads/events/{file}";
        }

        [HttpPost("{id:int}/register")]
        [Authorize(Policy = "StudentOnly")] // 只有学生
        public ActionResult RegisterForEvent(int id)
        {
            var e = _eventRepository.GetEventById(id);
            if (e == null)
                return NotFound(new { code = "EVENT_NOT_FOUND", message = "Event not found" });

            var user = GetCurrentUser();
            if (user is null)
                return Unauthorized(new { code = "UNAUTHENTICATED", message = "Please sign in" });

            if (user.Role == UserRole.Organizer)
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { code = "ROLE_FORBIDDEN", message = "Organizers cannot register for events." });

            if (e.EndAt < DateTime.UtcNow)
                return Conflict(new { code = "EVENT_ENDED", message = "Event has ended" });

            // 用仓储方法直接找“第一条”与本次报名时段重叠、且该用户已报名的活动
            var conflictEvent = _eventRepository.FindFirstTimeConflict(user.Id, e.StartAt, e.EndAt, id);
            if (conflictEvent != null)
            {
                return Conflict(new
                {
                    code = "TIME_CONFLICT",
                    message = "Time conflict with another registered event.",
                    conflict = new
                    {
                        id = conflictEvent.Id,
                        title = conflictEvent.Title,
                        startAt = EnsureUtc(conflictEvent.StartAt),
                        endAt = EnsureUtc(conflictEvent.EndAt)
                    }
                });
            }

            // 保留原有兜底：极少数情况下（例如仓储实现调整）仍可判定冲突
            if (_eventRepository.HasTimeConflict(user.Id, e.StartAt, e.EndAt, id))
                return Conflict(new { code = "TIME_CONFLICT", message = "Time conflict with another registered event." });

            if (e.Capacity - e.Registered <= 0)
                return Conflict(new { code = "NO_SEATS", message = "No seats available" });

            var ok = _eventRepository.RegisterForEvent(id, user.Id);
            if (!ok)
                return Conflict(new { code = "REGISTRATION_FAILED", message = "Registration failed" });

            var updated = _eventRepository.GetEventById(id);
            return Ok(new { ok = true, registered = updated?.Registered ?? 0 });
        }

        // DELETE: api/events/{id}/register
        [HttpDelete("{id:int}/register")]
        [Authorize(Policy = "StudentOnly")] // 只有学生
        public ActionResult UnregisterForEvent(int id)
        {
            var user = GetCurrentUser();
            if (user is null) return Unauthorized();

            // ✅ 组织者账号不应存在报名记录，直接拒绝
            if (user.Role == UserRole.Organizer)
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { message = "Organizers have no registrations to cancel." });

            var ok = _eventRepository.UnregisterForEvent(id, user.Id);
            if (!ok) return NotFound(new { message = "Not registered" });

            var updated = _eventRepository.GetEventById(id);
            return Ok(new { ok = true, registered = updated?.Registered ?? 0 });
        }

        // 任何用户可读
        [HttpGet("{id:int}/agenda")]
        [AllowAnonymous]
        public ActionResult<IEnumerable<AgendaItemDto>> GetAgenda(int id)
        {
            var e = _eventRepository.GetEventById(id);
            if (e == null) return NotFound();

            var items = _eventRepository.GetAgenda(id)
                .Select(a => new AgendaItemDto
                {
                    Id = a.Id,
                    Order = a.Order,
                    Title = a.Title,
                    Description = a.Description,
                    StartAt = a.StartAt.HasValue ? new DateTimeOffset(EnsureUtc(a.StartAt.Value)) : (DateTimeOffset?)null,
                    EndAt   = a.EndAt.HasValue   ? new DateTimeOffset(EnsureUtc(a.EndAt.Value))   : (DateTimeOffset?)null,
                    IsDone = a.IsDone,
                    CreatedAt = new DateTimeOffset(EnsureUtc(a.CreatedAt)),
                    UpdatedAt = new DateTimeOffset(EnsureUtc(a.UpdatedAt))
                })
                .ToList();

            return Ok(items);
        }

        [Authorize(Policy = "OrganizerOnly")]
        [HttpPost("{id:int}/agenda")]
        public async Task<IActionResult> CreateAgendaItem(int id, [FromBody] CreateAgendaItemDto dto)
        {
            var entity = new AgendaItem
            {
                Title = dto.Title,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description,
                StartAt = dto.StartAt.HasValue ? EnsureUtc(dto.StartAt.Value) : (DateTime?)null,
                EndAt   = dto.EndAt.HasValue   ? EnsureUtc(dto.EndAt.Value)   : (DateTime?)null,
                IsDone  = false
            };

            var created = await _eventRepository.AddAgendaItem(id, entity);

            return CreatedAtAction(nameof(GetAgenda), new { id }, new AgendaItemDto
            {
                Id = created.Id,
                EventId = created.EventId,
                Order = created.Order,
                Title = created.Title,
                Description = created.Description,
                StartAt = created.StartAt.HasValue ? new DateTimeOffset(EnsureUtc(created.StartAt.Value)) : (DateTimeOffset?)null,
                EndAt   = created.EndAt.HasValue   ? new DateTimeOffset(EnsureUtc(created.EndAt.Value))   : (DateTimeOffset?)null,
                IsDone = created.IsDone,
                CreatedAt = new DateTimeOffset(EnsureUtc(created.CreatedAt)),
                UpdatedAt = new DateTimeOffset(EnsureUtc(created.UpdatedAt))
            });
        }

        [Authorize(Policy = "OrganizerOnly")]
        [HttpPut("agenda/{agendaId:int}")]
        public ActionResult UpdateAgendaItem(int agendaId, [FromBody] UpdateAgendaItemDto dto)
        {
            var item = _eventRepository.GetAgendaItem(agendaId);
            if (item == null) return NotFound();

            var e = _eventRepository.GetEventById(item.EventId);
            if (e == null) return NotFound();

            var user = GetCurrentUser();
            if (user == null) return Unauthorized();
            if (!(user.Role == UserRole.Organizer && e.OrganizerId == user.Id)) return Forbid();

            if (dto.Title != null) item.Title = dto.Title;
            if (dto.Description != null) item.Description = dto.Description;

            // 先计算新值（支持只改一边）
            DateTime? newStart = item.StartAt;
            DateTime? newEnd   = item.EndAt;

            if (dto.StartAt.HasValue) newStart = EnsureUtc(dto.StartAt.Value);
            if (dto.EndAt.HasValue)   newEnd   = EnsureUtc(dto.EndAt.Value);

            // 两边都有时做先后校验
            if (newStart.HasValue && newEnd.HasValue && newEnd <= newStart)
            {
                var ms = new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary();
                ms.AddModelError("endAt", "End time must be after start time.");
                return ValidationProblem(ms);
            }

            item.StartAt = newStart;
            item.EndAt   = newEnd;

            if (dto.IsDone.HasValue) item.IsDone = dto.IsDone.Value;

            item.UpdatedAt = DateTime.UtcNow;

            var ok = _eventRepository.UpdateAgendaItem(item); // 你自己的仓储
            if (!ok) return StatusCode(500);

            return NoContent();
        }

        [Authorize(Policy = "OrganizerOnly")]
        [HttpDelete("agenda/{agendaId:int}")]
        public ActionResult DeleteAgendaItem(int agendaId)
        {
            var item = _eventRepository.GetAgendaItem(agendaId);
            if (item == null) return NotFound();

            var e = _eventRepository.GetEventById(item.EventId);
            if (e == null) return NotFound();

            var user = GetCurrentUser();
            if (user == null) return Unauthorized();
            if (!(user.Role == UserRole.Organizer && e.OrganizerId == user.Id)) return Forbid();

            var ok = _eventRepository.DeleteAgendaItem(agendaId);
            if (!ok) return StatusCode(500);

            return NoContent();
        }

        [Authorize(Policy = "OrganizerOnly")]
        [HttpPost("{id:int}/agenda/reorder")]
        public ActionResult ReorderAgenda(int id, [FromBody] ReorderAgendaDto dto)
        {
            var e = _eventRepository.GetEventById(id);
            if (e == null) return NotFound();

            var user = GetCurrentUser();
            if (user == null) return Unauthorized();
            if (!(user.Role == UserRole.Organizer && e.OrganizerId == user.Id)) return Forbid();

            var ok = _eventRepository.ReorderAgenda(id, dto.Items.Select(x => (x.Id, x.Order)));
            if (!ok) return StatusCode(500);

            return NoContent();
        }

        // ✅ 用 Claims 读取当前登录用户；DEBUG 下保留后门头
        private int? GetUserId()
        {
            // 来自 Cookie 会话（Google 登录后由 AuthController 写入）
            var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(s, out var uid)) return uid;

#if DEBUG
            // 仅本地联调时允许：X-Debug-UserId
            if (Request.Headers.TryGetValue("X-Debug-UserId", out var hv) && int.TryParse(hv, out var hid)) return hid;
#endif

            return null;
        }

        private User? GetCurrentUser()
        {
            var uid = GetUserId();
            return uid is int id ? _db.Users.FirstOrDefault(u => u.Id == id) : null;
        }
    }
}
