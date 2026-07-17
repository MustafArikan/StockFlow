using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.DTOs;

namespace stok_takip.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")] // Sadece Admin rolüne sahip kullanıcılar erişebilir
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _context.Users
            .AsNoTracking()
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Role,
                u.IsEmailConfirmed,
                u.CreatedAt
            })
            .ToListAsync();
        return Ok(users);
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
                u.Role,
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

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == id.ToString() && dto.Role != "admin")
        {
            return BadRequest(new {message = "Kendi rolünüzü admin'den farklı bir role değiştiremezsiniz."});
        }

        user.Role = dto.Role;

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == id && s.IsActive)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.IsActive = false;
        }

        await _context.SaveChangesAsync();

        return Ok(new {message = $"Kullanıcı rolü başarıyla '{dto.Role}' güncellendi ve aktif oturumlar sonlandırıldı."});
    }
}