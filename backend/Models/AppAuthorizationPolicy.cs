using System.Text.Json.Serialization;

namespace stok_takip.Models;

public class AppAuthorizationPolicy : BaseEntity
{
    public string Key { get; set; } = string.Empty; // e.g., "RequireAssetWrite"
    public string Description { get; set; } = string.Empty;

    public int PermitLimit { get; set; }
    public int WindowSeconds { get; set; }

    [JsonIgnore]
    public ICollection<AppPolicyPermission> PolicyPermissions { get; set; } = new List<AppPolicyPermission>();
}
