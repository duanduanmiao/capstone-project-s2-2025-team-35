using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReactApp1.Server;
using ReactApp1.Server.Data;
using ReactApp1.Server.Services;
using Microsoft.Extensions.Options;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

const string ViteCors = "ViteCors";

// ---------- Services ----------
builder.Services.AddCors(options =>
{
    options.AddPolicy(ViteCors, policy =>
        policy.WithOrigins(
                "https://jqyzrpuwyu.ap-southeast-2.awsapprunner.com",
                "https://cemsuoa.com",
                "https://www.cemsuoa.com",
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:63647",
                "https://localhost:63647")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddSingleton<AwsConfigService>();
builder.Services.AddScoped<S3UploadService>();

builder.Services.AddDbContext<EventDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Authentication + Google
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "MyAuthentication";
        options.DefaultSignInScheme       = "MyAuthentication";
        options.DefaultChallengeScheme    = "MyAuthentication"; // don't auto-redirect on APIs
    })
    .AddCookie("MyAuthentication", options =>
    {
        options.Cookie.Name = "cems_auth";
        options.LoginPath = "/api/auth/google";
        options.LogoutPath = "/api/auth/logout";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);

        // Dynamic cookie security based on environment
        var isProduction = builder.Environment.IsProduction();
        if (isProduction)
        {
            options.Cookie.SameSite = SameSiteMode.None;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        }
        else
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        }

        // Return proper status codes to fetch() instead of HTML redirects
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin        = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; },
            OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; }
        };
    })
    .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        // For development, try to get from configuration first
        var clientId = builder.Configuration["Auth:Google:ClientId"];
        var clientSecret = builder.Configuration["Auth:Google:ClientSecret"];
        
        // If not found in config (production), we'll configure it dynamically
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            // Use placeholder values - will be configured dynamically in production
            options.ClientId = "placeholder";
            options.ClientSecret = "placeholder";
        }
        else
        {
            options.ClientId = clientId;
            options.ClientSecret = clientSecret;
        }
        
        options.CallbackPath = "/signin-google";
        options.SaveTokens = true;
        options.Scope.Add("profile");
        options.Scope.Add("email");
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("StudentOnly",   p => p.RequireRole("Student"));
    options.AddPolicy("OrganizerOnly", p => p.RequireRole("Organizer"));
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// read flags/config
var app = builder.Build();

// Configure Google OAuth - use configuration values directly
var clientId = builder.Configuration["Auth:Google:ClientId"];
var clientSecret = builder.Configuration["Auth:Google:ClientSecret"];

if (!string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
{
    var googleOptions = app.Services.GetRequiredService<IOptions<GoogleOptions>>();
    var googleAuthOptions = googleOptions.Value;
    googleAuthOptions.ClientId = clientId;
    googleAuthOptions.ClientSecret = clientSecret;
    
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("Google OAuth configured from configuration: ClientId={ClientId}", clientId);
}
else
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning("Google OAuth configuration not found in appsettings or environment variables");
}
var skipMigrations = app.Configuration.GetValue<bool>("SkipEfMigrations", false);

// ---------- Minimal, fast health endpoint (responds before DB work) ----------
app.MapGet("/healthz", () => Results.Ok("ok")).AllowAnonymous();

// ---------- Middleware ----------
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor
});

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "events"));

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors(ViteCors);

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.MapMethods("{*path}", new[] { "OPTIONS" }, () => Results.Ok())
   .RequireCors(ViteCors);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

// ---------- EF migrations (optional, can be skipped in App Runner) ----------
if (!skipMigrations)
{
    using var scope = app.Services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<EventDbContext>();
        db.Database.Migrate();                  // apply EF migrations
        SeedData.Initialize(db);                // optional seeding

        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("EF provider {Provider} | ConnString: {ConnString}",
            db.Database.ProviderName,
            db.Database.GetDbConnection().ConnectionString);
    }
    catch (Exception ex)
    {
        scope.ServiceProvider.GetRequiredService<ILogger<Program>>()
            .LogError(ex, "An error occurred applying migrations/seeding the DB.");
    }
}

// ---------- Admin endpoint to create DB manually ----------
app.MapPost("/__admin/create-db", async (IConfiguration cfg) =>
{
    var adminCs = cfg.GetConnectionString("AdminConnection")!;
    await using var conn = new NpgsqlConnection(adminCs);
    await conn.OpenAsync();

    const string existsSql = "SELECT 1 FROM pg_database WHERE datname = 'cemsdb'";
    await using (var checkCmd = new NpgsqlCommand(existsSql, conn))
    {
        var exists = await checkCmd.ExecuteScalarAsync();
        if (exists is object)
            return Results.Ok("Database cemsdb already exists");
    }

    const string createSql = "CREATE DATABASE cemsdb";
    await using (var createCmd = new NpgsqlCommand(createSql, conn))
    {
        await createCmd.ExecuteNonQueryAsync();
    }

    return Results.Ok("Database cemsdb created successfully");
});

app.Run();
