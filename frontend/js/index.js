function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}



document.addEventListener('DOMContentLoaded', () => {
    loadDashboardSummary();
    loadCharts();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            if (trendChartInstance) trendChartInstance.update();
            if (categoryChartInstance) categoryChartInstance.update();
            if (topProductsChartInstance) topProductsChartInstance.update();
            if (movementSummaryChartInstance) movementSummaryChartInstance.update();
        });
    }


    const btnExportPdf = document.getElementById('btnExportPdf');
    if (btnExportPdf) btnExportPdf.addEventListener("click", exportDashboardAsPdf);

    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) btnExportCsv.addEventListener("click", exportDashboardAsExcel);
    
    const themeToggleBtn = document.getElementById('layoutThemeToggleBtn') || document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (lastTrendData && lastTrendData.length > 0) renderTrendChart(lastTrendData);
                if (lastCategoryData && lastCategoryData.length > 0) renderCategoryChart(lastCategoryData);
                if (lastTopProductsData && lastTopProductsData.length > 0) renderTopProductsChart(lastTopProductsData);
                if (lastMovementData) renderMovementSummaryChart(lastMovementData);
            }, 50);
        });
    }
});

async function loadDashboardSummary() {
    try {
        const data = await apiRequest('/reports/dashboard-summary', 'GET');

        document.getElementById('totalProductsText').textContent = data.totalProducts || 0;
        document.getElementById('totalStockText').innerHTML = `${data.totalStockQuantity || 0} <span class="fs-6 text-muted">Adet</span>`;
        document.getElementById('activeWarehousesText').textContent = data.totalWarehouses || 0;
        document.getElementById('criticalAlertsText').textContent = data.criticalAlertsCount || 0;

        const valEl = document.getElementById('totalProductsValue');
        if (valEl) valEl.textContent = formatCurrency(data.totalWarehouseValue || 0);

    } catch (error) {
        console.error("Dashboard özeti yüklenemedi:", error);
    }
}



// DASHBOARD GRAFİKLERİ
let trendChartInstance = null;
let categoryChartInstance = null;
let topProductsChartInstance = null;
let movementSummaryChartInstance = null;

let lastTrendData = [];
let lastCategoryData = [];
let lastTopProductsData = [];
let lastMovementData = null;
let allProductsForExcel = [];
let currentTrendProduct = null;

