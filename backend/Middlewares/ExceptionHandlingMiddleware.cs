using System.Net;
using System.Text.Json;

namespace stok_takip.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware>logger, IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        // İstek (Request) hattını yakalayan metot
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // İsteği bir sonraki adıma (Controller'a) gönder
                await _next(context);
            }
            catch (Exception ex)
            {
                // Hata oluşursa konsola/log dosyasına hatayı detaylıca yaz
                _logger.LogError(ex, "An unhandled exception occurred during the request.");

                // İstemciye güvenli yanıt hazırla
                await HandleExceptionAsync(context, ex);
            }
        }

        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError; // 500 InternalServer Error

            // Geliştirme (Development) ortamında hata detayını ön yüze göster, canlı (Production)ortamda gizle!
            var response = new
            {
                message = "An unexpected error occurred on the server.",
                detail = _env.IsDevelopment() ? exception.Message : "Please contact the systemadministrator."
            };

            var json = JsonSerializer.Serialize(response);
            return context.Response.WriteAsync(json);
        }
    }
}
