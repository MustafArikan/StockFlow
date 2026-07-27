using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AppRole : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    [JsonIgnore]
    public ICollection<User> Users { get; set; } = new List<User>();

    public ICollection<AppRolePermission> RolePermissions { get; set; } = new List<AppRolePermission>();

    public bool IsSystemRole { get; set; }
}
