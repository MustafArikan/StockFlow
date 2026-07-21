namespace stok_takip.DTOs;

public class ImportReportDto
{
    public int TotalRows { get; set; } = 0;
    public int SuccessCount { get; set; } = 0;
    public int ErrorCount { get; set; } = 0;
    public List<ImportRowErrorDto> Errors { get; set; } = new List<ImportRowErrorDto>();
}

public class ImportRowErrorDto
{
    public int RowNumber { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
}