namespace stok_takip.Services;

public static class Gs1CheckDigitCalculator
{
    public static int Calculate(string digitsWithoutCheckDigit)
    {
        int sum = 0;
        var reversed = digitsWithoutCheckDigit.Reverse().ToArray();
        for (int i = 0; i < reversed.Length; i++)
        {
            int digit = reversed[i] - '0';
            sum += (i % 2 == 0) ? digit * 3 : digit * 1;
        }
        return (10 - (sum % 10)) % 10;
    }

    public static bool IsValid(string fullCode)
    {
        if (string.IsNullOrEmpty(fullCode) || !fullCode.All(char.IsDigit)) return false;
        var body = fullCode[..^1];
        var checkDigit = fullCode[^1] - '0';
        return Calculate(body) == checkDigit;
    }

    public static string GenerateGtin14FromGtin13(string gtin13, int packagingLevel)
    {
        if (gtin13.Length != 13 || !gtin13.All(char.IsDigit))
            throw new ArgumentException("Geçerli bir 13 haneli GTIN gerekli.");
        if (packagingLevel < 1 || packagingLevel > 8)
            throw new ArgumentException("Paketleme seviyesi 1-8 arasında olmalıdır.");

        string body = packagingLevel.ToString() + gtin13[..12];
        int checkDigit = Calculate(body);
        return body + checkDigit;
    }
}
