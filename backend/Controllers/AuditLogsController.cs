using stok_takip.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using stok_takip.Attributes;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using stok_takip.Data;
using System.Linq;
using System.Threading.Tasks;

namespace stok_takip.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [RequirePermission(Policies.RequireAuditLogRead)]
    [EnableRateLimiting(Policies.RequireAuditLogRead)]
    public class AuditLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuditLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [NormalizePagination]
        public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.SecurityAuditLogs.AsNoTracking();
            var totalRecords = await query.CountAsync();

            var logs = await query
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new {
                    l.Id,
                    l.EntityName,
                    l.ActionType,
                    l.EntityId,
                    Timestamp = l.CreatedAt,
                    UserId = l.UserId,
                    UserName = l.User != null ? (l.User.FirstName + " " + l.User.LastName).Trim() : "Sistem/Bilinmeyen",
                    UserEmail = l.User != null ? l.User.Email : "",
                    UserPhone = l.User != null ? l.User.PhoneNumber : "",
                    l.IpAddress,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues
                })
                .ToListAsync();

            return Ok(new 
            {
                items = logs,
                totalRecords = totalRecords,
                currentPage = pageNumber,
                totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
            });
        }

        [HttpGet("user/{userId}")]
        [RequirePermission(Policies.RequireAuditLogRead)]
        [EnableRateLimiting(Policies.RequireAuditLogRead)]
        [NormalizePagination]
        public async Task<IActionResult> GetByUserId(int userId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.SecurityAuditLogs.AsNoTracking().Where(l => l.UserId == userId);

            var totalRecords = await query.CountAsync();

            var logs = await query
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new {
                    l.Id,
                    l.EntityName,
                    l.ActionType,
                    l.EntityId,
                    Timestamp = l.CreatedAt,
                    UserId = l.UserId,
                    UserName = l.User != null ? (l.User.FirstName + " " + l.User.LastName).Trim() : "Sistem/Bilinmeyen",
                    UserEmail = l.User != null ? l.User.Email : "",
                    UserPhone = l.User != null ? l.User.PhoneNumber : "",
                    l.IpAddress,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues
                })
                .ToListAsync();

            if (!logs.Any() && pageNumber == 1)
            {
                return NotFound(new { message = "Kullanıcıya ait log bulunamadı." });
            }
           
            return Ok(new 
            {
                items = logs,
                totalRecords = totalRecords,
                currentPage = pageNumber,
                totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
            });
        }

        [HttpGet("import-history")]
        [RequirePermission(Policies.RequireAuditLogRead)]
        [EnableRateLimiting(Policies.RequireAuditLogRead)]
        [NormalizePagination]
        public async Task<IActionResult> GetImportHistory([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.ImportHistories.AsNoTracking();
            var totalRecords = await query.CountAsync();

            var history = await query
                .Include(h => h.User)
                .OrderByDescending(h => h.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(h => new {
                    h.Id,
                    h.FileName,
                    h.TotalRows,
                    h.SuccessCount,
                    h.ErrorCount,
                    h.ErrorDetails,
                    Timestamp = h.CreatedAt,
                    UserId = h.UserId,
                    UserName = h.User != null ? (h.User.FirstName + " " + h.User.LastName).Trim() : "Sistem/Bilinmeyen",
                    UserEmail = h.User != null ? h.User.Email : ""
                })
                .ToListAsync();

            return Ok(new 
            {
                items = history,
                totalRecords = totalRecords,
                currentPage = pageNumber,
                totalPages = (int)Math.Ceiling((double)totalRecords / pageSize)
            });
        }
    }
}