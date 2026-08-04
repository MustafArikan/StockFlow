using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission(Policies.RequireUserManage)]
[EnableRateLimiting(Policies.RequireUserManage)]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;

    public UsersController(AppDbContext context, IPasswordHasher<User> passwordHasher, Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _cache = cache;
    }

    private async Task<int> GetCurrentUserRoleLevelAsync()
    {
        var currentUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(currentUserIdStr, out int uid))
        {
            var currentUser = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == uid);
            return currentUser?.Role?.Level ?? 0;
        }
        return 0;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var currentUserLevel = await GetCurrentUserRoleLevelAsync();

        var query = _context.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted && (u.Role == null || u.Role.Level <= currentUserLevel));

        var totalRecords = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.IdentityNumber,
                RoleId = u.RoleId,
                Role = u.Role.Name,
                u.IsEmailConfirmed,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items = users,
            totalRecords = totalRecords,
            currentPage = pageNumber,
            totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id && (u.Role == null || u.Role.Level <= currentUserLevel))
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.IdentityNumber,
                RoleId = u.RoleId,
                Role = u.Role.Name,
                u.IsEmailConfirmed,
                u.CreatedAt
            })
            .FirstOrDefaultAsync();
            
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });
        
        return Ok(user);
    }

    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleDto dto)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound(new {message = "Kullanıcı bulunamadı."});
        }
        
        if (user.Role?.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin hesabının rolünü değiştiremez
        }

        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        if (user.Role != null && user.Role.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst yetkili bir hesaba dokunamaz
        }

        var newRole = await _context.AppRoles.FindAsync(dto.RoleId);
        if (newRole == null) return BadRequest(new { message = "Geçersiz rol." });
        
        if (newRole.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin rolü atayamaz
        }

        if (newRole.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst bir yetkiyi başkasına veremez
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString() && user.RoleId != dto.RoleId)
        {
            return BadRequest(new {message = "Güvenlik gereği kendi rolünüzü değiştiremezsiniz."});
        }

        user.RoleId = dto.RoleId;

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == id && s.IsActive)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.IsActive = false;
            _cache.Remove($"Session_{session.SessionToken}");
        }

        await _context.SaveChangesAsync();

        return Ok(new {message = $"Kullanıcı rolü başarıyla '{newRole.Name}' güncellendi ve aktif oturumlar sonlandırıldı."});
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        var newRole = await _context.AppRoles.FindAsync(dto.RoleId);
        if (newRole == null) return BadRequest(new { message = "Geçersiz rol." });
        if (newRole?.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin rolünde kullanıcı oluşturamaz
        }

        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        if (newRole != null && newRole.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst seviyede bir rol oluşturamaz
        }

        var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email);
        if (emailExists) return BadRequest(new { message = "Bu e-posta adresi zaten kullanılıyor." });
        
        var newUser = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            IdentityNumber = dto.IdentityNumber,
            RoleId = dto.RoleId,
            IsEmailConfirmed = true, // Superadmin tarafından oluşturulan kullanıcılar için e-posta doğrulamasını atlıyoruz
            CreatedAt = DateTime.UtcNow
        };

        newUser.PasswordHash = _passwordHasher.HashPassword(newUser, dto.Password);

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return Ok(new {message = "Kullanıcı başarıyla oluşturuldu.", userId = newUser.Id});
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (user.Role?.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin'i düzenleyemez
        }

        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        if (user.Role != null && user.Role.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst yetkili bir hesabı düzenleyemez
        }

        var newRole = await _context.AppRoles.FindAsync(dto.RoleId);
        if (newRole?.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin rolü atayamaz
        }

        if (newRole != null && newRole.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst bir yetkiyi atayamaz
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString() && user.RoleId != dto.RoleId)
        {
            return BadRequest(new { message = "Güvenlik gereği kendi rolünüzü değiştiremezsiniz." });
        }

        if (user.Email != dto.Email)
        {
            var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email && u.Id != id);
            if (emailExists) return BadRequest(new { message = "Bu e-posta adresi zaten kullanılıyor." });
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.PhoneNumber = dto.PhoneNumber;
        user.IdentityNumber = dto.IdentityNumber;
        user.RoleId = dto.RoleId;

        if (!string.IsNullOrEmpty(dto.Password))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == id && s.IsActive)
                .ToListAsync();
            foreach (var session in activeSessions)
            {
                session.IsActive = false;
                _cache.Remove($"Session_{session.SessionToken}");
            }
            
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Kullanıcı başarıyla güncellendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });
        
        if (user.Role?.Name == "superadmin" && !User.IsInRole("superadmin"))
        {
            return Forbid(); // Süper admin'i silemez
        }

        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        if (user.Role != null && user.Role.Level > currentUserLevel)
        {
            return Forbid(); // Kendinden üst yetkili bir hesabı silemez
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString())
        {
            return BadRequest(new { message = "Kendi hesabınızı silemezsiniz." });
        }

        user.IsDeleted = true;
        var activeSessions = await _context.UserSessions.Where(s => s.UserId == id && s.IsActive).ToListAsync();
        foreach (var session in activeSessions)
        {
            session.IsActive = false;
            _cache.Remove($"Session_{session.SessionToken}");
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Kullanıcı başarıyla silindi ve aktif oturumlar sonlandırıldı." });
    }

}