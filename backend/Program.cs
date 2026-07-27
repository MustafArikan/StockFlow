using System.Security.Claims;
using System.Text;
using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using System.Threading.RateLimiting;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using stok_takip.Middlewares;
using stok_takip.Constants;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("AuthLimit", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5; // 5 istek
        limiterOptions.Window = TimeSpan.FromMinutes(1); // 1 dakika
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0; // Kuyrukta istek bekletme
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // Too Many Requests
}
);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear(); // Tüm ağları bilinen olarak kabul et
    options.KnownProxies.Clear();  // Tüm proxyleri bilinen olarak kabul et
});
builder.Services.AddHttpContextAccessor();
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
        OnTokenValidated = async context =>
        {
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var sessionToken = context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
            
            if (string.IsNullOrEmpty(sessionToken))
            {
                context.Fail("Invalid session token claim.");
                return;
            }

            var session = await dbContext.UserSessions
                .Include(s => s.User)
                    .ThenInclude(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionToken == sessionToken);

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

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(Policies.SuperAdminOnly, policy => policy.RequireAssertion(context => 
        context.User.IsInRole("superadmin") || 
        context.User.HasClaim("Permission", "Role.View") ||
        context.User.HasClaim("Permission", "Role.Add") ||
        context.User.HasClaim("Permission", "Role.Edit") ||
        context.User.HasClaim("Permission", "Role.Delete")
    ));
    options.AddPolicy(Policies.AdminOnly, policy => policy.RequireRole("admin", "superadmin"));
    
    // Permission policies for future dynamic expansion
    options.AddPolicy(Policies.RequireAssetWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Asset.Add") || context.User.HasClaim("Permission", "Asset.Edit")));
    options.AddPolicy(Policies.RequireAuditLogRead, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "System.AuditLogs")));
    options.AddPolicy(Policies.RequireCategoryWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Category.Add") || context.User.HasClaim("Permission", "Category.Edit")));
    options.AddPolicy(Policies.RequireLocationWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Location.Add")));
    options.AddPolicy(Policies.RequireProductWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Product.Add") || context.User.HasClaim("Permission", "Product.Edit")));
    options.AddPolicy(Policies.RequireProductSupplierWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Supplier.Edit")));
    options.AddPolicy(Policies.RequireStockMovementWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Movement.Add")));
    options.AddPolicy(Policies.RequireSupplierWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Supplier.Add") || context.User.HasClaim("Permission", "Supplier.Edit")));
    options.AddPolicy(Policies.RequireWarehouseWrite, policy => policy.RequireAssertion(context => context.User.IsInRole("superadmin") || context.User.HasClaim("Permission", "Warehouse.Add") || context.User.HasClaim("Permission", "Warehouse.Edit")));
    options.AddPolicy(Policies.RequireUserManage, policy => policy.RequireAssertion(context => 
        context.User.IsInRole("superadmin") || 
        context.User.HasClaim("Permission", "User.View") ||
        context.User.HasClaim("Permission", "User.Add") ||
        context.User.HasClaim("Permission", "User.Edit") ||
        context.User.HasClaim("Permission", "User.Delete")
    ));
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

var app = builder.Build();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference().AllowAnonymous();
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

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
        stok_takip.Data.DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Veritabanı başlatılırken bir hata oluştu: {ex.Message}");
    }
}
app.Run();
