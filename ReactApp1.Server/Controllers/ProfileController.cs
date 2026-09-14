// Controllers/ProfileController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ReactApp1.Server.Data;
using ReactApp1.Server.DTOs;
using ReactApp1.Server.Model;
using ReactApp1.Server.Services;

namespace ReactApp1.Server.Controllers
{
    [Route("api/profile")]
    [ApiController]
    [Authorize] // ✅ require login
    public class ProfileController : ControllerBase
    {
        private readonly EventDbContext _db;
        private readonly ILogger<ProfileController> _logger;
        private readonly IDashboardRepository _dashboard;
        private readonly S3UploadService _s3UploadService;
        private readonly IAuthService _authService; 

        public ProfileController(
            EventDbContext db, 
            ILogger<ProfileController> logger, 
            IDashboardRepository dashboardRepository, 
            S3UploadService s3UploadService,
            IAuthService authService) 
        {
            _db = db;
            _logger = logger;
            _dashboard = dashboardRepository;
            _s3UploadService = s3UploadService;
            _authService = authService; 
        }

        private int? AuthUserId()
            => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : (int?)null;

        private string AuthRole()
            => User.FindFirstValue(ClaimTypes.Role) ?? "";

        private static bool IsOrganizer(string role)
            => string.Equals(role, "Organizer", StringComparison.OrdinalIgnoreCase);
        
        private string? GenerateAvatarUrl(string? s3Key)
        {
            if (string.IsNullOrEmpty(s3Key)) return null;
            
            try
            {
                return _s3UploadService.GeneratePublicUrl(s3Key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate avatar URL for S3 key: {S3Key}", s3Key);
                return null;
            }
        }

        /// <summary>
        /// Only self OR organizer (and if organizer, only when target is a Student).
        /// </summary>
        private bool CanAccessTarget(User target)
        {
            var myId = AuthUserId();
            var myRole = AuthRole();

            if (myId == null) return false;

            // Self can always access
            if (target.Id == myId.Value) return true;

            // Organizer can access ONLY student profiles
            if (IsOrganizer(myRole) && target.Role == UserRole.Student) return true;

            return false;
        }

        // GET /api/profile/{id}
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ProfileDto>> Get(int id)
        {
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (u is null) return NotFound();
            var myId = AuthUserId();
            if (myId is null) return Forbid();          
            if (u.Id == myId.Value) goto OK;           
            if (u.Role == UserRole.Organizer) goto OK; 
            if (!CanAccessTarget(u)) return Forbid(); 

            OK:
            return Ok(new ProfileDto
            {
                Id = u.Id,
                Email = u.Email ?? "",
                Username = u.Username ?? "",
                ProfilePictureUrl = GenerateAvatarUrl(u.AvatarS3Key),
                AvatarS3Key = u.AvatarS3Key,
                Role = u.Role.ToString(),
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt
            });
        }

        // PUT /api/profile/{id}
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ProfileDto>> Update(int id, [FromBody] UserUpdateDto dto)
        {
            var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id);
            if (u is null) return NotFound();

            if (!CanAccessTarget(u)) return Forbid(); // ✅ rule
            
            bool hasChanges = false;
            
            if (!string.IsNullOrWhiteSpace(dto.Username) && dto.Username != u.Username)
            {
                u.Username = dto.Username!;
                hasChanges = true;
            }
            
            if (!string.IsNullOrWhiteSpace(dto.Email) && dto.Email != u.Email)
            {
                u.Email = dto.Email!;
                hasChanges = true;
            }
            
            if (dto.AvatarS3Key != null && dto.AvatarS3Key != u.AvatarS3Key)
            {
                u.AvatarS3Key = dto.AvatarS3Key;
                hasChanges = true;
            }
            
            await _db.SaveChangesAsync();
            
            var myId = AuthUserId();
            if (hasChanges && myId.HasValue && myId.Value == id)
            {
                try
                {
                    await _authService.RefreshUserClaimsAsync(HttpContext, u);
                    _logger.LogInformation("Refreshed claims after profile update for user {UserId}", id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to refresh claims for user {UserId} after profile update", id);
                }
            }
            
            var updated = await _db.Users.AsNoTracking().FirstAsync(x => x.Id == id);
            return Ok(new ProfileDto
            {
                Id = updated.Id,
                Email = updated.Email ?? "",
                Username = updated.Username ?? "",
                ProfilePictureUrl = GenerateAvatarUrl(updated.AvatarS3Key),
                AvatarS3Key = updated.AvatarS3Key,
                Role = updated.Role.ToString(),
                CreatedAt = updated.CreatedAt,
                LastLoginAt = updated.LastLoginAt
            });
        }

        // REMOVED: POST /api/profile/{id}/avatar endpoint
        // Avatar upload now handled via S3 presigned URLs
        // Frontend uploads directly to S3, then saves S3 key via PUT /api/profile/{id} 
        // POST /api/profile/{id}/avatar

        [HttpGet("{id:int}/getStudentRegistrations")]
        public async Task<IActionResult> GetStudentRegistrations(int id)
        {
            var totalRegistrations = await _dashboard.GetTotalRegistrationsByStudentAsync(id);
            return Ok(totalRegistrations);
        }

        [HttpGet("{id:int}/getOrganizerPublished")]
        public async Task<IActionResult> GetOrganizerPublished(int id)
        {
            var totalPublished = await _dashboard.GetTotalPublishedEventsByOrganizerIdAsync(id);
            return Ok(totalPublished);
        }
    }
}