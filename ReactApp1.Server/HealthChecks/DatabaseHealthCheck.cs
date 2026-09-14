using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ReactApp1.Server.Data;

namespace ReactApp1.Server.HealthChecks;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly EventDbContext _context;

    public DatabaseHealthCheck(EventDbContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            // Test database connection
            await _context.Database.CanConnectAsync(cancellationToken);
            
            // Test a simple query
            var count = await _context.Events.CountAsync(cancellationToken);
            
            return HealthCheckResult.Healthy($"Database connection is working. Events count: {count}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy($"Database connection failed: {ex.Message}", ex);
        }
    }
}
