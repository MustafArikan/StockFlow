using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/[controller]")]  // URL: /api/auth
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;

    public AuthController(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if(string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Email and Password cannot be empty." });
        }

        var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
        if (emailExists)
        {
            return BadRequest(new { message = "Email is already registered."});
        }

        var verificationCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 999999).ToString();  // 6 haneli doğrulama kodu

        var newUser = new User
        {
            Email = dto.Email,
            Role = "viewer",  // Varsayılan rol
            IsEmailConfirmed = false,
            EmailConfirmationCode = verificationCode,
            ConfirmationCodeExpiry = DateTime.UtcNow.AddMinutes(10)  // Kodun geçerlilik süresi 10 dakika
        };

        newUser.PasswordHash = _passwordHasher.HashPassword(newUser, dto.Password);

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        Console.WriteLine("\n================================");
        Console.WriteLine($"[E-MAIL SIMULATION] To: {newUser.Email}");
        Console.WriteLine($"Account Verification Code: {verificationCode}");
        Console.WriteLine("===============================\n");

        return Ok(new { message = "User registered successfully. Please check your email for the verification code." });
    }

[HttpPost("verify-email")]
public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        if(string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.VerificationCode))
        {
            return BadRequest(new { message = "Email and Verification Code cannot be empty." });
        }
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
        {
            return BadRequest(new { message = "User not found." });
        }
        if (user.IsEmailConfirmed)
        {
            return BadRequest(new { message = "Email is already verified." });
        }
        if (user.EmailConfirmationCode != dto.VerificationCode)
        {
            return BadRequest(new { message = "Invalid verification code." });
        }
        if(user.ConfirmationCodeExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Verification code has expired. Please request a new one." });
        }
        // Doğrulama başarılı, kullanıcıyı onayla
        user.IsEmailConfirmed = true;
        user.EmailConfirmationCode = null;      
        user.ConfirmationCodeExpiry = null; 

        await _context.SaveChangesAsync();

        return Ok(new { message = "Email verified successfully. You can now log in." });
    }

[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if(string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Email and Password cannot be empty." });
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // E-Mail doğrulamasını kontrol et
        if (!user.IsEmailConfirmed)
        {
            return Unauthorized(new { message = "Email is not verified. Please verify your email before logging in. Verification code sent to your email." });
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var sessionToken = Guid.NewGuid().ToString(); // Yeni bir oturum token'ı oluştur
        var token = GenerateJwtToken(user, sessionToken);

        var userAgent = Request.Headers["User-Agent"].ToString();
        var (os, browser) = ParseUserAgent(userAgent);
        var ipAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var session = new UserSession
        {
            UserId = user.Id,
            SessionToken = sessionToken,
            AccessToken = token,
            DeviceOs = os,
            DeviceBrowser = browser,
            IpAddress = ipAddress,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddHours(1) // Token geçerlilik süresi -- 1 saat
        };

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(new 
        { 
           message = "Login successful.",
           token = token,
           email = user.Email,
           role = user.Role 
        });
    }
[HttpPost("test-admin")]
[Authorize(Roles = "admin")]
public IActionResult TestAdmin()
    {
        return Ok(new { message = "Congratulations! You are accessed this endpoint as an admin role." });
    }

[HttpGet("me")]
[Authorize]
public async Task<IActionResult> GetMe()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userID))
        {
            return Unauthorized(new { message = "Invalid token claims."});
        }

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userID);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            role = user.Role,
            createdAt = user.CreatedAt,
        });
    }

[HttpPost("logout")]
[Authorize]   // Sadece giriş yapmış (token'ı olan) kullanıcılar çıkış yapabilir
public async Task<IActionResult> Logout()
    {
        var sessionToken = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

        if (!string.IsNullOrEmpty(sessionToken))
        {
            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.SessionToken == sessionToken && s.IsActive);
            if (session != null)
            {
                session.IsActive = false; // Oturumu devre dışı bırak
                await _context.SaveChangesAsync();
            }
        }
        return Ok(new { message = "Logout successful. Session deactivated." });
    }

    private string GenerateJwtToken(User user, string sessionToken)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var secretKey = _configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrEmpty(secretKey))
        {
            throw new InvalidOperationException("JWT Secret Key is not configured.");
        }
        
        var key = Encoding.UTF8.GetBytes(secretKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, sessionToken)
            }),
            Expires = DateTime.UtcNow.AddHours(1), // Token geçerlilik süresi -- 1 saat
            Issuer = _configuration["JwtSettings:Issuer"] ?? "StockFlowBackend",
            Audience = _configuration["JwtSettings:Audience"] ?? "StockFlowFrontend",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
        };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
    }

    private (string Os, string Browser) ParseUserAgent(string userAgent)
    {
        if (string.IsNullOrEmpty(userAgent))
        {
            return ("Bilinmeyen OS", "Bilinmeyen Tarayıcı");
        }

        string os = "Bilinmeyen OS";
        if (userAgent.Contains("Windows")) os = "Windows";
        else if (userAgent.Contains("Android")) os = "Android";
        else if (userAgent.Contains("iPhone") || userAgent.Contains("iPad")) os = "iOS";
        else if (userAgent.Contains("Macintosh") || userAgent.Contains("Mac OS")) os = "Mac OS";
        else if (userAgent.Contains("Linux")) os = "Linux";

        string browser = "Bilinmeyen Tarayıcı";
        if (userAgent.Contains("Edg")) browser = "Microsoft Edge";
        else if (userAgent.Contains("Chrome") && !userAgent.Contains("Chromium")) browser = "Google Chrome";
        else if (userAgent.Contains("Safari") && !userAgent.Contains("Chrome")) browser = "Safari";
        else if (userAgent.Contains("Firefox")) browser = "Mozilla Firefox";
        else if (userAgent.Contains("OPR") || userAgent.Contains("Opera")) browser = "Opera";

        return (os, browser);
    }
}