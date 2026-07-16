const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

function getUserEmail() {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadDecoded = JSON.parse(atob(payloadBase64));
        return payloadDecoded["email"] ||
               payloadDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
               "Kullanıcı";
    } catch (e) {
        return "Kullanıcı";
    }
}

window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    const userProfileEl = document.getElementById('userProfile');
    if (userProfileEl) {
        userProfileEl.textContent = getUserEmail();    
    }

    loadDashboardSummary();
    loadNavbarNotifications();
    loadReportCharts();
    
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            if (trendChartInstance) trendChartInstance.update();
            if (categoryChartInstance) categoryChartInstance.update();
            if (topProductsChartInstance) topProductsChartInstance.update();
        });
    }

    const btnNavbarReadAll = document.getElementById('btnNavbarReadAll');
    if (btnNavbarReadAll) {
        btnNavbarReadAll.addEventListener("click", markAllAsRead);
    }

    const btnNavbarLogout = document.getElementById('btnNavbarLogout');
    if (btnNavbarLogout) {
        btnNavbarLogout.addEventListener("click", logout);
    }

    const btnExportPdf = document.getElementById('btnExportPdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener("click", exportDashboardAsPdf);
    }

    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener("click", exportDashboardAsCsv);
    }

    // Tema (aydınlık/karanlık) değişince grafikleri yeni renklerle yeniden çiz
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (lastTrendData && lastTrendData.length > 0) renderTrendChart(lastTrendData);
                if (lastCategoryData && lastCategoryData.length > 0) renderCategoryChart(lastCategoryData);
                if (lastTopProductsData && lastTopProductsData.length > 0) renderTopProductsChart(lastTopProductsData);
            }, 50);
        });
    }
});

async function loadDashboardSummary() {
    try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/reports/dashboard-summary`, {  
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (response.status == 401) {
                logout();
                return;
            }

            if (!response.ok) throw new Error("Dashboard verileri alınamadı.");
                 
            const data = await response.json();

            document.getElementById("totalProductsText").textContent = data.totalProducts;
            document.getElementById("activeWarehousesText").textContent = data.totalWarehouses;
            document.getElementById("criticalAlertsText").textContent = data.criticalAlertsCount;
    }
    catch (error) {
        console.error("Dashboard yükleme hatası:", error);
    }
}

async function loadNavbarNotifications() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?onlyUnread=true`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status == 401) {
            logout();
            return;
        }

        if (!response.ok) throw new Error("Bildirimler alınamadı.");

        const notifications = await response.json();
        renderNavbarNotifications(notifications);
    } catch (error) {
        console.error("Zil bildirimleri yükleme hatası:", error);
    }
}

