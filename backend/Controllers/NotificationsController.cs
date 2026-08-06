using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using stok_takip.Models;
using System.Security.Claims;

using stok_takip.Constants;

using stok_takip.Attributes;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [RequirePermission(Policies.RequireNotificationRead)]
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

            var notifications = await query.OrderByDescending(n => n.CreatedAt)
                .Select(n => new stok_takip.DTOs.NotificationResponseDto(n.Id, n.Message, n.Type, n.Severity, n.IsRead, n.CreatedAt))
                .ToListAsync();
            
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

            if (notification.Severity == "DANGER" || notification.Severity == "EMPTY_STOCK")
            {
                if (!User.IsInRole("admin") && !User.IsInRole("superadmin"))
                {
                    return BadRequest(new { message = "Only administrators can dismiss DANGER or EMPTY_STOCK alerts. Please contact your manager." });
                }

                _context.SecurityAuditLogs.Add(new SecurityAuditLog
                {
                    UserId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null,
                    ActionType = "DismissAlert",
                    EntityName = "Notification",
                    EntityId = notification.Id,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                    OldValues = null,
                    NewValues = System.Text.Json.JsonSerializer.Serialize(new { severity = notification.Severity })
                });
            }

            notification.IsRead = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read."});
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            IQueryable<Notification> query = _context.Notifications.Where(n => !n.IsRead);
            
            // EMPTY_STOCK kesinlikle tek tek "sonucunu anlıyorum" denerek onaylanmalı, toplu okundu yapılamaz!
            query = query.Where(n => n.Severity != "EMPTY_STOCK");

            bool isAdminOrAbove = User.IsInRole("admin") || User.IsInRole("superadmin");
            if (!isAdminOrAbove)
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
