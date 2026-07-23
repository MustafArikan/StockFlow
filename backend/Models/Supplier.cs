using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace stok_takip.Models;

public class Supplier : BaseEntity
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? TaxNumber {get; set;}


    [MaxLength(100)]
    public string? ContactName { get; set; }

    [MaxLength(100)]
    public string? ContactEmail { get; set; }

    [MaxLength(100)]
    public string? ContactPhone { get; set; }

    public string? Address { get; set; }

    public ICollection<StockMovement>? StockMovements { get; set; } = new List<StockMovement>();

    public ICollection<ProductSupplier> ProductSuppliers{ get; set; } = new List<ProductSupplier>();

    
}
