using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Services;

namespace ReactApp1.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = "MyAuthentication")]
    public class FileUploadController : ControllerBase
    {
        private readonly S3UploadService _s3UploadService;
        private readonly ILogger<FileUploadController> _logger;
        private readonly IWebHostEnvironment _environment;

        public FileUploadController(S3UploadService s3UploadService, ILogger<FileUploadController> logger, IWebHostEnvironment environment)
        {
            _s3UploadService = s3UploadService;
            _logger = logger;
            _environment = environment;
        }

        [HttpGet("presigned-url")]
        public async Task<IActionResult> GetPresignedUrl(
            [FromQuery] int? eventId, 
            [FromQuery] int? userId, 
            [FromQuery] string? tempId,
            [FromQuery] string fileName, 
            [FromQuery] string contentType)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return BadRequest(new { error = "Valid fileName is required" });
                }

                if (string.IsNullOrWhiteSpace(contentType))
                {
                    return BadRequest(new { error = "Valid contentType is required" });
                }

                // Priority: userId > eventId > tempId
                if (userId.HasValue && userId.Value > 0)
                {
                    var presignedData = await _s3UploadService.GeneratePresignedPostAsync(
                        userId.Value, 
                        fileName, 
                        contentType,
                        "user");
                    return Ok(presignedData);
                }
                
                if (eventId.HasValue && eventId.Value > 0)
                {
                    var presignedData = await _s3UploadService.GeneratePresignedPostAsync(
                        eventId.Value, 
                        fileName, 
                        contentType,
                        "event");
                    return Ok(presignedData);
                }
                
                if (!string.IsNullOrWhiteSpace(tempId))
                {
                    var presignedData = await _s3UploadService.GeneratePresignedPostAsync(
                        tempId, 
                        fileName, 
                        contentType,
                        "event");
                    return Ok(presignedData);
                }

                return BadRequest(new { error = "Either eventId, userId, or tempId is required" });
            }
            catch (Exception ex)
            {
                var idInfo = userId?.ToString() ?? eventId?.ToString() ?? tempId ?? "unknown";
                _logger.LogError(ex, "Failed to generate presigned URL for ID {Id}", idInfo);
                return StatusCode(500, new { error = "Failed to generate upload URL" });
            }
        }
        
    }
}