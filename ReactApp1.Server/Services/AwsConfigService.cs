using Amazon.SimpleSystemsManagement;
using Amazon.SimpleSystemsManagement.Model;

namespace ReactApp1.Server.Services;

public class AwsConfigService
    {
        private readonly AmazonSimpleSystemsManagementClient _ssmClient;
        private readonly ILogger<AwsConfigService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        public AwsConfigService(ILogger<AwsConfigService> logger, IConfiguration configuration, IWebHostEnvironment environment)
        {
            _logger = logger;
            _configuration = configuration;
            _environment = environment;
            
            // Configure SSM client with longer timeout for AppRunner environment
            var config = new AmazonSimpleSystemsManagementConfig
            {
                RegionEndpoint = Amazon.RegionEndpoint.APSoutheast2,
                Timeout = TimeSpan.FromSeconds(30), // Increase timeout to 30 seconds
                MaxErrorRetry = 3 // Add retry mechanism
            };
            _ssmClient = new AmazonSimpleSystemsManagementClient(config);
        }

        public async Task<string> GetParameterAsync(string parameterName)
        {
            const int maxRetries = 3;
            const int delayMs = 1000; // 1 second delay between retries
            
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    var request = new GetParameterRequest
                    {
                        Name = parameterName,
                        WithDecryption = true // Important for SecureString parameters
                    };

                    _logger.LogDebug("Attempting to retrieve SSM parameter {ParameterName} (attempt {Attempt}/{MaxRetries})", 
                        parameterName, attempt, maxRetries);

                    var response = await _ssmClient.GetParameterAsync(request);
                    
                    _logger.LogInformation("Successfully retrieved SSM parameter {ParameterName}", parameterName);
                    return response.Parameter.Value;
                }
                catch (ParameterNotFoundException)
                {
                    _logger.LogError("Parameter {ParameterName} not found", parameterName);
                    throw new InvalidOperationException($"Required parameter {parameterName} not found");
                }
                catch (Exception ex) when (attempt < maxRetries)
                {
                    _logger.LogWarning(ex, "Failed to retrieve parameter {ParameterName} on attempt {Attempt}/{MaxRetries}, retrying in {DelayMs}ms", 
                        parameterName, attempt, maxRetries, delayMs);
                    
                    await Task.Delay(delayMs * attempt); // Exponential backoff
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to retrieve parameter {ParameterName} after {MaxRetries} attempts", 
                        parameterName, maxRetries);
                    throw;
                }
            }
            
            throw new InvalidOperationException($"Failed to retrieve parameter {parameterName} after {maxRetries} attempts");
        }

        public async Task<AwsConfig> GetAwsConfigAsync()
        {
            if (_environment.IsDevelopment())
            {
                var localConfig = GetLocalAwsConfig();
                if (localConfig != null)
                {
                    _logger.LogInformation("Using local AWS configuration for development");
                    return localConfig;
                }
                _logger.LogWarning("No local AWS configuration found, falling back to SSM");
            }

            var bucketName = await GetParameterAsync("/capstone-team35/s3-bucket-name");
            var region = await GetParameterAsync("/capstone-team35/aws-region");

            return new AwsConfig
            {
                BucketName = bucketName,
                Region = region
            };
        }

        public async Task<GoogleAuthConfig> GetGoogleAuthConfigAsync()
        {
            if (_environment.IsDevelopment())
            {
                var localConfig = GetLocalGoogleAuthConfig();
                if (localConfig != null)
                {
                    _logger.LogInformation("Using local Google Auth configuration for development");
                    return localConfig;
                }
                _logger.LogWarning("No local Google Auth configuration found, falling back to SSM");
            }

            var clientId = await GetParameterAsync("/capstone-team35/google-client-id");
            var clientSecret = await GetParameterAsync("/capstone-team35/google-client-secret");

            return new GoogleAuthConfig
            {
                ClientId = clientId,
                ClientSecret = clientSecret
            };
        }

        private AwsConfig? GetLocalAwsConfig()
        {
            try
            {
                var bucketName = _configuration["AWS:BucketName"];
                var region = _configuration["AWS:Region"];
                var isPublic = _configuration.GetValue<bool>("AWS:IsPublicBucket", false);

                if (string.IsNullOrWhiteSpace(bucketName) || 
                    string.IsNullOrWhiteSpace(region))
                {
                    return null;
                }

                return new AwsConfig
                {
                    BucketName = bucketName,
                    Region = region,
                    IsPublicBucket = isPublic
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read local AWS configuration");
                return null;
            }
        }

        private GoogleAuthConfig? GetLocalGoogleAuthConfig()
        {
            try
            {
                var clientId = _configuration["Auth:Google:ClientId"];
                var clientSecret = _configuration["Auth:Google:ClientSecret"];

                if (string.IsNullOrWhiteSpace(clientId) || 
                    string.IsNullOrWhiteSpace(clientSecret))
                {
                    return null;
                }

                return new GoogleAuthConfig
                {
                    ClientId = clientId,
                    ClientSecret = clientSecret
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read local Google Auth configuration");
                return null;
            }
        }

        public void Dispose()
        {
            _ssmClient?.Dispose();
        }
    }

    public class AwsConfig
    {
        public string BucketName { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public bool IsPublicBucket { get; set; } = false;
    }

    public class GoogleAuthConfig
    {
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
    }