using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace stok_takip.Models;



public class ProductSupplier : BaseEntity
{
    public int ProductId  { get; set; }
    public int SupplierId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? PurchasePrice { get; set; }   // tedarikçiye özel alış fiyatı
    [MaxLength(100)]
    public string? SupplierProductCode { get; set; } // tedarikçinin ürün kodu
    public int?  LeadTimeDays { get; set; }        // teslim süresi (gün)
    public bool  IsPreferred  { get; set; }        // tercih edilen tedarikçi

    public Product  Product  { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
}