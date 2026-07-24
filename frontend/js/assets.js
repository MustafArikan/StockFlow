let currentAssetId = null;
const userRole = typeof getUserRole === "function" ? getUserRole() : "User";
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

document.getElementById('btnSearchAsset').addEventListener('click', searchAsset);
document.getElementById('serialSearchInput').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') searchAsset();
});

// Sayfa açıldığında dropdown için ürünleri yükle
loadProductsForDropdown();
loadUsersForDropdown();

// Buton dinleyicilerini ekle (CSP Uyumlu)
document.getElementById('btnSubmitCreateAsset').addEventListener('click', submitCreateAsset);
document.getElementById('btnSubmitAssign').addEventListener('click', submitAssignAsset);
document.getElementById('btnSubmitReturn').addEventListener('click', submitReturnAsset);
document.getElementById('btnSubmitBreakdown').addEventListener('click', submitBreakdown);
document.getElementById('btnSubmitResolve').addEventListener('click', submitResolve);
document.getElementById('btnSubmitMaintenance').addEventListener('click', submitMaintenance);

async function loadProductsForDropdown() {
    const token = localStorage.getItem('token');
    try {
        const data = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');

        const select = document.getElementById('newAssetProduct');
        select.innerHTML = '<option value="">-- Bir Ürün Seçin --</option>';

        if (data.items && data.items.length > 0) {
            data.items.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (Stok: ${p.stockQuantity})</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Kayıtlı ürün bulunamadı!</option>';
        }
    } catch (e) {
        console.error("Ürünler yüklenirken hata:", e);
    }
}

