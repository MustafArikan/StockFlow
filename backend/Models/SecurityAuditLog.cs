using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class SecurityAuditLog : BaseEntity
{
    public int? UserId { get; set; }
    public User? User { get; set; }

    [Required]
    public string ActionType { get; set; } = string.Empty;
    
    [Required]
    public string EntityName { get; set; } = string.Empty;
    public int? EntityId { get; set; }

    public string? OldValues { get; set; }
    public string? NewValues { get; set; }

    public string IpAddress { get; set; }
}
