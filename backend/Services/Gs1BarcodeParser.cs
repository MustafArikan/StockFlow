using stok_takip.Models;

namespace stok_takip.Services;

public class ParsedGs1Data
{
    public string? Gtin { get; set; }
    public string? LotNumber { get; set; }
    public DateTime? ProductionDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal? VariableQuantity { get; set; }
    public decimal? NetWeightKg { get; set; }
    public string? Sscc { get; set; }
}

public static class Gs1BarcodeParser
{
    private const char FNC1 = '\u001d';

    private static readonly Dictionary<string, int?> FixedLengthAIs = new()
    {
        ["00"] = 18, ["01"] = 14, ["11"] = 6, ["15"] = 6, ["17"] = 6, ["3103"] = 6
    };

    public static ParsedGs1Data Parse(string raw)
    {
        if (raw.StartsWith("]C1")) raw = raw.Substring(3);
        raw = raw.Replace("(", "").Replace(")", "");

        var result = new ParsedGs1Data();
        int pos = 0;

        while (pos < raw.Length)
        {
            string? matchedAi = null;
            foreach (var len in new[] { 4, 3, 2 })
            {
                if (pos + len > raw.Length) continue;
                var candidate = raw.Substring(pos, len);
                if (FixedLengthAIs.ContainsKey(candidate) || IsKnownVariableAi(candidate))
                {
                    matchedAi = candidate;
                    break;
                }
            }

            if (matchedAi == null) break;

            pos += matchedAi.Length;
            string value;

            if (FixedLengthAIs.TryGetValue(matchedAi, out var fixedLen) && fixedLen.HasValue)
            {
                value = raw.Substring(pos, Math.Min(fixedLen.Value, raw.Length - pos));
                pos += value.Length;
            }
            else
            {
                int end = raw.IndexOf(FNC1, pos);
                if (end == -1) end = raw.Length;
                value = raw.Substring(pos, end - pos);
                pos = end + (end < raw.Length ? 1 : 0);
            }

            ApplyAi(result, matchedAi, value);
        }

        return result;
    }

    private static bool IsKnownVariableAi(string ai) => ai is "10" or "21" or "30";

    private static void ApplyAi(ParsedGs1Data result, string ai, string value)
    {
        switch (ai)
        {
            case "00": result.Sscc = value; break;
            case "01": result.Gtin = value; break;
            case "10": result.LotNumber = value; break;
            case "11": result.ProductionDate = ParseYyMmDd(value); break;
            case "17": result.ExpiryDate = ParseYyMmDd(value); break;
            case "30": result.VariableQuantity = decimal.TryParse(value, out var q) ? q : null; break;
            case "3103": result.NetWeightKg = decimal.TryParse(value, out var w) ? w / 1000m : null; break;
        }
    }

    private static DateTime? ParseYyMmDd(string yymmdd)
    {
        if (yymmdd.Length != 6 || !yymmdd.All(char.IsDigit)) return null;
        int yy = int.Parse(yymmdd[..2]);
        int year = yy <= 50 ? 2000 + yy : 1900 + yy;
        int month = int.Parse(yymmdd.Substring(2, 2));
        if (month < 1 || month > 12) return null;
        int day = int.Parse(yymmdd.Substring(4, 2));
        if (day == 0) day = DateTime.DaysInMonth(year, month);
        try { return new DateTime(year, month, day); } catch { return null; }
    }
}
