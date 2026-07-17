using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using System.Linq;
using System.Threading.Tasks;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [Authorize(Roles = "admin")]
    public class AuditLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuditLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var logs = await _context.SecurityAuditLogs
                .AsNoTracking()
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .Take(200)
                .Select(l => new {
                    l.Id,
                    l.EntityName,
                    l.ActionType,
                    l.EntityId,
                    Timestamp = l.CreatedAt,
                    UserId = l.UserId,
                    UserName = l.User != null ? (l.User.FirstName + " " + l.User.LastName).Trim() : "Sistem/Bilinmeyen",
                    UserEmail = l.User != null ? l.User.Email : "",
                    l.IpAddress,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}