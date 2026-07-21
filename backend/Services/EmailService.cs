using MailKit.Net.Smtp;
using MimeKit;
using MimeKit.Text;

namespace stok_takip.Services;
    
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        var email = new MimeMessage();
        email.From.Add(new MailboxAddress("StockFlow Güvenlik", "noreply@stockflow.com"));
        email.To.Add(new MailboxAddress("Kullanıcı", toEmail));
        email.Subject = subject;
        email.Body = new TextPart(TextFormat.Html) { Text = htmlMessage };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(_config["EmailSettings:SmtpHost"]!, int.Parse(_config["EmailSettings:SmtpPort"]!), MailKit.Security.SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_config["EmailSettings:SmtpUser"]!, _config["EmailSettings:SmtpPass"]!);

        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }
}