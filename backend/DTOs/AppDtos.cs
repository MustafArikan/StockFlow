using System.ComponentModel.DataAnnotations;

namespace stok_takip.DTOs;

// --- REQUEST DTOs ---
public class CreateSupplierDto
{
    [Required(ErrorMessage = "Tedarikçi adı boş bırakılamaz.")]
    [StringLength(150, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactName { get; set; }

    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    [StringLength(100)]
    public string? ContactEmail { get; set; }

    [RegularExpression(@"^[0-9+()\s-]{7,20}$", ErrorMessage = "Geçerli bir telefon numarası giriniz.")]
    public string? ContactPhone { get; set; }

    [StringLength(250)]
    public string? Address { get; set; }

    [RegularExpression(@"^\d{10,11}$", ErrorMessage = "Vergi/TC kimlik numarası 10-11 haneli rakamlardan oluşmalıdır.")]
    public string? TaxNumber { get; set; }
}

public record AttributeAllowedValueDto(
    [property: Required, StringLength(100, MinimumLength = 1)] string Value,
    string? Label,
    int DisplayOrder,
    bool IsActive = true);

public class CreateAttributeRuleDto
{
    public int? CategoryId { get; set; }

    [Required(ErrorMessage = "Özellik anahtarı boş bırakılamaz.")]
    [StringLength(100, MinimumLength = 2)]
    public string AttributeKey { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(text|number|integer|decimal|boolean)$",
        ErrorMessage = "Geçersiz veri tipi. İzin verilen: text, number, integer, decimal, boolean.")]
    public string DataType { get; set; } = string.Empty;

    public bool IsRequired { get; set; }
    public string? AllowedValues { get; set; }

    [RegularExpression("^(textbox|dropdown|searchable_dropdown|radio|segmented_button|discrete_slider|range_slider|range_slider_decimal|range_slider_integer|slider)$",
        ErrorMessage = "Geçersiz arayüz bileşeni.")]
    public string UiComponent { get; set; } = "textbox";

    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }

    [RegularExpression("^(Product|Asset)$", ErrorMessage = "Geçersiz hedef seviye.")]
    public string TargetLevel { get; set; } = "Product";

    public List<AttributeAllowedValueDto>? AllowedValueList { get; set; }
}

// --- RESPONSE DTOs ---
public record CategoryResponseDto(int Id, string Name, int? ParentId);
public record ProductResponseDto(int Id, string Name, string Barcode, int MinStockLevel, int CategoryId, string? Attributes);
public record WarehouseResponseDto(int Id, string Name, string? Address);
public record LocationResponseDto(int Id, string Code, int WarehouseId);
public record SupplierResponseDto(int Id, string Name, string? ContactName, string? ContactEmail, string? ContactPhone, string? Address, string? TaxNumber, DateTime CreatedAt);
public record AttributeRuleResponseDto(int Id, int? CategoryId, string AttributeKey, string DataType, bool IsRequired, string? AllowedValues, string UiComponent, decimal? MinValue, decimal? MaxValue, string TargetLevel, int DisplayOrder, List<AttributeAllowedValueDto>? AllowedValueList = null);
public record UpdateRuleOrderDto(int Id, int DisplayOrder);
public record AssetResponseDto(int Id, string SerialNumber, int ProductId, int? AssignedToId, string Status, string? Notes);
public record AssetHistoryResponseDto(int Id, int AssetId, int? UserId, string EventType, string? Notes);
public record NotificationResponseDto(int Id, string Message, string Type, string Severity, bool IsRead, System.DateTime CreatedAt);
public record StockMovementResponseDto(int Id, int ProductId, int? UserId, string MovementType, decimal Quantity, string? Description, decimal UnitPrice, decimal TotalPrice, int? SupplierId, string? Destination, string? DocumentNumber);
public record AuditLogResponseDto(int Id, int? UserId, string ActionType, string EntityName, int? EntityId, string? OldValues, string? NewValues, string IpAddress, System.DateTime CreatedAt);
public record CreateProductSupplierDto(int SupplierId, decimal? PurchasePrice, string? SupplierProductCode, int? LeadTimeDays, bool IsPreferred);
public record ProductSupplierResponseDto(int Id, int SupplierId, string SupplierName, decimal? PurchasePrice, string? SupplierProductCode, int? LeadTimeDays, bool IsPreferred);
public record SupplierProductResponseDto(int Id, int ProductId, string ProductName, string ProductBarcode, decimal? PurchasePrice, bool IsPreferred);

