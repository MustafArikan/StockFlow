using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;
public class Asset : BaseEntity
{
    [Required]
    [MaxLength(100)]
    public string SerialNumber { get; set; }
    
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    
    public int? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }
    
    [Required]
    public string Status { get; set; } = "Available";

    public string? Notes { get; set; }
    public string? Attributes { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }

    public ICollection<AssetHistory>History { get; set; } = new List<AssetHistory>();
}

