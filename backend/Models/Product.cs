namespace stok_takip.Models;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty; // UQ
    public int MinStockLevel { get; set; }
    public int CategoryId { get; set; }

    public Category Category { get; set; } = null!;
    public ICollection<StockLevel> StockLevels { get; set; } = new List<StockLevel>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
}