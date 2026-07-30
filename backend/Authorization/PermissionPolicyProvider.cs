using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using stok_takip.Attributes;

namespace stok_takip.Authorization;

/// <summary>
/// [RequirePermission("RequireProductWrite")] gibi bir attribute görüldüğünde,
/// "PERMISSION:RequireProductWrite" policy adını appsettings.json >
/// AuthorizationPolicies:RequireProductWrite:Permissions listesine bakarak
/// çalışma zamanında (runtime) üretir.
///
/// PERMISSION: prefix'i olmayan policy adları (SuperAdminOnly, AdminOnly gibi)
/// için standart DefaultAuthorizationPolicyProvider'a devredilir.
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;
    private readonly IConfiguration _configuration;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options, IConfiguration configuration)
    {
        _fallback = new DefaultAuthorizationPolicyProvider(options);
        _configuration = configuration;
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(RequirePermissionAttribute.PolicyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var policyKey = policyName[RequirePermissionAttribute.PolicyPrefix.Length..];

            var permissions = _configuration
                .GetSection($"AuthorizationPolicies:{policyKey}:Permissions")
                .Get<string[]>();

            if (permissions is null || permissions.Length == 0)
            {
                throw new InvalidOperationException(
                    $"'{policyKey}' için appsettings.json > AuthorizationPolicies:{policyKey}:Permissions " +
                    "tanımı bulunamadı. Config dosyasını kontrol edin.");
            }

            var policy = new AuthorizationPolicyBuilder()
                .AddRequirements(new PermissionRequirement(permissions))
                .Build();

            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        // SuperAdminOnly / AdminOnly gibi sabit, rol bazlı policy'ler eskisi gibi çalışır
        return _fallback.GetPolicyAsync(policyName);
    }
}
