namespace stok_takip.Services;

public static class UnitValidationHelper
{
    /// <summary>
    /// Birim ondalık kabul etmiyorsa miktarın tam sayı olduğunu doğrular.
    /// </summary>
    public static bool IsQuantityValidForUnit(decimal quantity, bool unitAllowsDecimal)
    {
        if (unitAllowsDecimal) return true;
        return quantity == Math.Truncate(quantity);
    }
}
