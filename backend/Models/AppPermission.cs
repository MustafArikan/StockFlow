using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AppPermission : BaseEntity
{
    public string Name { get; set; } = string.Empty; // e.g., "Product.Add"
    public string? Description { get; set; }
    public string Module { get; set; } = string.Empty; // e.g., "Products"

    [JsonIgnore]
    public ICollection<AppRolePermission> RolePermissions { get; set; } = new List<AppRolePermission>();

    [JsonIgnore]
    public ICollection<AppPolicyPermission> PolicyPermissions { get; set; } = new List<AppPolicyPermission>();
}