async function loadUsersForDropdown() {
    const token = localStorage.getItem('token');
    try {
        const users = await apiRequest('/users', 'GET');

        const select = document.getElementById('assignUserSelect');
        select.innerHTML = '<option value="">-- Personel Seçin --</option>';

        if (users && users.length > 0) {
            users.forEach(u => {
                const fname = u.firstName || u.FirstName || "";
                const lname = u.lastName || u.LastName || "";
                const email = u.email || u.Email || "Bilinmiyor";
                let displayName = `${fname} ${lname}`.trim();
                if (!displayName) displayName = email; // İsim yoksa E-posta göster

                const id = u.id || u.Id;
                select.innerHTML += `<option value="${id}">${escapeHtml(displayName)}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Personel bulunamadı!</option>';
        }
    } catch (e) {
        console.error("Personeller yüklenirken hata:", e);
    }
}

async function searchAsset() {
    const serial = document.getElementById('serialSearchInput').value.trim();
    if (!serial) return;

    try {
        const data = await apiRequest(`/assets/${encodeURIComponent(serial)}/timeline`, 'GET');
        currentAssetId = data.assetInfo.id;

        document.getElementById('assetResultContainer').classList.remove('d-none');
        // 1. Cihaz Profilini Doldur
        document.getElementById('resProductName').textContent = data.assetInfo.productName;
        document.getElementById('resSerialNumber').textContent = data.assetInfo.serialNumber;
        document.getElementById('resStatus').textContent = data.assetInfo.status;
        if (data.assetInfo.nextMaintenanceDate) {
            document.getElementById('resStatus').innerHTML += `<br><small class="text-info"><i class="bi bi-calendar-event"></i> Sonraki Bakım: ${new Date(data.assetInfo.nextMaintenanceDate).toLocaleDateString('tr-TR')}</small>`;
        }

        document.getElementById('resAssignedTo').textContent = data.assetInfo.assignedTo;

        // 2. Timeline (Zaman Çizelgesini) Çiz
        const timelineUl = document.getElementById('assetTimelineList');
        timelineUl.innerHTML = ''; // Önce temizle

        if (data.timeline && data.timeline.length > 0) {
            data.timeline.forEach(event => {
                // Etkinlik tipine göre timeline nokta rengini ve ikonunu belirle
                let dotClass = "dot-primary";
                let iconHtml = '<i class="bi bi-info-circle text-primary"></i>';

                if (event.eventType === "Sisteme Giriş") {
                    dotClass = "dot-success";
                    iconHtml = '<i class="bi bi-box-arrow-in-right text-success"></i>';
                } else if (event.eventType === "Zimmetlendi") {
                    dotClass = "dot-warning";
                    iconHtml = '<i class="bi bi-person-check text-warning"></i>';
                } else if (event.eventType === "Arıza" || event.eventType === "Servis") {
                    dotClass = "dot-danger";
                    iconHtml = '<i class="bi bi-tools text-danger"></i>';
                }

                // Tarihi formatla
                const dateString = event.date ? new Date(event.date).toLocaleString('tr-TR') : "Tarih Yok";

                const li = document.createElement('li');
                li.className = `timeline-item ${dotClass}`;
                li.innerHTML = `
                    <div class="timeline-content">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="fw-bold fs-6">${iconHtml} ${escapeHtml(event.eventType)}</span>
                            <span class="text-muted small"><i class="bi bi-calendar3"></i> ${dateString}</span>
                        </div>
                        <p class="mb-0 text-secondary">${escapeHtml(event.notes || "Açıklama bulunmuyor.")}</p>
                        <div class="mt-2 text-end">
                            <small class="text-muted fst-italic"><i class="bi bi-person-fill"></i> İşlem: ${escapeHtml(event.userName)}</small>
                        </div>
                    </div>
                `;
                timelineUl.appendChild(li);
            });
        } else {
            timelineUl.innerHTML = '<li class="text-muted fst-italic">Geçmiş kaydı bulunamadı.</li>';
        }

        // Sonuç alanını göster, input'u temizle
        document.getElementById('assetResultContainer').classList.remove('d-none');
        document.getElementById('serialSearchInput').value = '';

    } catch (error) {
        alert(error.message);
        document.getElementById('assetResultContainer').classList.add('d-none');
    }
}

// XSS Koruması için yardımcı fonksiyon
function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function submitAssignAsset() {
    if (!currentAssetId) return;
    const userId = document.getElementById('assignUserSelect').value;
    const notes = document.getElementById('assignNotes').value;
    if (!userId) return alert("Lütfen zimmetlenecek personeli seçin!");

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/assign`, 'PUT', {
        userId: parseInt(userId),
        notes: notes
    });
}

async function submitReturnAsset() {
    if (!currentAssetId) return;
    const notes = document.getElementById('returnNotes').value;
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/return`, 'PUT', { notes });
}

async function submitBreakdown() {
    if (!currentAssetId) return;
    const description = document.getElementById('breakdownDesc').value;
    if (!description) return alert("Lütfen arıza açıklamasını yazın!");
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/breakdown`, 'POST', { description });
}

async function submitResolve() {
    if (!currentAssetId) return;
    const solution = document.getElementById('resolveSolution').value;
    if (!solution) return alert("Lütfen çözüm detaylarını yazın!");
    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/resolve`, 'POST', { solution });
}

async function submitMaintenance() {
    if (!currentAssetId) return;
    const details = document.getElementById('maintenanceDetails').value;
    const nextDate = document.getElementById('maintenanceNextDate').value;
    if (!details) return alert("Lütfen yapılan bakımın detaylarını girin!");

    const payload = { details };
    if (nextDate) payload.nextMaintenanceDate = new Date(nextDate).toISOString();

    await sendAssetAction(`${CONFIG.API_BASE_URL}/assets/${currentAssetId}/maintenance`, 'POST', payload);
}

// Tüm Butonlar İçin Ortak Backend İletişim Fonksiyonu
async function sendAssetAction(url, method, body) {
    try {
        const endpoint = url.replace(CONFIG.API_BASE_URL, '');
        const result = await apiRequest(endpoint, method, body) || {};

        // Açık olan modal penceresini kapat
        document.querySelectorAll('.modal').forEach(m => {
            const modalInstance = bootstrap.Modal.getInstance(m);
            if (modalInstance) modalInstance.hide();
        });

        // Form alanlarını temizle
        document.querySelectorAll('textarea, input[type="date"]').forEach(el => el.value = '');

        // Ekrana başarı mesajı ver ve Timeline'ı (Zaman çizelgesini) güncelle!
        alert("Harika! " + (result.message || "İşlem başarıyla tamamlandı."));
        searchAsset();

    } catch (e) {
        alert("Bağlantı hatası: " + e.message);
    }
}

// YENİ DEMİRBAŞ OLUŞTURMA FONKSİYONU
async function submitCreateAsset() {
    const productId = document.getElementById('newAssetProduct').value;
    const serialNumber = document.getElementById('newAssetSerial').value.trim();
    const notes = document.getElementById('newAssetNotes').value.trim();

    if (!productId || !serialNumber) {
        return alert("Lütfen Ürün seçin ve Seri Numarası girin!");
    }

    try {
        const result = await apiRequest('/assets', 'POST', {
            productId: parseInt(productId),
            serialNumber: serialNumber,
            notes: notes
        }) || {};

        alert("Harika! Yeni Demirbaş başarıyla sisteme kaydedildi.");

        // Modalı kapat
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('createAssetModal'));
        if (modalInstance) modalInstance.hide();

        // Formu temizle
        document.getElementById('newAssetProduct').value = '';
        document.getElementById('newAssetSerial').value = '';
        document.getElementById('newAssetNotes').value = '';

        // Cihazı otomatik olarak ara ve ekranda göster!
        document.getElementById('serialSearchInput').value = serialNumber;
        searchAsset();

    } catch (e) {
        alert("Bağlantı hatası: " + e.message);
    }
}

// ==========================================
// TÜM EKİPMANLARI (CİHAZLARI) LİSTELEME MOTORU
// ==========================================
async function loadAllAssetsList() {
    const tbody = document.getElementById('allAssetsTableBody');
    // API isteği atılana kadar kullanıcıya yükleniyor animasyonu gösterilir
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Kayıtlar aranıyor...</td></tr>';

    try {
        // Backend'deki GetAllAssets metoduna istek atılarak tüm cihazlar çekilir
        const response = await apiRequest('/assets?pageNumber=1&pageSize=1000', 'GET');
        const assets = response.assets || response; // API'nin dönüş tipine göre güvenli yakalama

        if (!assets || assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Sistemde henüz kayıtlı hiçbir ekipman bulunmuyor.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; // Yükleniyor yazısını temizle

        assets.forEach(a => {
            // Durum bilgisini kullanıcının anlayacağı dilde renklendirerek rozet (badge) yapıyoruz
            let statusBadge = '<span class="badge bg-secondary">Bilinmiyor</span>';
            if (a.status === 'Available') statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success">Müsait (Boşta)</span>';
            else if (a.status === 'In Use') statusBadge = '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary">Kullanımda</span>';
            else if (a.status === 'Broken') statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">Arızalı</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 fw-bold font-monospace">${escapeHtml(a.serialNumber)}</td>
                <td class="fw-semibold">${escapeHtml(a.productName)}</td>
                <td>${statusBadge}</td>
                <td class="text-muted"><i class="bi bi-person-circle me-1"></i> ${escapeHtml(a.assignedToName)}</td>
                <td class="pe-4 text-end">
                    <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm btn-select-asset" data-serial="${escapeHtml(a.serialNumber)}">
                        İncele <i class="bi bi-arrow-right"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // "İncele" butonlarına tıklama olayı (Event Delegation mantığı ile)
        document.querySelectorAll('.btn-select-asset').forEach(btn => {
            btn.addEventListener('click', function () {
                const serial = this.getAttribute('data-serial');

                // Seçim yapıldıktan sonra açık olan listeleme modalı kapatılır
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('allAssetsListModal'));
                if (modalInstance) modalInstance.hide();

                // Unutulan seri numarası arama kutusuna otomatik yazılır ve sorgu tetiklenir!
                document.getElementById('serialSearchInput').value = serial;
                searchAsset();
            });
        });

    } catch (error) {
        // Herhangi bir sunucu hatasında sistem çökmez, tabloya hata mesajı basılır
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Veriler çekilirken hata oluştu: ${error.message}</td></tr>`;
    }
}