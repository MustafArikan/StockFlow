namespace stok_takip.Models;

public enum BarcodeType
{
    Unknown = 0,
    InternalSku = 1,
    Gtin12_UpcA = 2,
    Gtin13_Ean13 = 3,
    Gtin14_Itf14 = 4,
    Gs1_128 = 5,
    Sscc18 = 6
}
