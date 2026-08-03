using Microsoft.AspNetCore.Authorization;

namespace stok_takip.Authorization;

/// PermissionRequirement'ı değerlendiren handler.
/// Program.cs > OnTokenValidated tarafından her istekte DB'den taze
/// yüklenen "Permission" claim'lerine bakar — bu sayede DB'deki
/// permission değişiklikleri bir sonraki istekte anında yansır.
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // Mevcut davranışla birebir aynı: superadmin her zaman geçer
        if (context.User.IsInRole("superadmin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Permission claim'lerinden en az biri varsa yeterli (OR)
        if (requirement.Permissions.Any(p => context.User.HasClaim("Permission", p)))
        {
            context.Succeed(requirement);
        }

        // Succeed çağrılmazsa AuthorizationMiddleware otomatik olarak 403 Forbidden döner
        return Task.CompletedTask;
    }
}
