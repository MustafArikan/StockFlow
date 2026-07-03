using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public class UserSession : BaseEntity
{
    [Required]
    public int UserId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Required]
    public string SessionToken { get; set; } = string.Empty;

    public string DeviceOs { get; set; } = string.Empty;
    public string DeviceBrowser { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    
    [Required]
    public DateTime ExpiresAt { get; set; }
}