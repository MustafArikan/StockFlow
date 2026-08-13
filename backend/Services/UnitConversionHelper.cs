using Microsoft.EntityFrameworkCore;
using stok_takip.Data;

namespace stok_takip.Services;

public static class UnitConversionHelper
{
    /// <summary>
    /// Girilen miktarı, gerekiyorsa ürünün taban birimine çevirir.
    /// inputUnitId null ise miktar zaten taban birimdedir, olduğu gibi döner.
    /// </summary>
    public static async Task<(decimal baseQuantity, string? error)> ConvertToBaseUnitAsync(
        AppDbContext context, int productId, int baseUnitId, decimal quantity, int? inputUnitId)
    {
        if (inputUnitId == null || inputUnitId == baseUnitId)
            return (quantity, null); // Zaten taban birimde

        var conversion = await context.ProductUnitConversions
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ProductId == productId
                                    && c.AlternativeUnitId == inputUnitId
                                    && !c.IsDeleted);

        if (conversion == null)
            return (0, "Bu ürün için belirtilen birimde bir çevrim tanımı bulunamadı.");

        var baseQuantity = quantity * conversion.ConversionFactor;
        return (baseQuantity, null);
    }
}
