using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AppPolicyPermission : BaseEntity
{
    public int PolicyId { get; set; }
    public AppAuthorizationPolicy Policy { get; set; } = null!;

    public int PermissionId { get; set; }
    public AppPermission Permission { get; set; } = null!;
}
