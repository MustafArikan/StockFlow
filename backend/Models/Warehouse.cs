namespace stok_takip.Models;

public class Warehouse : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
    public ICollection<UserWarehouse> UserWarehouses { get; set; } = new List<UserWarehouse>();
}