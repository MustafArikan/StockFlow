using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty; // UQ
    public int MinStockLevel { get; set; }
    public int CategoryId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Cost { get; set; } = 0; // Maliyet fiyat�
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; } = 0; // ��k�� fiyat

    public string? Attributes { get; set; } // JSON format�nda �r�n �zellikleri

    public Category Category { get; set; } = null!;
    public ICollection<StockLevel> StockLevels { get; set; } = new List<StockLevel>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();

    public ICollection<ProductSupplier> ProductSuppliers{ get; set; } = new List<ProductSupplier>();

}