// GRAFİK RENKLERİ
// Renkler doğrudan style.css içindeki tasarım jetonlarından okunur. Böylece
// tema değiştiğinde ya da palet güncellendiğinde grafikler kendiliğinden uyum
// sağlar; hiçbir renk iki ayrı yerde tanımlı kalmaz.
function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Jetonlar HEX olarak tanımlıdır; sayısal ve saydam sürümlerini üretir.
function hexToRgb(hex, fallback) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!match) return fallback;
    const n = parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex, alpha) {
    const rgb = hexToRgb(hex, null);
    if (!rgb) return hex;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function getChartTextColor() {
    return cssVar('--nb-text', isDarkTheme() ? '#f2f3f0' : '#151515');
}

function getChartGridColor() {
    return cssVar('--nb-edge-soft', isDarkTheme() ? '#3c414f' : '#d3d4cb');
}

function getChartSurfaceColor() {
    return cssVar('--nb-surface', isDarkTheme() ? '#22252e' : '#ffffff');
}

function getChartEdgeColor() {
    return cssVar('--nb-edge', isDarkTheme() ? '#767c8c' : '#151515');
}

// Hareket tipleri TÜM grafiklerde aynı rengi taşır: giriş / çıkış / transfer.
// DİKKAT: Marka jetonları (--nb-orange vb.) değil, GRAFİĞE ÖZEL jetonlar
// okunur. Koyu temada bunların açık sürümleri devreye girer; aksi hâlde
// koyu kart yüzeyinde seriler birbirine ve zemine karışır.
function getMovementColors() {
    return {
        giris: cssVar('--nb-chart-teal', '#10a294'),
        cikis: cssVar('--nb-chart-red', '#db3707'),
        transfer: cssVar('--nb-chart-blue', '#1d4aff')
    };
}

// Kategori dağılımı gibi seri sayısı önceden bilinmeyen grafikler için palet.
function getCategoricalPalette() {
    return [
        cssVar('--nb-chart-orange', '#f54e00'),
        cssVar('--nb-chart-blue', '#1d4aff'),
        cssVar('--nb-chart-teal', '#10a294'),
        cssVar('--nb-chart-purple', '#b62ad9'),
        cssVar('--nb-chart-yellow', '#f9bd2b'),
        cssVar('--nb-chart-red', '#db3707'),
        '#7c8798', '#c85ce8', '#3fbfae', '#7f9dff', '#ff8a52', '#e0b64a'
    ];
}

// Konturlu, sert köşeli ipucu balonu — arayüzün geri kalanıyla aynı dil.
function getChartTooltipStyle() {
    return {
        backgroundColor: getChartSurfaceColor(),
        titleColor: getChartTextColor(),
        bodyColor: getChartTextColor(),
        borderColor: getChartEdgeColor(),
        borderWidth: 2,
        cornerRadius: 4,
        padding: 12,
        titleFont: { size: 14, family: "'Inter', sans-serif", weight: '700' },
        bodyFont: { size: 13, family: "'Inter', sans-serif" },
        boxPadding: 6,
        usePointStyle: true
    };
}

async function loadCharts() {
    try {
        const trendUrl = currentTrendProduct ? `/reports/trend?productId=${currentTrendProduct}` : '/reports/trend';

        const [trendData, categoryData, topProductsData, moveData, prodDataRaw] = await Promise.all([
            apiRequest(trendUrl, 'GET'),
            apiRequest('/reports/by-category', 'GET'),
            apiRequest('/reports/top-products', 'GET'),
            apiRequest('/reports/movement-summary', 'GET'),
            apiRequest('/products?pageSize=10000', 'GET')
        ]);


        lastTrendData = trendData || [];
        lastCategoryData = categoryData || [];
        lastTopProductsData = topProductsData || [];
        lastMovementData = moveData || { giris: 0, cikis: 0, transfer: 0 };
        allProductsForExcel = prodDataRaw?.items || prodDataRaw || [];

        const filterSelect = document.getElementById("trendProductFilter");
        if (filterSelect && filterSelect.options.length <= 1) {
            allProductsForExcel.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.id; // Doğru alan (ID)
                opt.textContent = `[${p.barcode}] ${p.name}`;
                filterSelect.appendChild(opt);
            });
        }



        renderTrendChart(lastTrendData);
        renderCategoryChart(lastCategoryData);
        renderTopProductsChart(lastTopProductsData);
        renderMovementSummaryChart(lastMovementData);
    } catch (error) {
        console.error("Rapor grafikleri yüklenemedi:", error);
    }
}

document.getElementById("trendProductFilter")?.addEventListener("change", async (e) => {
    currentTrendProduct = e.target.value;
    loadCharts();
});

