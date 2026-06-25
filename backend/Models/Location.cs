namespace stok_takip.Models;

public class Location : BaseEntity
{
    public int WarehouseId { get; set; }
    public string Code { get; set; } = string.Empty; // UQ (Örn: RAF-A1)

    public Warehouse Warehouse { get; set; } = null!;
    public ICollection<StockLevel> StockLevels { get; set; } = new List<StockLevel>();
}