using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using stok_takip.Services;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/[controller]")]  // URL: /api/auth
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly stok_takip.Metrics.StockFlowMetrics _metrics;

    public AuthController(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        IEmailService emailService,
        stok_takip.Metrics.StockFlowMetrics metrics)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _emailService = emailService;
        _metrics = metrics;
    }

[AllowAnonymous]
[HttpPost("register")]
[EnableRateLimiting("AuthLimit")] // Rate limiting for registration
public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if(string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Email and Password cannot be empty." });
        }

        var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email);
        if (emailExists)
        {
            return BadRequest(new {message = "The email you have provided is already associated with an account. Sign in or reset your password."});
        }

        var viewerRole = await _context.AppRoles.FirstOrDefaultAsync(r => r.Name == "viewer");
        if (viewerRole == null) return BadRequest(new { message = "Varsayılan rol bulunamadı." });

        var verificationCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();  // 6 haneli doğrulama kodu

        var newUser = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            RoleId = viewerRole.Id,  // Varsayılan rol
            IsEmailConfirmed = false,
            EmailConfirmationCode = _passwordHasher.HashPassword(null, verificationCode),
            ConfirmationCodeExpiry = DateTime.UtcNow.AddMinutes(10)  // Kodun geçerlilik süresi 10 dakika
        };

        newUser.PasswordHash = _passwordHasher.HashPassword(newUser, dto.Password);

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // E-posta gönderme
        var emailSubject = "StockFlow E-posta Doğrulama Kodu";
        string emailBody = $@"
                <div style='font-family: Arial; padding: 20px; background: #f4f4f4; text-align: center;'>
                    <h2>StockFlow'a Hoş Geldiniz!</h2>
                    <p>Hesabınızı aktifleştirmek için aşağıdaki 6 haneli doğrulama kodunu kullanın:</p>
                    <h1 style='color: #2563eb; letter-spacing: 5px;'>{verificationCode}</h1>
                    <p>Bu kod 10 dakika boyunca geçerlidir.</p>
                </div>";

        await _emailService.SendEmailAsync(newUser.Email, emailSubject, emailBody);

        return Ok(new { message = "User registered successfully. Please check your email for the verification code." });
    }

[AllowAnonymous]
[HttpPost("verify-email")]
[EnableRateLimiting("AuthLimit")]
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
        if (_passwordHasher.VerifyHashedPassword(user, user.EmailConfirmationCode, dto.VerificationCode) == PasswordVerificationResult.Failed)
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

[AllowAnonymous]
[HttpPost("login")]
[EnableRateLimiting("AuthLimit")] // Rate limiting for login attempts
public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if(string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Email and Password cannot be empty." });
        }

        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
        {
            _metrics.LoginAttemptsTotal.WithLabels("failed").Inc();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // E-Mail doğrulamasını kontrol et
        if (!user.IsEmailConfirmed)
        {
            return Unauthorized(new { message = "Email is not verified. Please verify your email before logging in. Verification code sent to your email." });
        }

        if (user.LastFailedLoginAttempt.HasValue && user.FailedLoginAttempts >= 5 )
        {
            var lockoutEndTime = user.LastFailedLoginAttempt.Value.AddMinutes(15);
            if (lockoutEndTime > DateTime.UtcNow)
            {
                var remainingMinutes = (int)(lockoutEndTime - DateTime.UtcNow).TotalMinutes;
                return Unauthorized(new { message = $"Çok fazla hatalı giriş yaptınız. Hesabınız geçici olarak kilitlendi. Lütfen {remainingMinutes} dakika sonra tekrar deneyin." });
            }
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            user.FailedLoginAttempts++;
            user.LastFailedLoginAttempt = DateTime.UtcNow;  

            await _context.SaveChangesAsync();
            int remainingAttempts = 5 - user.FailedLoginAttempts;
            _metrics.LoginAttemptsTotal.WithLabels("failed").Inc();
            if (remainingAttempts > 0)
            {
                return Unauthorized(new { message = $"Invalid email or password. Kalan deneme hakkınız: {remainingAttempts}" });
            }
            else
            {
                return Unauthorized(new { message = "Çok fazla hatalı giriş yaptınız. Hesabınız geçici olarak kilitlendi. Lütfen 15 dakika sonra tekrar deneyin." });
            }
        }

        if (user.FailedLoginAttempts > 0)
        {
            user.FailedLoginAttempts = 0;
            user.LastFailedLoginAttempt = null;
            await _context.SaveChangesAsync();
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
            DeviceOs = os,
            DeviceBrowser = browser,
            IpAddress = ipAddress,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddHours(1) // Token geçerlilik süresi -- 1 saat
        };

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        _metrics.LoginAttemptsTotal.WithLabels("success").Inc();
        _metrics.ActiveSessions.Inc();

        return Ok(new 
        { 
           message = "Login successful.",
           token = token,
           email = user.Email,
           role = user.Role.Name 
        });
    }

[HttpGet("me")]
public async Task<IActionResult> GetMe()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userID))
        {
            return Unauthorized(new { message = "Invalid token claims."});
        }

        var user = await _context.Users.Include(u => u.Role).AsNoTracking().FirstOrDefaultAsync(u => u.Id == userID);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            phoneNumber = user.PhoneNumber,
            identityNumber = user.IdentityNumber,
            role = user.Role.Name,
            createdAt = user.CreatedAt,
        });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
        {
            return Unauthorized(new { message = "Geçersiz token bilgileri." });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        if (user.Email != dto.Email)
        {
            var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email && u.Id != userId);
            if (emailExists)
            {
                return BadRequest(new { message = "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor." });
            }
            user.Email = dto.Email;
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.PhoneNumber = dto.PhoneNumber;
        user.IdentityNumber = dto.IdentityNumber;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profil başarıyla güncellendi.",
            firstName = user.FirstName,
            lastName = user.LastName,  
            email = user.Email,
            phoneNumber = user.PhoneNumber,
            identityNumber = user.IdentityNumber
            });
    }