// Son 30 Gün Stok Hareket Trend grafiğini çizer
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();
    const gridColor = getChartGridColor();

    const labels = [];
    const girisData = [];
    const cikisData = [];
    const transferData = [];

    const numDays = 90;
    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayMonthStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        labels.push(dayMonthStr);

        const match = data.find(x => {
            const xDate = new Date(x.tarih || x.Date);
            return xDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) === dayMonthStr;
        });

        girisData.push(match ? (match.girisMiktari || match.GirisMiktari || 0) : 0);
        cikisData.push(match ? (match.cikisMiktari || match.CikisMiktari || 0) : 0);
        transferData.push(match ? (match.transferMiktari || match.TransferMiktari || 0) : 0);
    }

    if (trendChartInstance) trendChartInstance.destroy();

    const ctx2d = ctx.getContext('2d');
    
    // Dynamically adjust inner container width based on days so they don't squish
    const innerWrapper = document.querySelector('.trend-inner');
    if (innerWrapper) {
        innerWrapper.style.minWidth = (numDays * 30) + 'px'; // 30px per day
    }

    const moveColors = getMovementColors();

    const makeFill = (color) => {
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 450);
        gradient.addColorStop(0, withAlpha(color, 0.35));
        gradient.addColorStop(1, withAlpha(color, 0.0));
        return gradient;
    };

    const gradientGiris = makeFill(moveColors.giris);
    const gradientCikis = makeFill(moveColors.cikis);
    const gradientTransfer = makeFill(moveColors.transfer);

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: ' Stok Girişi',
                    data: girisData,
                    borderColor: moveColors.giris,
                    backgroundColor: gradientGiris,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: moveColors.giris
                },
                {
                    label: ' Stok Çıkışı',
                    data: cikisData,
                    borderColor: moveColors.cikis,
                    backgroundColor: gradientCikis,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: moveColors.cikis
                },
                {
                    label: ' Transfer',
                    data: transferData,
                    borderColor: moveColors.transfer,
                    backgroundColor: gradientTransfer,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: moveColors.transfer
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top', align: 'end',
                    labels: { color: textColor, padding: 25, usePointStyle: true, boxWidth: 8, font: { family: "'Inter', sans-serif", weight: '600' } }
                },
                tooltip: getChartTooltipStyle()
            },
            scales: {
                x: { ticks: { color: textColor, maxRotation: 45, minRotation: 0, font: { family: "'Inter', sans-serif" } }, grid: { display: false } },
                y: { grace: '10%', ticks: { color: textColor, font: { family: "'Inter', sans-serif" }, padding: 10 }, grid: { color: gridColor, drawBorder: false, borderDash: [5, 5] }, beginAtZero: true }
            }
        }
    });
}

// Stok işlemlerinin (Giriş/Çıkış/Transfer) dağılımını tıklanabilir pasta grafik olarak çizer
function renderMovementSummaryChart(data) {
    const ctx = document.getElementById('movementSummaryChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();
    const moveColors = getMovementColors();

    if (movementSummaryChartInstance) movementSummaryChartInstance.destroy();

    const giris = data.Giris || data.giris || 0;
    const cikis = data.Cikis || data.cikis || 0;
    const transfer = data.Transfer || data.transfer || 0;

    const filtreKodlari = ['GIRIS', 'CIKIS', 'TRANSFER'];

    movementSummaryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Stok Girişi', 'Stok Çıkışı', 'Transfer'],
            datasets: [{
                data: [giris, cikis, transfer],
                backgroundColor: [moveColors.giris, moveColors.cikis, moveColors.transfer],
                borderWidth: 2,
                borderColor: getChartEdgeColor(),
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Fare grafiğin üzerindeyken el işareti (pointer) yapması için gereken kod:
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const secilenFiltre = filtreKodlari[index];

                    // Panel penceresi yerinde kalsın; hareketler kendi penceresinde açılsın
                    uygulamaAc(`movements.html?filter=${secilenFiltre}`, 'Stok Hareketleri');
                }
            },

            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, padding: 15 } },
                tooltip: Object.assign(getChartTooltipStyle(), {
                    callbacks: {
                        afterLabel: function (context) {
                            return ' (Filtrelemek için tıkla)';
                        }
                    }
                })
            }
        }
    });

    // Grafiğin en sağından (en güncel tarih) başlamasını sağla
    setTimeout(() => {
        const slider = document.getElementById('trendWrapper');
        if (slider) slider.scrollLeft = slider.scrollWidth;
    }, 100);
}

function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const textColor = getChartTextColor();

    const gecerliVeri = data.filter(d => d.toplamStok > 0);

    const generateColors = (count) => {
        const palette = getCategoricalPalette();
        const bg = [];
        for (let i = 0; i < count; i++) {
            bg.push(palette[i % palette.length]);
        }
        return bg;
    };

    if (categoryChartInstance) categoryChartInstance.destroy();

    if (gecerliVeri.length === 0) return;

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: gecerliVeri.map(d => d.kategoriAdi),
            datasets: [{
                data: gecerliVeri.map(d => d.toplamStok),
                backgroundColor: generateColors(gecerliVeri.length),
                borderWidth: 2,
                borderColor: getChartEdgeColor(),
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            // Fare grafiğin üzerindeyken el işareti (pointer) yapması için gereken kod:
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const kategoriAdi = gecerliVeri[index].kategoriAdi;
                    uygulamaAc(`products.html?search=${encodeURIComponent(kategoriAdi)}`, 'Ürünler');
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 15,
                        font: { family: "'Inter', sans-serif", size: 12 }
                    }
                },
                tooltip: Object.assign(getChartTooltipStyle(), {
                    callbacks: {
                        afterLabel: function (context) {
                            return ' (Filtrelemek için tıkla)';
                        }
                    }
                })
            }
        }
    });
}