function renderNavbarNotifications(notifications) {
    const badge = document.getElementById("notificationBadge");
    const list = document.getElementById("navbarNotificationList");

    if (!badge || !list) return;

    const count = notifications.length;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("d-none");
    } else {
        badge.classList.add("d-none");
    }

    if (count === 0) {
        list.innerHTML = `<li class="text-center text-muted py-3 small">Kritik stok uyarısı bulunmamaktadır.</li>`;
        return;
    }

    const recentNotifications = notifications.slice(0, 4);
    list.innerHTML = ""; // Clear existing first
    
    recentNotifications.forEach(notification => {
        let iconClass = "bi-exclamation-triangle-fill text-warning";
        if (notification.severity === "CRITICAL") {
            iconClass = "bi-exclamation-circle-fill text-orange-custom";
        } else if (notification.severity === "DANGER" || notification.severity === "EMPTY_STOCK") {
            iconClass = "bi-shield-fill-x text-danger";
        } else if (notification.severity === "INFO") {
            iconClass = "bi-info-circle-fill text-secondary";
        }
        
        const li = document.createElement("li");
        li.className = "p-2 border-bottom small rounded hover-bg";
        
        li.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi ${iconClass} me-2"></i>
                <div class="flex-1-min-0">
                    <p class="mb-0 text-dark text-truncate fs-085 safe-message-container"></p>
                    <small class="text-muted fs-075">${new Date(notification.createdAt).toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'})}</small>
                </div>
            </div>
        `;
        
        const msgContainer = li.querySelector(".safe-message-container");
        msgContainer.title = notification.message;
        msgContainer.textContent = notification.message; // GÜVENLİ XSS koruması
        
        list.appendChild(li);
    });
}

async function markAllAsRead() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("İşlem başarısız.");

        loadDashboardSummary();
        loadNavbarNotifications();
    } catch (error) {
        console.error("Tümünü okundu işaretleme hatası:", error);
    }
}

// DASHBOARD GRAFİKLERİ (Chart.js ile çizilir)
// Chart.js grafik nesnelerini burada tutuluyor
// veri çekince eskisini silip yenisini bu değişkenlere atıyoruz.
let trendChartInstance = null;
let categoryChartInstance = null;
let topProductsChartInstance = null;

// Excel/CSV indirirken tekrar sunucudan veri istemek yerine, en son çekilen veriyi burada saklanır.
let lastCategoryData = [];
let lastTopProductsData = [];

// Karanlık/aydınlık temaya göre grafik yazı rengi değişir.
function getChartTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#ececec' : '#1a1d23';
}

// Karanlık/aydınlık temaya göre grafik ızgara (grid) çizgisi rengini değişir.
function getChartGridColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#40424c' : '#d8dce2';
}

// Sunucudan 3 rapor verisini birlikte çekip 3 grafiği de çizer
async function loadReportCharts() {
    try {
        const [trendRes, categoryRes, topProductsRes] = await Promise.all([
            fetch(`${CONFIG.API_BASE_URL}/reports/trend`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${CONFIG.API_BASE_URL}/reports/by-category`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${CONFIG.API_BASE_URL}/reports/top-products`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (trendRes.status === 401 || categoryRes.status === 401 || topProductsRes.status === 401) {
            logout();
            return;
        }

        lastTrendData = trendRes.ok ? await trendRes.json() : [];
        lastCategoryData = categoryRes.ok ? await categoryRes.json() : [];
        lastTopProductsData = topProductsRes.ok ? await topProductsRes.json() : [];

        renderTrendChart(lastTrendData);
        renderCategoryChart(lastCategoryData);
        renderTopProductsChart(lastTopProductsData);
    } catch (error) {
        console.error("Rapor grafikleri yüklenemedi:", error);
    }
}

// Son 30 günün giriş/çıkış miktarlarını çizgi grafik olarak çizer
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();
    const gridColor = getChartGridColor();
    const labels = data.map(d => new Date(d.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }));

    if (trendChartInstance) trendChartInstance.destroy(); // Eski grafik varsa önce onu temizler

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Giriş',
                    data: data.map(d => d.girisMiktari),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.15)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Çıkış',
                    data: data.map(d => d.cikisMiktari),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.15)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });
}

// Kategorilere göre toplam stok dağılımını halka grafik olarak çizer
function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();
    
    const palette = [
        '#0d6efd', '#fd7e14', '#198754', '#6f42c1', 
        '#d63384', '#20c997', '#ffc107', '#0dcaf0', 
        '#6c757d', '#6610f2', '#e83e8c', '#17a2b8'
    ];

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.kategoriAdi),
            datasets: [{
                data: data.map(d => d.toplamStok),
                backgroundColor: data.map((_, i) => palette[i % palette.length])
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            }
        }
    });
}

// En çok hareket gören 5 ürünü yatay çubuk grafik olarak çizer
function renderTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();
    const gridColor = getChartGridColor();

    if (topProductsChartInstance) topProductsChartInstance.destroy();

    topProductsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.urunAdi),
            datasets: [{
                label: 'Toplam Hareket Miktarı',
                data: data.map(d => d.toplamHareketMiktari),
                backgroundColor: '#0d6efd'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}


// PDF OLARAK DIŞA AKTARMA (jsPDF + html2canvas kullanılır)


// Dashboard alanının bir "fotoğrafını" çekip PDF'e yerleştirir. İçerik tek sayfaya
// sığmıyorsa görüntüyü dilimleyip birden fazla sayfaya bölerek ekler.
async function exportDashboardAsPdf() {
    const target = document.getElementById('dashboardExportArea');
    const btn = document.getElementById('btnExportPdf');
    if (!target || !btn) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Hazırlanıyor...';

    try {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const sourceCanvas = await html2canvas(target, {
            backgroundColor: isDark ? '#1c1d21' : '#ffffff',
            scale: 2 
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const margin = 10;
        const headerHeight = 14; // Başlık + tarih yazısı için ayrılan alan (sadece ilk sayfada)
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        const pxPerMm = sourceCanvas.width / contentWidth;

        let renderedPx = 0;
        let pageIndex = 0;

        // Görüntü bir A4 sayfasından uzunsa, kalan kısmı yeni sayfalara böle böle ekliyoruz
        while (renderedPx < sourceCanvas.height) {
            const topOffset = pageIndex === 0 ? margin + headerHeight : margin;
            const availableMm = pageHeight - topOffset - margin;
            const sliceHeightPx = Math.min(Math.floor(availableMm * pxPerMm), sourceCanvas.height - renderedPx);

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = sourceCanvas.width;
            pageCanvas.height = sliceHeightPx;
            pageCanvas.getContext('2d').drawImage(
                sourceCanvas,
                0, renderedPx, sourceCanvas.width, sliceHeightPx,
                0, 0, sourceCanvas.width, sliceHeightPx
            );

            if (pageIndex > 0) pdf.addPage();

            if (pageIndex === 0) {
                pdf.setFontSize(14);
                pdf.setTextColor(20);
                pdf.text('StockFlow - Kontrol Paneli Raporu', margin, margin + 4);
                pdf.setFontSize(9);
                pdf.setTextColor(120);
                pdf.text(new Date().toLocaleString('tr-TR'), margin, margin + 10);
            }

            const sliceHeightMm = sliceHeightPx / pxPerMm;
            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, topOffset, contentWidth, sliceHeightMm);

            renderedPx += sliceHeightPx;
            pageIndex++;
        }

        pdf.save(`stockflow-rapor-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
        console.error("PDF oluşturma hatası:", error);
        alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// EXCEL/CSV OLARAK DIŞA AKTARMA 

// Bir satırı düzgün CSV formatına çevirir 
function csvSatiriOlustur(degerler) {
    return degerler.map(deger => {
        const metin = (deger ?? '').toString().replace(/"/g, '""');
        return `"${metin}"`;
    }).join(';') + '\r\n';   
}

// Son çekilen 3 rapor verisini tek bir CSV dosyası olarak indirir
function exportDashboardAsCsv() {
    let csvContent = '\uFEFF'; // Excel'in Türkçe karakterleri (ş, ı, ğ...) doğru okuması için gerekli işaret

    csvContent += csvSatiriOlustur(['StockFlow Kontrol Paneli Raporu', new Date().toLocaleString('tr-TR')]);
    csvContent += '\r\n';

    csvContent += csvSatiriOlustur(['Son 30 Gün Stok Hareket Trendi']);
    csvContent += csvSatiriOlustur(['Tarih', 'Giriş Miktarı', 'Çıkış Miktarı']);
    lastTrendData.forEach(d => {
        csvContent += csvSatiriOlustur([d.tarih, d.girisMiktari, d.cikisMiktari]);
    });
    csvContent += '\r\n';

    csvContent += csvSatiriOlustur(['Kategoriye Göre Stok Dağılımı']);
    csvContent += csvSatiriOlustur(['Kategori', 'Toplam Stok']);
    lastCategoryData.forEach(d => {
        csvContent += csvSatiriOlustur([d.kategoriAdi, d.toplamStok]);
    });
    csvContent += '\r\n';

    csvContent += csvSatiriOlustur(['En Çok Hareket Gören 5 Ürün']);
    csvContent += csvSatiriOlustur(['Ürün Adı', 'Barkod', 'Toplam Hareket Miktarı', 'Hareket Sayısı']);
    lastTopProductsData.forEach(d => {
        csvContent += csvSatiriOlustur([d.urunAdi, d.barkod, d.toplamHareketMiktari, d.hareketSayisi]);
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stockflow-rapor-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}