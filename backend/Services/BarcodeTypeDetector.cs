using stok_takip.Models;

namespace stok_takip.Services;

public static class BarcodeTypeDetector
{
    public static BarcodeType Detect(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return BarcodeType.Unknown;

        bool numeric = code.All(char.IsDigit);
        if (!numeric) return BarcodeType.InternalSku;

        return code.Length switch
        {
            8 => BarcodeType.Gtin8_Ean8,
            12 => BarcodeType.Gtin12_UpcA,
            13 => BarcodeType.Gtin13_Ean13,
            14 => BarcodeType.Gtin14_Itf14,
            18 => BarcodeType.Sscc18,
            _ => BarcodeType.InternalSku
        };
    }
}
