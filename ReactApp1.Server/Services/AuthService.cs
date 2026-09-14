using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using ReactApp1.Server.Data;
using ReactApp1.Server.Model;

namespace ReactApp1.Server.Services;

public class AuthService: IAuthService
{
    private readonly IUserRepository _userRepository;
        private readonly ILogger<AuthService> _logger;

        public AuthService(IUserRepository userRepository, ILogger<AuthService> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<(User user, bool isNewUser)> ProcessUserLoginAsync(string email, string? name, string googleId)
        {
            var existingUser = await FindExistingUserAsync(email, googleId);
            if (existingUser != null)
            {
                return (existingUser, false); 
            }
            
            if (!await ValidateEmailForRegistrationAsync(email))
            {
                _logger.LogWarning("Invalid email domain for student registration: {Email}", email);
                throw new InvalidOperationException("Only @aucklanduni.ac.nz emails are allowed for students");
            }
            
            var newUser = await CreateNewStudentUserAsync(email, googleId, name);
            return (newUser, true); 
        }

        public async Task<User?> FindExistingUserAsync(string email, string googleId)
        {
            try
            {
                var existingUser = await _userRepository.GetByEmailAsync(email);
                if (existingUser != null)
                {
                    if (existingUser.GoogleId != googleId)
                    {
                        existingUser.GoogleId = googleId;
                        await _userRepository.UpdateAsync(existingUser);
                        _logger.LogInformation("Updated GoogleId for existing user: {Email}", email);
                    }
                    return existingUser;
                }
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding existing user for email: {Email}", email);
                throw;
            }
        }

        public async Task<bool> ValidateEmailForRegistrationAsync(string email)
        {
            try
            {
                return await _userRepository.IsValidAucklandEmailAsync(email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating email: {Email}", email);
                throw;
            }
        }

        public async Task<User> CreateNewStudentUserAsync(string email, string googleId, string? name)
        {
            try
            {
                var emailPrefix = email.Split('@')[0]; 
                var newUser = new User
                {
                    Email = email,
                    Username = emailPrefix,   
                    GoogleId = googleId,      
                    Role = UserRole.Student,  
                    CreatedAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow
                };

                var createdUser = await _userRepository.CreateAsync(newUser);
                _logger.LogInformation("Created new student user: {Email} with GoogleId: {GoogleId}", email, googleId);
                return createdUser;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating new student user for email: {Email}", email);
                throw;
            }
        }

        public List<Claim> CreateUserClaims(User user)
        {
            return new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("AvatarS3Key", user.AvatarS3Key ?? "")
            };
        }

        public object CreateUserInfo(User user, bool isNewUser)
        {
            return new
            {
                id = user.Id,
                email = user.Email,
                username = user.Username,
                role = user.Role,
                googleId = user.GoogleId,
                isFirstLogin = isNewUser
            };
        }
        
        public async Task RefreshUserClaimsAsync(HttpContext httpContext, User user)
        {
            try
            {
                var claims = CreateUserClaims(user);
                var claimsIdentity = new ClaimsIdentity(claims, "MyAuthentication");
                var claimsPrincipal = new ClaimsPrincipal(claimsIdentity);
                
                await httpContext.SignInAsync("MyAuthentication", claimsPrincipal);

                _logger.LogInformation("Successfully refreshed claims for user: {UserId} ({Username})", user.Id,
                    user.Username);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh claims for user: {UserId}", user.Id);
                throw;
            }
        }
}