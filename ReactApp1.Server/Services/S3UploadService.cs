using Amazon.S3;
using Amazon.S3.Model;
using Amazon;

namespace ReactApp1.Server.Services
{
    public class S3UploadService
    {
        private readonly AwsConfigService _configService;
        private readonly ILogger<S3UploadService> _logger;
        private AmazonS3Client? _s3Client;
        private AwsConfig? _awsConfig;

        public S3UploadService(AwsConfigService configService, ILogger<S3UploadService> logger)
        {
            _configService = configService;
            _logger = logger;
        }

        public async Task<AmazonS3Client> GetS3ClientAsync()
        {
            if (_s3Client == null || _awsConfig == null)
            {
                _awsConfig = await _configService.GetAwsConfigAsync();
                
                var config = new AmazonS3Config
                {
                    RegionEndpoint = RegionEndpoint.GetBySystemName(_awsConfig.Region)
                };

                _s3Client = new AmazonS3Client(config);
            }

            return _s3Client;
        }
        
        // Overload for int id (backward compatibility)
        public async Task<object> GeneratePresignedPostAsync(int id, string fileName, string contentType, string uploadType = "event")
        {
            return await GeneratePresignedPostAsync(id.ToString(), fileName, contentType, uploadType);
        }
        
        // Main implementation with string id (supports UUID, eventId, userId, etc.)
        public async Task<object> GeneratePresignedPostAsync(string id, string fileName, string contentType, string uploadType = "event")
        {
            try
            {
                var s3Client = await GetS3ClientAsync();
                var bucketName = _awsConfig!.BucketName;
                
                // Choose folder based on upload type
                var folder = uploadType.ToLower() == "user" ? "user-avatars" : "event-images";

                // Generate S3 key with timestamp and original filename
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var fileExtension = Path.GetExtension(fileName);
                var s3Key = $"{folder}/{id}/{timestamp}{fileExtension}";

                // Use AWS SDK's built-in presigned POST generation
                var request = new CreatePresignedPostRequest()
                {
                    BucketName = bucketName,
                    Key = s3Key,
                    Expires = DateTime.UtcNow.AddMinutes(15)
                };

                // Add conditions for security
                request.Conditions.Add(S3PostCondition.ContentLengthRange(1, 5 * 1024 * 1024)); // 1 byte to 5MB
                request.Conditions.Add(S3PostCondition.StartsWith("content-type", "image/"));
                
                // Form field the frontend must send with the file
                request.Fields["content-type"] = contentType;

                // Create presigned POST (v4 uses *Create* and async)
                CreatePresignedPostResponse resp = await s3Client.CreatePresignedPostAsync(request);

                // Return the data needed for frontend
                var result = new
                {
                    url = resp.Url,
                    fields = resp.Fields,
                    s3Key = s3Key,
                };

                _logger.LogInformation("Generated presigned POST for {UploadType} id {Id}, key {S3Key}, bucket {BucketName}", 
                    uploadType, id, s3Key, bucketName);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate presigned POST for {UploadType} id {Id}", uploadType, id);
                throw;
            }
        }

        public string? GeneratePublicUrl(string? s3Key)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(s3Key))
            {
                return null;
            }

            // Initialize config if needed (synchronously)
            if (_awsConfig == null)
            {
                _awsConfig = _configService.GetAwsConfigAsync().GetAwaiter().GetResult();
            }

            // Generate public URL
            try
            {
                var url = $"https://{_awsConfig.BucketName}.s3.{_awsConfig.Region}.amazonaws.com/{s3Key}";
                _logger.LogDebug("Generated public URL for S3 key {S3Key}", s3Key);
                return url;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate public URL for S3 key {S3Key}", s3Key);
                return null;
            }
        }
        
        public void Dispose()
        {
            _s3Client?.Dispose();
        }
    }
}