// En Çok Hareket Gören 7 Ürünü Çizer
function renderTopProductsChart(data) {
    try {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const textColor = getChartTextColor();
        const gridColor = getChartGridColor();
        const moveColors = getMovementColors();

        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
        }

        const safeData = (Array.isArray(data) && data.length > 0) ? data.slice(0, 7) : [];
        if (safeData.length === 0) return;

        topProductsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: safeData.map(d => d.urunAdi || d.UrunAdi || d.barkod || "İsimsiz Ürün"),
                datasets: [
                    {
                        label: ' Stok Girişi',
                        data: safeData.map(d => d.girisMiktari || d.GirisMiktari || 0),
                        backgroundColor: moveColors.giris,
                        barPercentage: 0.65,
                        categoryPercentage: 0.85,
                        maxBarThickness: 40,
                        borderRadius: 3
                    },
                    {
                        label: ' Stok Çıkışı',
                        data: safeData.map(d => d.cikisMiktari || d.CikisMiktari || 0),
                        backgroundColor: moveColors.cikis,
                        barPercentage: 0.65,
                        categoryPercentage: 0.85,
                        maxBarThickness: 40,
                        borderRadius: 3
                    },
                    {
                        label: ' Transfer',
                        data: safeData.map(d => d.transferMiktari || d.TransferMiktari || 0),
                        backgroundColor: moveColors.transfer,
                        barPercentage: 0.65,
                        categoryPercentage: 0.85,
                        maxBarThickness: 40,
                        borderRadius: 3
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { left: 5, right: 30, top: 10, bottom: 10 }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: textColor, padding: 25, usePointStyle: true, font: { size: 12, family: "'Inter', sans-serif" } }
                    },
                    tooltip: Object.assign(getChartTooltipStyle(), {
                        mode: 'y',
                        intersect: true,
                        callbacks: {
                            footer: function (items) {
                                let total = items.reduce((sum, item) => sum + item.raw, 0);
                                return '\nToplam Hareket: ' + total + ' Adet';
                            }
                        },
                        footerColor: getChartTextColor(),
                        footerFont: { weight: 'bold', size: 13, family: "'Inter', sans-serif" }
                    })
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: gridColor, borderDash: [4, 4] },
                        ticks: { color: textColor, font: { size: 12 } },
                        beginAtZero: true
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            autoSkip: false,
                            padding: 12,
                            font: { size: 12, family: "'Inter', sans-serif", weight: '500' }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Grafik çizilirken hata oluştu:", error);
    }
}

