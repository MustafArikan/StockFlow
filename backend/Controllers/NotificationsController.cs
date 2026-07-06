using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using System.Security.Claims;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/[controller]")]

    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? onlyUnread)
        {
            var query = _context.Notifications.AsNoTracking();
            if (onlyUnread == true)
            {
                query = query.Where(n => !n.IsRead);
            }

            var notifications = await query.OrderByDescending(n => n.CreatedAt).ToListAsync();
            
            return Ok(notifications);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
            {
                return NotFound(new { message = "Notification not found."});
            }

            if (notification.Severity == "DANGER")
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRole != "admin")
                {
                    return BadRequest(new { message = "Only administrators can dismiss DANGER alert. Please contact your manager." });
                }
            }

            notification.IsRead = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read."});
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            IQueryable<Notification> query = _context.Notifications.Where(n => !n.IsRead);
            
            if (userRole != "admin")
            {
                query = query.Where(n => n.Severity != "DANGER");
            }

            var unreadNotifications = await query.ToListAsync();

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Successfully marked {unreadNotifications.Count} notifications as read."});
        }

    }
}
