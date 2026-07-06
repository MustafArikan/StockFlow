using Microsoft.EntityFrameworkCore;
using stok_takip.Data;

namespace stok_takip.Services
{
    public class SessionCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SessionCleanupService> _logger;

        public SessionCleanupService(IServiceProvider serviceProvider, ILogger<SessionCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        // Süresi dolmuş ama hala aktif (1) görünen oturumları bul
                        var expiredSessions = await context.UserSessions
                            .Where(s => s.IsActive && s.ExpiresAt < DateTime.UtcNow)
                            .ToListAsync(stoppingToken);

                        if (expiredSessions.Any())
                        {
                            foreach (var session in expiredSessions)
                            {
                                session.IsActive = false;
                            }

                            await context.SaveChangesAsync(stoppingToken);
                            _logger.LogInformation($"{expiredSessions.Count} adet süresi dolmuş oturum otomatik olarak pasife (0) çekildi.");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Oturum temizleme servisinde bir hata oluştu.");
                }

                // Her 1 saatte bir çalıştır
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}