[HttpPost("logout")]
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

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.Name),
            new Claim(JwtRegisteredClaimNames.Jti, sessionToken)
        };

        if (user.Role?.RolePermissions != null)
        {
            foreach (var rp in user.Role.RolePermissions)
            {
                if (rp.Permission != null)
                {
                    claims.Add(new Claim("Permission", rp.Permission.Name));
                }
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
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

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EnableRateLimiting("AuthLimit")] // Rate limiting for forgot password
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
        {
            return Ok(new {message = "Eğer e-posta adresiniz sistemde kayıtlıysa, şifre sıfırlama talimatları gönderilecektir."});
        }

        var resetCode = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString(); // 6 haneli şifre sıfırlama kodu
        user.PasswordResetCode = _passwordHasher.HashPassword(user, resetCode);
        user.PasswordResetCodeExpiry = DateTime.UtcNow.AddMinutes(10); 
        await _context.SaveChangesAsync();

        string subject = "StockFlow Şifre Sıfırlama Kodu";
        string body = $@"
                <div style='font-family: Arial; padding: 20px; background: #f4f4f4; text-align: center;'>
                    <h2>Şifre Sıfırlama Talebi</h2>
                    <p>Hesabınızın şifresini sıfırlamak için aşağıdaki 6 haneli kodu kullanın:</p>
                    <h1 style='color: #dc2626; letter-spacing: 5px;'>{resetCode}</h1>
                    <p>Bu kod 10 dakika boyunca geçerlidir.</p>
                </div>";

        await _emailService.SendEmailAsync(user.Email, subject, body);

        return Ok(new {message = "Eğer e-posta adresiniz sistemde kayıtlıysa, şifre sıfırlama talimatları gönderilecektir."});
    }

    [AllowAnonymous]
    [HttpPost("verify-reset-code")]
    [EnableRateLimiting("AuthLimit")] // Rate limiting for verify reset code
    public async Task<IActionResult> VerifyResetCode([FromBody] VerifyResetCodeDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

    if (user == null || user.PasswordResetCodeExpiry < DateTime.UtcNow)
    {
        return BadRequest(new {message = "Geçersiz veya süresi dolmuş şifre sıfırlama kodu."});
    }

    // Yeni Hash kontrolü
    if (_passwordHasher.VerifyHashedPassword(user, user.PasswordResetCode, dto.ResetCode) ==
  PasswordVerificationResult.Failed)
    {
        return BadRequest(new {message = "Geçersiz veya süresi dolmuş şifre sıfırlama kodu."});
    }

        return Ok(new {message = "Sıfırlama kodu doğrulandı. Lütfen yeni şifrenizi belirleyin."});
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EnableRateLimiting("AuthLimit")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

    if (user == null || user.PasswordResetCodeExpiry < DateTime.UtcNow)
    {
        return BadRequest(new {message = "Geçersiz veya süresi dolmuş şifre sıfırlama kodu."});
    }

    // Yeni Hash kontrolü
    if (_passwordHasher.VerifyHashedPassword(user, user.PasswordResetCode, dto.ResetCode) ==
  PasswordVerificationResult.Failed)
    {
        return BadRequest(new {message = "Geçersiz veya süresi dolmuş şifre sıfırlama kodu."});
    }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.NewPassword);
        if (verificationResult == PasswordVerificationResult.Success)
        {
            return BadRequest(new {message = "Yeni şifreniz eski şifrenizle aynı olamaz."});
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        user.PasswordResetCode = null;
        user.PasswordResetCodeExpiry = null;

        var activeSessions = await _context.UserSessions.Where(s => s.UserId == user.Id && s.IsActive).ToListAsync();
        foreach (var session in activeSessions)
        {
            session.IsActive = false; // Tüm aktif oturumları devre dışı bırak
        }

        await _context.SaveChangesAsync();

        return Ok(new {message = "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."});
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userID))
        {
            return Unauthorized(new { message = "Geçersiz token bilgileri."});
        }

        var user = await _context.Users.FindAsync(userID);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.OldPassword);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "Eski şifre hatalı." });
        }

        var isSamePassword = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.NewPassword);
        if (isSamePassword == PasswordVerificationResult.Success)
        {
            return BadRequest(new { message = "Yeni şifreniz eski şifrenizle aynı olamaz." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync();

        // Güvenlik Bilgilendirme E-postası Gönder
        string subject = "Güvenlik Uyarısı: Şifreniz Değiştirildi";
        string body = $@"
                <div style='font-family: Arial; padding: 20px; background: #f4f4f4; text-align: center;'>
                    <h2 style='color: #dc2626;'>Şifre Değişikliği Başarılı</h2>
                    <p>Merhaba {user.FirstName},</p>
                    <p>StockFlow hesabınızın şifresi az önce başarıyla değiştirildi.</p>
                    <p style='font-weight: bold;'>Eğer bu işlemi siz yapmadıysanız, hesabınız tehlikede olabilir. Lütfen derhal sistem yöneticiniz ile iletişime geçin!</p>
                </div>";

        await _emailService.SendEmailAsync(user.Email, subject, body);

        return Ok(new { message = "Şifreniz başarıyla güncellendi." });
    }
}