using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public enum UnitCategory
{
    Sayisal = 0,   // Adet, Koli, Kasa, Palet... (paketleme/sayma birimleri)
    Agirlik = 1,   // Kg, Gr, Ton...
    Hacim = 2,     // Lt, Ml, m3...
    Uzunluk = 3,   // Metre, Cm, Mm...
    Alan = 4,      // m2...
    Zaman = 5      // Saat, Gün
}

public class Unit : BaseEntity
{
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string ShortCode { get; set; } = string.Empty; // "KG", "ADET", "KOLI"

    public bool AllowsDecimal { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public bool IsSystemUnit { get; set; } = false;

    public UnitCategory Category { get; set; } = UnitCategory.Sayisal;

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
