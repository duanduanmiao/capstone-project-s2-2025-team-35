using System.Security.Claims;
using ReactApp1.Server.Model;

namespace ReactApp1.Server.Services;

public interface IAuthService
{
    Task<(User user, bool isNewUser)> ProcessUserLoginAsync(string email, string? name, string googleId);
    Task<User?> FindExistingUserAsync(string email, string googleId);
    Task<bool> ValidateEmailForRegistrationAsync(string email);
    Task<User> CreateNewStudentUserAsync(string email, string googleId, string? name);
    List<Claim> CreateUserClaims(User user);
    object CreateUserInfo(User user, bool isNewUser);
    Task RefreshUserClaimsAsync(HttpContext httpContext, User user);
}