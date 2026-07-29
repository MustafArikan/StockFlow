using Prometheus;

namespace stok_takip.Metrics
{
    /// <summary>
    /// StockFlow'a özel iş mantığı metrikleri.
    /// Bu sınıf Program.cs içinde Singleton olarak DI'a kayıtlıdır,
    /// Controller'larda constructor injection ile kullanılır.
    /// </summary>
    public class StockFlowMetrics
    {
        // Toplam stok hareketi sayacı (giriş/çıkış/transfer tipine göre etiketlenir)
        public readonly Counter StockMovementsTotal = Prometheus.Metrics.CreateCounter(
            "stockflow_stock_movements_total",
            "Gerçekleşen toplam stok hareketi sayısı",
            new CounterConfiguration
            {
                LabelNames = new[] { "movement_type", "warehouse" }
            });

        // Başarılı/başarısız giriş denemeleri
        public readonly Counter LoginAttemptsTotal = Prometheus.Metrics.CreateCounter(
            "stockflow_login_attempts_total",
            "Toplam giriş denemesi sayısı",
            new CounterConfiguration
            {
                LabelNames = new[] { "result" } // "success" | "failed"
            });

        // O anki aktif oturum (session) sayısı — Gauge, artıp azalabilir
        public readonly Gauge ActiveSessions = Prometheus.Metrics.CreateGauge(
            "stockflow_active_sessions",
            "Şu anda aktif olan (süresi dolmamış) kullanıcı oturumu sayısı");

        // Düşük stok uyarısı üretilen ürün sayısı
        public readonly Gauge LowStockProductsCount = Prometheus.Metrics.CreateGauge(
            "stockflow_low_stock_products",
            "Minimum stok seviyesinin altındaki ürün sayısı");

        // Rate limiter tarafından reddedilen istekler (429)
        public readonly Counter RateLimitRejectionsTotal = Prometheus.Metrics.CreateCounter(
            "stockflow_rate_limit_rejections_total",
            "AuthLimit rate limiter tarafından reddedilen istek sayısı");
    }
}
