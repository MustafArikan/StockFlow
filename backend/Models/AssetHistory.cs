using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class AssetHistory : BaseEntity
{
    public int AssetId { get; set; }
    public Asset? Asset { get; set; }

    public int? UserId { get; set; }
    public User? User { get; set; }

    [Required]
    public string EventType { get; set; } = string.Empty;

    public string? Notes { get; set; }
}
