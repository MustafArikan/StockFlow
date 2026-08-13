using System.Security.Claims;
using System.Text;
using System.Net;
using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using System.Threading.RateLimiting;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using stok_takip.Middlewares;
using stok_takip.Constants;
using stok_takip.Attributes;
using stok_takip.Authorization;
using Microsoft.AspNetCore.Authorization;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddRateLimiter(options =>
{
    // --- YENİ: IP bazlı rate limiter (Global DoS önlemi) ---
    options.AddPolicy("AuthLimit", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"AuthLimit:{ip}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    // --- YENİ: Veritabanından Authorization Policies okunarak rate limit policy'leri üretilir ---
    // Not: Rate limiter kuralları uygulama başlarken yüklenir. DB'den değiştirildiğinde uygulamanın yeniden başlatılması gerekir.
    var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
    optionsBuilder.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    using var tempContext = new AppDbContext(optionsBuilder.Options, null!);
    
    try
    {
        var dbPolicies = tempContext.AppAuthorizationPolicies.ToList();
        foreach (var policy in dbPolicies)
        {
            var policyKey = policy.Key;
            var permitLimit = policy.PermitLimit;
            var windowSeconds = policy.WindowSeconds;

            if (permitLimit <= 0 || windowSeconds <= 0) continue;

            options.AddPolicy(policyKey, httpContext =>
            {
                var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? httpContext.Connection.RemoteIpAddress?.ToString()
                             ?? "anonymous";

                return RateLimitPartition.GetFixedWindowLimiter(
                    $"{policyKey}:{userId}",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromSeconds(windowSeconds),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });
        }
    }
    catch
    {
        // Migrations henüz çalıştırılmadıysa tablo yok hatasını yoksay
    }

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // Too Many Requests
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(System.Net.IPAddress.Parse("172.16.0.0"), 12));
});
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 1_048_576);
builder.Services.AddHttpContextAccessor();

// --- Prometheus Metrics ---
builder.Services.AddSingleton<stok_takip.Metrics.StockFlowMetrics>();

builder.Services.AddOpenApi();
builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddScoped<stok_takip.Services.IEmailService, stok_takip.Services.EmailService>();

builder.Services.AddHostedService<stok_takip.Services.SessionCleanupService>();

