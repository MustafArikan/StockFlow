function buildPackagingDetailModalHtml() {
    return `
    <div class="modal fade" id="paketlemeDetayModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-md mt-5">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div class="modal-header bg-white border-bottom-0 pb-2 pt-4">
                    <h5 class="modal-title fw-bold" id="paketDetayBaslik">Paketleme Birimi</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="text-center mb-4">
                        <div id="paketDetayBarkodGorseli" class="d-flex justify-content-center mb-2"></div>
                        <div class="fw-bold font-monospace fs-5" id="paketDetayBarkodMetni">-</div>
                        <span class="badge bg-secondary" id="paketDetayBarkodTipi">-</span>
                    </div>
                    <table class="table table-sm align-middle mb-0">
                        <tbody>
                            <tr><td class="text-muted fw-bold">Birim Adı</td><td id="paketDetayBirimAdi">-</td></tr>
                            <tr><td class="text-muted fw-bold">Çevrim Katsayısı</td><td id="paketDetayCevrim">-</td></tr>
                            <tr><td class="text-muted fw-bold">Varsayılan Birim mi?</td><td id="paketDetayVarsayilan">-</td></tr>
                            <tr><td class="text-muted fw-bold">Bağlı Ürün</td><td id="paketDetayUrunAdi">-</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`;
}

function ensurePackagingDetailModal() {
    if (document.getElementById('paketlemeDetayModal')) return true;
    const kapsayici = document.createElement('div');
    kapsayici.innerHTML = buildPackagingDetailModalHtml();
    const modal = kapsayici.firstElementChild;
    if (!modal) return false;
    document.body.appendChild(modal);
    return true;
}

if (typeof window !== 'undefined') {
    window.buildPackagingDetailModalHtml = buildPackagingDetailModalHtml;
    window.ensurePackagingDetailModal = ensurePackagingDetailModal;
}
