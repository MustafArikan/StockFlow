document.addEventListener("DOMContentLoaded", async () => {
    // 1. DataViewEngine Kurulumu (Listeleme için)
    const palletView = new PaginationList({
        apiEndpoint: '/pallets',
        tableBodyId: "paletTablosuGovdesi",
        paginationContainerId: "paginationContainer",
        emptyColspan: 4,
        emptyMessage: "Kayıtlı palet bulunamadı.",
        searchFields: ['sscc', 'description'],
        defaultSortKey: 'createdAt',
        defaultSortDir: 'desc'
    });

    palletView.renderRow = (pallet) => {
        const date = new Date(pallet.createdAt).toLocaleDateString('tr-TR');
        return `
            <tr style="cursor: pointer" onclick="openPalletDetails('${pallet.sscc}', false)">
                <td class="fw-semibold text-primary"><i class="bi bi-upc-scan me-2"></i>${escapeHtml(pallet.sscc || '-')}</td>
                <td>${escapeHtml(pallet.warehouse || '-')}</td>
                <td>${escapeHtml(pallet.description || '-')}</td>
                <td class="text-muted small">${date}</td>
            </tr>
        `;
    };

    // Arama kutusu bağlantısı
    document.getElementById("aramaKutusu")?.addEventListener("input", (e) => {
        palletView.setSearch(e.target.value);
    });
    document.getElementById("btnFiltreleriTemizle")?.addEventListener("click", () => {
        document.getElementById("aramaKutusu").value = "";
        palletView.setSearch("");
    });

    // PENCEREYE TAŞINAN MODALLAR KAYDI
    if (window.ModalWindow) {
        ModalWindow.register({
            paletDetayModal: 'Palet Detayı'
        });

        ModalWindow.formBoot({
            modal: 'paletDetayModal',
            load: (id, params) => {
                // Modal parametrelerle açıldığında (örneğin barkod okutularak veya listeden tıklanarak)
                if (params && params.sscc) {
                    openPalletDetails(params.sscc, false, true); // true = modal zaten açık, sadece veriyi çek
                } else if (params && params.barcode) {
                    openPalletDetails(params.barcode, true, true);
                }
            }
        });
    }

    // Modal pencere kipi DEĞİLSE listeyi yükle
    if (!(window.ModalWindow && ModalWindow.isFormWindow)) {
        await palletView.load(1);
    }
});

// Detay Açma Fonksiyonu (Hem sscc hem barcode destekler)
async function openPalletDetails(code, isBarcode = false, isAlreadyModal = false) {
    const errorDiv = document.getElementById('palletError');
    const detailsDiv = document.getElementById('palletDetails');
    const loadingDiv = document.getElementById('palletLoading');
    const contentsTable = document.getElementById('palletContentsTable');
    
    // UI Reset
    errorDiv.classList.add('d-none');
    detailsDiv.classList.add('d-none');
    contentsTable.innerHTML = '';

    // Modalı aç (eğer form boot üzerinden tetiklenmemişse)
    let modalInstance = null;
    if (!isAlreadyModal) {
        const modalEl = document.getElementById('paletDetayModal');
        if (modalEl) {
            // window.ModalWindow varsa ondan aç, yoksa normal bootstrap modal
            if (window.ModalWindow && typeof window.ModalWindow.open === 'function') {
                const paramKey = isBarcode ? 'barcode' : 'sscc';
                const params = {};
                params[paramKey] = code;
                ModalWindow.open('paletDetayModal', params, 'Palet Detayı', { page: 'pallets.html' });
                return; // ModalWindow yükleyip geri dönecek, bu yüzden burada kesiyoruz
            } else {
                modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                modalInstance.show();
            }
        }
    }

    loadingDiv.classList.remove('d-none');

    try {
        let response;
        if (isBarcode) {
            response = await apiRequest(`/pallets/by-barcode/${encodeURIComponent(code)}`, 'GET');
        } else {
            response = await apiRequest(`/pallets/by-sscc/${encodeURIComponent(code)}`, 'GET');
        }
        
        document.getElementById('lblSscc').textContent = response.sscc || '-';
        document.getElementById('lblWarehouse').textContent = response.warehouse || '-';
        document.getElementById('lblDescription').textContent = response.description || '-';

        if (response.contents && response.contents.length > 0) {
            contentsTable.innerHTML = response.contents.map(c => `
                <tr>
                    <td class="px-4 fw-medium text-nowrap">${escapeHtml(c.productCode || '-')}</td>
                    <td>${escapeHtml(c.productName || '-')}</td>
                    <td>${escapeHtml(c.batchNumber || '-')}</td>
                    <td class="text-end px-4 fw-bold">${c.quantity}</td>
                </tr>
            `).join('');
        } else {
            contentsTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Bu palet boş.</td></tr>`;
        }

        loadingDiv.classList.add('d-none');
        detailsDiv.classList.remove('d-none');

    } catch (err) {
        loadingDiv.classList.add('d-none');
        errorDiv.textContent = err.message || "Palet bilgileri alınırken bir hata oluştu.";
        errorDiv.classList.remove('d-none');
    }
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
