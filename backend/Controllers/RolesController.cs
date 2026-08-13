using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using stok_takip.Attributes;
using stok_takip.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using stok_takip.Constants;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using System.Text.Json;

namespace stok_takip.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context)
    {
        _context = context;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int uid))
        {
            return uid;
        }
        return null;
    }

    private async Task<int> GetCurrentUserRoleLevelAsync()
    {
        var uid = GetCurrentUserId();
        if (uid.HasValue)
        {
            var currentUser = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == uid.Value);
            return currentUser?.Role?.Level ?? 0;
        }
        return 0;
    }

    private void AddCustomAuditLog(string actionType, string entityName, int? entityId, object? oldValues = null, object? newValues = null)
    {
        var auditLog = new SecurityAuditLog
        {
            UserId = GetCurrentUserId(),
            ActionType = actionType,
            EntityName = entityName,
            EntityId = entityId,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null
        };
        _context.SecurityAuditLogs.Add(auditLog);
    }

    [HttpGet]
    [RequirePermission(Policies.RequireUserManage)]
    public async Task<IActionResult> GetRoles()
    {
        var currentUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int currentUserLevel = 100;
        if (int.TryParse(currentUserIdStr, out int uid))
        {
            var currentUser = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == uid);
            currentUserLevel = currentUser?.Role?.Level ?? 0;
        }

        var query = _context.AppRoles
            .Include(r => r.Users)
            .Include(r => r.RolePermissions)
            .Where(r => r.Level <= currentUserLevel)
            .AsQueryable();

        if (!User.IsInRole("superadmin"))
        {
            query = query.Where(r => r.Name != "superadmin");
        }

        var roles = await query
            .Select(r => new AppRoleResponseDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                IsSystemRole = r.IsSystemRole,
                Level = r.Level,
                UserCount = r.Users.Count(u => !u.IsDeleted),
                PermissionIds = r.RolePermissions.Select(rp => rp.PermissionId).ToList()
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("permissions")]
    [Authorize(Policy = Policies.RoleViewOnly)]
    public async Task<IActionResult> GetPermissions()
    {
        var permissions = await _context.AppPermissions
            .GroupBy(p => p.Module)
            .Select(g => new
            {
                Module = g.Key,
                Permissions = g.Select(p => new { p.Id, p.Name, p.Description }).ToList()
            })
            .ToListAsync();

        return Ok(permissions);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = Policies.RoleViewOnly)]
    public async Task<IActionResult> GetRole(int id)
    {
        var role = await _context.AppRoles
            .Include(r => r.Users)
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null) return NotFound(new { message = "Role not found." });

        var response = new AppRoleResponseDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            Level = role.Level,
            UserCount = role.Users.Count(u => !u.IsDeleted),
            PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList()
        };

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = Policies.SuperAdminOnly)]
    public async Task<IActionResult> CreateRole([FromBody] CreateAppRoleDto dto)
    {
        if (await _context.AppRoles.AnyAsync(r => r.Name == dto.Name))
        {
            return BadRequest(new { message = "Role with the same name already exists." });
        }

        var currentUserLevel = await GetCurrentUserRoleLevelAsync();
        if (dto.Level > currentUserLevel)
        {
            return Forbid();
        }

        var newRole = new AppRole
        {
            Name = dto.Name,
            Description = dto.Description,
            Level = dto.Level,
            IsSystemRole = false
        };

        _context.AppRoles.Add(newRole);
        await _context.SaveChangesAsync();

        if (dto.PermissionIds != null && dto.PermissionIds.Any())
        {
            var validPermissions = await _context.AppPermissions
                .Where(p => dto.PermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync();

            var rolePermissions = validPermissions.Select(pid => new AppRolePermission
            {
                RoleId = newRole.Id,
                PermissionId = pid
            });

            _context.AppRolePermissions.AddRange(rolePermissions);
            await _context.SaveChangesAsync();
        }

        AddCustomAuditLog("CreateRole", "AppRole", newRole.Id, newValues: new { newRole.Name, newRole.Description, dto.PermissionIds });
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRole), new { id = newRole.Id }, new { id = newRole.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.SuperAdminOnly)]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateAppRoleDto dto)
    {
        var role = await _context.AppRoles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null) return NotFound(new { message = "Role not found." });

        if (await _context.AppRoles.AnyAsync(r => r.Name == dto.Name && r.Id != id))
        {
            return BadRequest(new { message = "Role with the same name already exists." });
        }
        
        var currentUserLevel = await GetCurrentUserRoleLevelAsync();

        if (!User.IsInRole("superadmin") && role.Level >= currentUserLevel)
        {
            return Forbid();
        }

        if (dto.Level > currentUserLevel)
        {
            return Forbid();
        }

        if (role.IsSystemRole && !User.IsInRole("superadmin"))
        {
            return Forbid();
        }
        
        var oldValues = new { role.Name, role.Description, role.Level, PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList() };

        role.Name = dto.Name;
        role.Description = dto.Description;
        role.Level = dto.Level;

        if (dto.PermissionIds != null)
        {
            var existingPermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList();
            
            var permissionsToRemove = role.RolePermissions.Where(rp => !dto.PermissionIds.Contains(rp.PermissionId)).ToList();
            if (permissionsToRemove.Any())
            {
                _context.AppRolePermissions.RemoveRange(permissionsToRemove);
            }

            var newPermissionIds = dto.PermissionIds.Except(existingPermissionIds).ToList();
            if (newPermissionIds.Any())
            {
                var validPermissions = await _context.AppPermissions
                    .Where(p => newPermissionIds.Contains(p.Id))
                    .Select(p => p.Id)
                    .ToListAsync();

                var rolePermissionsToAdd = validPermissions.Select(pid => new AppRolePermission
                {
                    RoleId = role.Id,
                    PermissionId = pid
                });

                _context.AppRolePermissions.AddRange(rolePermissionsToAdd);
            }
        }

        AddCustomAuditLog("UpdateRole", "AppRole", role.Id, oldValues: oldValues, newValues: new { dto.Name, dto.Description, dto.PermissionIds });
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.SuperAdminOnly)]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var role = await _context.AppRoles
            .Include(r => r.Users)
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null) return NotFound(new { message = "Role not found." });

        if (role.IsSystemRole)
        {
            return BadRequest(new { message = "Cannot delete a system role." });
        }

        if (role.Users.Any(u => !u.IsDeleted))
        {
            return BadRequest(new { message = "Cannot delete a role that has assigned users." });
        }
        
        var oldValues = new { role.Name, role.Description };

        if (role.RolePermissions.Any())
        {
            _context.AppRolePermissions.RemoveRange(role.RolePermissions);
        }

        _context.AppRoles.Remove(role);

        AddCustomAuditLog("DeleteRole", "AppRole", role.Id, oldValues: oldValues);
        await _context.SaveChangesAsync();

        return Ok();
    }
}
