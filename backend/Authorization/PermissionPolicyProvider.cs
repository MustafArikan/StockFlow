using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using stok_takip.Attributes;
using stok_takip.Data;

namespace stok_takip.Authorization;

public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options, IServiceScopeFactory scopeFactory, IMemoryCache cache)
    {
        _fallback = new DefaultAuthorizationPolicyProvider(options);
        _scopeFactory = scopeFactory;
        _cache = cache;
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(RequirePermissionAttribute.PolicyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var policyKey = policyName[RequirePermissionAttribute.PolicyPrefix.Length..];

            var cacheKey = $"PolicyPermissions_{policyKey}";
            if (!_cache.TryGetValue(cacheKey, out string[]? permissions) || permissions == null)
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                
                var policy = await dbContext.AppAuthorizationPolicies
                    .Include(p => p.PolicyPermissions)
                        .ThenInclude(pp => pp.Permission)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Key == policyKey);

                if (policy != null)
                {
                    permissions = policy.PolicyPermissions
                        .Where(pp => pp.Permission != null)
                        .Select(pp => pp.Permission.Name)
                        .ToArray();
                        
                    _cache.Set(cacheKey, permissions, TimeSpan.FromSeconds(60));
                }
            }

            if (permissions is null || permissions.Length == 0)
            {
                throw new InvalidOperationException($"'{policyKey}' isimli policy veritabanında bulunamadı veya yetkisi yok.");
            }

            var authPolicy = new AuthorizationPolicyBuilder()
                .AddRequirements(new PermissionRequirement(permissions))
                .Build();

            return authPolicy;
        }

        return await _fallback.GetPolicyAsync(policyName);
    }
}
