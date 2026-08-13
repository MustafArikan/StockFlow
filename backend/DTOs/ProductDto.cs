namespace stok_takip.DTOs;

public class ProductDto
{
    public int Id{ get; set;}
    public string Name { get; set;}=string.Empty;
    public string Barcode { get; set;}=string.Empty;
    public string BarcodeType { get; set; } = string.Empty;
    public int MinStockLevel {  get; set;}
    public int CategoryId {get; set;}
    public string CategoryName { get; set;} = string.Empty;
    public int UnitId { get; set; }
    public string UnitName { get; set; } = string.Empty;
    public string UnitShortCode { get; set; } = string.Empty;
    public bool UnitAllowsDecimal { get; set; } = false;
    public List<ProductUnitConversionDto> UnitConversions { get; set; } = new();   public decimal StockQuantity { get; set;}
    public int LocationId { get; set; }

    public decimal Cost { get; set; } = 0; // Maliyet fiyatı
    public decimal Price { get; set; } = 0; // Çıkış fiyatı

    public List<ProductAttributeDto>? Attributes { get; set; } // JSON formatında ürün özellikleri (Strongly Typed EAV)
    public List<ProductSupplierResponseDto> ProductSuppliers { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}