async function exportDashboardAsPdf() {
    const target = document.getElementById('dashboardExportArea');
    const btn = document.getElementById('btnExportPdf');
    if (!target || !btn) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Hazırlanıyor...';

    try {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const tempHeader = document.createElement("div");
        const titleEl = document.createElement("h1");
        titleEl.textContent = "StockFlow - Detaylı Kontrol Paneli Raporu";
        titleEl.style.setProperty("color", isDark ? "#fff" : "#000");
        titleEl.style.setProperty("font-weight", "bold");
        titleEl.style.setProperty("margin-bottom", "5px");

        const dateEl = document.createElement("p");
        dateEl.textContent = "Tarih: " + new Date().toLocaleString('tr-TR');
        dateEl.style.setProperty("color", "gray");
        dateEl.style.setProperty("margin-bottom", "20px");

        tempHeader.appendChild(titleEl);
        tempHeader.appendChild(dateEl);
        target.insertBefore(tempHeader, target.firstChild);

        // Koyu temada rapor zemini arayüzün zeminiyle aynı jetondan gelir.
        const pdfBgHex = isDark ? cssVar('--nb-canvas', '#16181f') : '#ffffff';

        const sourceCanvas = await html2canvas(target, {
            backgroundColor: pdfBgHex,
            scale: 2
        });

        target.removeChild(tempHeader);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const margin = 10;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        const pxPerMm = sourceCanvas.width / contentWidth;

        let renderedPx = 0;
        let pageIndex = 0;
        while (renderedPx < sourceCanvas.height) {
            const topOffset = margin;
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

            if (isDark) {
                const bg = hexToRgb(pdfBgHex, [22, 24, 31]);
                pdf.setFillColor(bg[0], bg[1], bg[2]);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            }

            const sliceHeightMm = sliceHeightPx / pxPerMm;
            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, topOffset, contentWidth, sliceHeightMm);

            renderedPx += sliceHeightPx;
            pageIndex++;
        }

        pdf.save(`StockFlow_Rapor_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
        hataGoster("PDF oluşturma hatası: " + error.message)
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function exportDashboardAsExcel() {
    if (typeof XLSX === 'undefined') {
        hataGoster("Excel kütüphanesi yüklenemedi!" )
        return;
    }

    const btn = document.getElementById('btnExportCsv');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Excel Hazırlanıyor...';

    try {
        const wb = XLSX.utils.book_new();

        const borderStyle = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        };
        const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0D6EFD" } }, alignment: { horizontal: "center" }, border: borderStyle };
        const cellStyle = { alignment: { horizontal: "center" }, border: borderStyle };
        const leftAlignStyle = { alignment: { horizontal: "left" }, border: borderStyle };

        function addSheetWithStyles(wb, sheetName, dataArray, colWidths) {
            const ws = XLSX.utils.json_to_sheet(dataArray);
            const range = XLSX.utils.decode_range(ws['!ref']);

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!ws[cellRef]) continue;
                    let isText = typeof ws[cellRef].v === 'string';
                    ws[cellRef].s = R === 0 ? headerStyle : (isText ? leftAlignStyle : cellStyle);
                }
            }
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        const envanterVerisi = allProductsForExcel.map(p => ({
            "Sistem ID": p.id,
            "Ürün Adı": p.name,
            "Barkod": p.barcode,
            "Kategori": p.categoryName || "-",
            "Mevcut Stok": p.stockQuantity,
            "Kritik Eşik": p.minStockLevel
        }));
        addSheetWithStyles(wb, "1. Tüm Ürünler ve Stoklar", envanterVerisi, [{ wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }]);

        const kritikVerisi = envanterVerisi.filter(p => p["Mevcut Stok"] <= p["Kritik Eşik"]);
        addSheetWithStyles(wb, "2. Kritik Stok Uyarıları", kritikVerisi, [{ wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }]);

        const kategoriVerisi = lastCategoryData.map(d => ({
            "Kategori Adı": d.kategoriAdi,
            "Toplam Stok": d.toplamStok
        }));
        addSheetWithStyles(wb, "3. Kategori Dağılımı", kategoriVerisi, [{ wch: 30 }, { wch: 20 }]);

        const trendVerisi = lastTrendData.map(d => ({
            "Tarih": new Date(d.tarih || d.Date).toLocaleDateString('tr-TR'),
            "Giriş Miktarı": d.girisMiktari || d.GirisMiktari || 0,
            "Çıkış Miktarı": d.cikisMiktari || d.CikisMiktari || 0,
            "Transfer Miktarı": d.transferMiktari || d.TransferMiktari || 0
        }));
        addSheetWithStyles(wb, "4. Günlük Hareket Trendi", trendVerisi, [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]);

        XLSX.writeFile(wb, `StockFlow_Analiz_${new Date().toISOString().slice(0, 10)}.xlsx`);

    } catch (error) {
        hataGoster("Excel raporu oluşturulurken hata: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
// --- Drag to Scroll for Trend Chart ---
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('trendWrapper');
    if (!slider) return;
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll-fast factor
        slider.scrollLeft = scrollLeft - walk;
    });
});
