using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.SuperAdminOnly)] // Sadece Super Admin rolüne sahip kullanıcılar erişebilir
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UsersController(AppDbContext context, IPasswordHasher<User> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var query = _context.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted);

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
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
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
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new {message = "Kullanıcı bulunamadı."});
        }

        var newRole = await _context.AppRoles.FindAsync(dto.RoleId);
        if (newRole == null) return BadRequest(new { message = "Geçersiz rol." });

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString() && newRole.Name != "admin")
        {
            return BadRequest(new {message = "Kendi rolünüzü admin'den farklı bir role değiştiremezsiniz."});
        }

        user.RoleId = dto.RoleId;

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == id && s.IsActive)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.IsActive = false;
        }

        await _context.SaveChangesAsync();

        return Ok(new {message = $"Kullanıcı rolü başarıyla '{newRole.Name}' güncellendi ve aktif oturumlar sonlandırıldı."});
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email);
        if (emailExists) return BadRequest(new { message = "Bu e-posta adresi zaten kullanılıyor." });
        
        var newUser = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
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
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (user.Email != dto.Email)
        {
            var emailExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Email == dto.Email && u.Id != id);
            if (emailExists) return BadRequest(new { message = "Bu e-posta adresi zaten kullanılıyor." });
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.PhoneNumber = dto.PhoneNumber;
        user.RoleId = dto.RoleId;

        if (!string.IsNullOrEmpty(dto.Password))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == id && s.IsActive)
                .ToListAsync();
            foreach (var session in activeSessions) session.IsActive = false;
            
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Kullanıcı başarıyla güncellendi." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString())
        {
            return BadRequest(new { message = "Kendi hesabınızı silemezsiniz." });
        }

        user.IsDeleted = true;
        var activeSessions = await _context.UserSessions.Where(s => s.UserId == id && s.IsActive).ToListAsync();
        foreach (var session in activeSessions) session.IsActive = false;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Kullanıcı başarıyla silindi ve aktif oturumlar sonlandırıldı." });
    }

}