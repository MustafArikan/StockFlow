namespace stok_takip.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body);
}