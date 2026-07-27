using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AppRolePermission : BaseEntity
{
    public int RoleId { get; set; }
    public AppRole Role { get; set; } = null!;

    public int PermissionId { get; set; }
    public AppPermission Permission { get; set; } = null!;
}
