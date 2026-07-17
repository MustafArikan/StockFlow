namespace stok_takip.DTOs;

// --- REQUEST DTOs ---
public record CreateSupplierDto(string Name, string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
public record CreateAttributeRuleDto(int? CategoryId, string AttributeKey, string DataType, bool IsRequired, string? AllowedValues);

// --- RESPONSE DTOs ---
public record CategoryResponseDto(int Id, string Name, int? ParentId);
public record ProductResponseDto(int Id, string Name, string Barcode, int MinStockLevel, int CategoryId, string? Attributes);
public record WarehouseResponseDto(int Id, string Name, string? Address);
public record LocationResponseDto(int Id, string Code, int WarehouseId);
public record SupplierResponseDto(int Id, string Name, string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
public record AttributeRuleResponseDto(int Id, int? CategoryId, string AttributeKey, string DataType, bool IsRequired, string? AllowedValues);
public record AssetResponseDto(int Id, string SerialNumber, int ProductId, int? AssignedToId, string Status, string? Notes);
public record AssetHistoryResponseDto(int Id, int AssetId, int? UserId, string EventType, string? Notes);
public record NotificationResponseDto(int Id, string Message, string Type, string Severity, bool IsRead, System.DateTime CreatedAt);
public record StockMovementResponseDto(int Id, int ProductId, int? UserId, string MovementType, decimal Quantity, string? Description, decimal UnitPrice, decimal TotalPrice, int? SupplierId, string? Destination, string? DocumentNumber);
public record AuditLogResponseDto(int Id, int? UserId, string ActionType, string EntityName, int? EntityId, string? OldValues, string? NewValues, string IpAddress, System.DateTime CreatedAt);
