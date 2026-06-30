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

        var random = new Random();
        var verificationCode = random.Next(100000, 999999).ToString();  // 6 haneli doğrulama kodu

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

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
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

        var token = GenerateJwtToken(user);
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

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var secretKey = _configuration["JwtSettings:SecretKey"]
            ?? "A_VERY_LONG_AND_SECURE_SECRET_KEY_FOR_LOCAL_DEVELOPMENT_ONLY_32_BYTES_MINIMUM!";
        
        var key = Encoding.UTF8.GetBytes(secretKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7), // Token geçerlilik süresi
            Issuer = _configuration["JwtSettings:Issuer"] ?? "StockFlowBackend",
            Audience = _configuration["JwtSettings:Audience"] ?? "StockFlowFrontend",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
        };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
    }
}