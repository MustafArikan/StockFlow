using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using stok_takip.Constants;
using stok_takip.Data;
using stok_takip.DTOs;
using stok_takip.Models;
using System.Text.Json;
using System.Linq;

namespace stok_takip.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = Policies.SuperAdminOnly)] // Only SuperAdmin
public class AuthorizationPoliciesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthorizationPoliciesController(AppDbContext context)
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
    public async Task<IActionResult> GetPolicies()
    {
        var policies = await _context.AppAuthorizationPolicies
            .Include(p => p.PolicyPermissions)
            .OrderBy(p => p.Key)
            .Select(p => new AppPolicyResponseDto
            {
                Id = p.Id,
                Key = p.Key,
                Description = p.Description,
                PermitLimit = p.PermitLimit,
                WindowSeconds = p.WindowSeconds,
                PermissionIds = p.PolicyPermissions.Select(pp => pp.PermissionId).ToList()
            })
            .ToListAsync();

        return Ok(policies);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPolicy(int id)
    {
        var policy = await _context.AppAuthorizationPolicies
            .Include(p => p.PolicyPermissions)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (policy == null) return NotFound(new { message = "Policy not found." });

        var response = new AppPolicyResponseDto
        {
            Id = policy.Id,
            Key = policy.Key,
            Description = policy.Description,
            PermitLimit = policy.PermitLimit,
            WindowSeconds = policy.WindowSeconds,
            PermissionIds = policy.PolicyPermissions.Select(pp => pp.PermissionId).ToList()
        };

        return Ok(response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePolicy(int id, [FromBody] UpdateAppPolicyDto dto)
    {
        var policy = await _context.AppAuthorizationPolicies
            .Include(p => p.PolicyPermissions)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (policy == null) return NotFound(new { message = "Policy not found." });

        var oldValues = new 
        { 
            policy.Description, 
            policy.PermitLimit,
            policy.WindowSeconds,
            PermissionIds = policy.PolicyPermissions.Select(pp => pp.PermissionId).ToList() 
        };

        policy.Description = dto.Description;
        policy.PermitLimit = dto.PermitLimit;
        policy.WindowSeconds = dto.WindowSeconds;

        if (dto.PermissionIds != null)
        {
            var existingPermissionIds = policy.PolicyPermissions.Select(pp => pp.PermissionId).ToList();
            
            var permissionsToRemove = policy.PolicyPermissions.Where(pp => !dto.PermissionIds.Contains(pp.PermissionId)).ToList();
            if (permissionsToRemove.Any())
            {
                _context.AppPolicyPermissions.RemoveRange(permissionsToRemove);
            }

            var newPermissionIds = dto.PermissionIds.Except(existingPermissionIds).ToList();
            if (newPermissionIds.Any())
            {
                var validPermissions = await _context.AppPermissions
                    .Where(p => newPermissionIds.Contains(p.Id))
                    .Select(p => p.Id)
                    .ToListAsync();

                var policyPermissionsToAdd = validPermissions.Select(pid => new AppPolicyPermission
                {
                    PolicyId = policy.Id,
                    PermissionId = pid
                });

                _context.AppPolicyPermissions.AddRange(policyPermissionsToAdd);
            }
        }

        AddCustomAuditLog("UpdatePolicy", "AppAuthorizationPolicy", policy.Id, oldValues: oldValues, newValues: new { dto.Description, dto.PermitLimit, dto.WindowSeconds, dto.PermissionIds });
        await _context.SaveChangesAsync();

        return Ok();
    }
}