var jwtSecretKey = builder.Configuration["JwtSettings:SecretKey"];
if (string.IsNullOrEmpty(jwtSecretKey))
{
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException("JWT Secret Key is not configured in Production environment.");
    }
    // Geliştirme ortamı için geçici rastgele anahtar
    jwtSecretKey = System.Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
    builder.Configuration["JwtSettings:SecretKey"] = jwtSecretKey;
}
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "StockFlowBackend";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "StockFlowFrontend";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.NameIdentifier
    };

    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.ContainsKey("jwt"))
            {
                context.Token = context.Request.Cookies["jwt"];
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var sessionToken = context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
            
            if (string.IsNullOrEmpty(sessionToken))
            {
                context.Fail("Invalid session token claim.");
                return;
            }

            var cache = context.HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
            var cacheKey = $"Session_{sessionToken}";

            if (!cache.TryGetValue(cacheKey, out UserSession session))
            {
                session = await dbContext.UserSessions
                    .Include(s => s.User)
                        .ThenInclude(u => u.Role)
                            .ThenInclude(r => r.RolePermissions)
                                .ThenInclude(rp => rp.Permission)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SessionToken == sessionToken);

                if (session != null)
                {
                    cache.Set(cacheKey, session, TimeSpan.FromSeconds(60));
                }
            }

            if (session == null || !session.IsActive || session.ExpiresAt < DateTime.UtcNow)
            {
                context.Fail("Session is inactive or expired.");
                return;
            }

            if (session.User != null)
            {
                var identity = context.Principal.Identity as ClaimsIdentity;
                if (identity != null)
                {
                    var existingRoleClaim = identity.FindAll(ClaimTypes.Role).ToList();
                    foreach (var role in existingRoleClaim)
                    {
                        identity.RemoveClaim(role);
                    }

                    var userRole = session.User.Role.Name.ToLower();

                    identity.AddClaim(new Claim(ClaimTypes.Role, userRole));

                    if (userRole == "superadmin")
                    {
                        identity.AddClaim(new Claim(ClaimTypes.Role, "admin"));
                    }
                    
                    var existingPermClaims = identity.FindAll("Permission").ToList();
                    foreach (var perm in existingPermClaims)
                    {
                        identity.RemoveClaim(perm);
                    }
                    if (session.User.Role?.RolePermissions != null)
                    {
                        foreach (var rp in session.User.Role.RolePermissions)
                        {
                            if (rp.Permission != null)
                            {
                                identity.AddClaim(new Claim("Permission", rp.Permission.Name));
                            }
                        }
                    }
                }
            }
        }
    };
});

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<stok_takip.Services.ImportSessionStore>();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    // SADECE gerçek yönetim izinleri "yönetim" endpoint'lerini açsın
    options.AddPolicy(Policies.SuperAdminOnly, policy => policy.RequireAssertion(context => 
        context.User.IsInRole("superadmin") || 
        context.User.HasClaim("Permission", "Role.Add") ||
        context.User.HasClaim("Permission", "Role.Edit") ||
        context.User.HasClaim("Permission", "Role.Delete")
    ));

    // Salt-okunur görüntüleme için AYRI ve daha dar bir policy
    options.AddPolicy(Policies.RoleViewOnly, policy => policy.RequireAssertion(context => 
        context.User.IsInRole("superadmin") || 
        context.User.HasClaim("Permission", "Role.View") ||
        context.User.HasClaim("Permission", "Role.Add") ||
        context.User.HasClaim("Permission", "Role.Edit") ||
        context.User.HasClaim("Permission", "Role.Delete")
    ));

    // Policy yönetimi için ayrı policy
    options.AddPolicy(Policies.PolicyManage, policy => policy.RequireAssertion(context => 
        context.User.IsInRole("superadmin") || 
        context.User.HasClaim("Permission", "Policy.View") ||
        context.User.HasClaim("Permission", "Policy.Edit")
    ));

    options.AddPolicy(Policies.AdminOnly, policy => policy.RequireRole("admin", "superadmin"));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // Canlı ortam yedek adresi (appsettings.json veya çevre değişkenlerinden güncellenmelidir)
            var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>()
                ?? new[] { "https://stokflow.com" };

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        policy.SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

var cultureInfo = new System.Globalization.CultureInfo("en-US");
System.Globalization.CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
System.Globalization.CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var app = builder.Build();

// --- Prometheus Metrics Middleware ---
// HTTP istek süresi, durum kodu, path bazlı sayaçları otomatik toplar.
app.UseHttpMetrics(options =>
{
    // /api/{id} gibi path'lerde her ID ayrı bir metrik etiketi olmasın diye
    // route şablonunu kullanır (ör: /api/products/{id} tek metrik olarak toplanır).
    options.ReduceStatusCodeCardinality();
});

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference().AllowAnonymous();
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// --- Prometheus /metrics endpoint'i ---
// DİKKAT: Bu endpoint kimlik doğrulama gerektirmez ama internete AÇIK OLMAMALIDIR.
// 4. bölümdeki güvenlik notlarına bakınız (sadece Docker iç ağından erişilebilir olacak).
app.MapMetrics("/metrics").AllowAnonymous();

app.UseForwardedHeaders();

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<stok_takip.Data.AppDbContext>();
        stok_takip.Data.DbInitializer.Initialize(context, app.Environment.IsDevelopment(), app.Configuration["AdminPassword"]);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Veritabanı başlatılırken bir hata oluştu: {ex.Message}");
    }
}
app.Run();
