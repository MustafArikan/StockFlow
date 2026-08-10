using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public class Unit : BaseEntity
{
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string ShortCode { get; set; } = string.Empty; // "KG", "ADET", "KOLI"

    public bool AllowsDecimal { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public bool IsSystemUnit { get; set; } = false;

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
