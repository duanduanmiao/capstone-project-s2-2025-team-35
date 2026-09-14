using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Model;

namespace ReactApp1.Server.Data
{
    public class EventDbContext : DbContext
    {
        private readonly IConfiguration _config;

        public EventDbContext(DbContextOptions<EventDbContext> options, IConfiguration config)
            : base(options)
        {
            _config = config;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Only if AddDbContext(...) didn't already configure Npgsql
            if (!optionsBuilder.IsConfigured)
            {
                // Prefer normal config; fall back to env var (App Runner style)
                var cs =
                    _config.GetConnectionString("DefaultConnection") ??
                    Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

                if (string.IsNullOrWhiteSpace(cs))
                    throw new InvalidOperationException("DefaultConnection is not configured.");

                optionsBuilder.UseNpgsql(cs);
            }
        }
        public DbSet<User> Users { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<EventRegistration> EventRegistrations { get; set; }
        
        public DbSet<AgendaItem> AgendaItems { get; set; }
    }
}
