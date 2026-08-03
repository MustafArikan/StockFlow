using Microsoft.AspNetCore.Authorization;

namespace stok_takip.Attributes;

/// <summary>
/// Controller/action üzerine yazılır. appsettings.json > AuthorizationPolicies
/// altındaki bir anahtarı (ör. "RequireProductWrite") referans alır.
/// Gerçek permission listesi koda değil config'e bağlıdır.
///
/// Kullanım:
///   [RequirePermission(Policies.RequireProductWrite)]
/// </summary>
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "PERMISSION:";

    public RequirePermissionAttribute(string policyKey)
    {
        Policy = PolicyPrefix + policyKey;
    }
}
