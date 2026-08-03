using Microsoft.AspNetCore.Authorization;

namespace stok_takip.Authorization;

/// <summary>
/// appsettings.json'dan okunan permission listesini taşıyan requirement.
/// Listede OR mantığı vardır: kullanıcının bu permission'lardan
/// EN AZ BİRİNE sahip olması yeterlidir (mevcut RequireAssertion mantığıyla birebir aynı).
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    public string[] Permissions { get; }

    public PermissionRequirement(string[] permissions)
    {
        Permissions = permissions;
    }
}
