function renderUrunDetay(urun){
    return `
    <div class="modal fade" id="urunDetayModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div class="modal-header bg-gradient-primary text-white border-bottom-0 pb-4 pt-4 position-relative">
                    <div class="position-absolute top-0 end-0 p-3">
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Kapat"></button>
                    </div>
                    <div class="d-flex align-items-center w-100 mt-2">
                        <div class="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center shadow product-detail-icon">
                            <i class="bi bi-box-seam"></i>
                        </div>
                        <div class="ms-3">
                            <h4 class="modal-title fw-bold mb-0">${escapeHtml(urun.name)}</h4>
                            <span class="badge bg-white text-dark mt-1">${escapeHtml(urun.categoryName)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-body p-4 bg-light">
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Barkod</small>
                                <div class="fw-bold fs-6 mt-1 text-dark">${escapeHtml(urun.barcode)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Sistem ID</small>
                                <div class="fw-bold fs-6 mt-1 text-dark">#${urun.id}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Mevcut Stok</small>
                                <div class="fw-bold fs-5 mt-1">${urun.stockQuantity}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Min. Stok</small>
                                <div class="fw-bold fs-6 mt-1 text-dark">${urun.minStockLevel}</div>
                            </div>
                        </div>

                        <h6 class="fw-bold text-secondary text-uppercase small mb-3 border-bottom pb-2">Ürün Özellikleri (Kurallar)</h6>
                        <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                            <table class="table table-sm table-borderless mb-0">
                                ${urun.attributes && urun.attributes.length > 0
                                    ? urun.attributes.map(attr => `
                                        <tr>
                                            <td class="text-muted fw-bold w-40">${escapeHtml(attr.key)}</td>
                                            <td class="text-dark fw-semibold">${escapeHtml(attr.value)}</td>
                                        </tr>`).join('')
                                    : `<tr><td class="text-muted fst-italic">Özel nitelik (kural) bulunamadı.</td></tr>`
                                }
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    `;
}


async function urunDetayAc(productId){
    const token = localStorage.getItem('token');

const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}`, {
    headers: { "Authorization": `Bearer ${token}` }
});

    if (!cevap.ok) {
        hataGoster("Ürün bilgisi alınamadı. ") 
        return; 
    }

    const urun = await cevap.json();

    let kap = document.getElementById("urunDetayKap");
    if(!kap){
        kap = document.createElement("div");
        kap.id = "urunDetayKap";
        document.body.appendChild(kap);
    }

    kap.innerHTML = renderUrunDetay(urun);

    new bootstrap.Modal(document.getElementById("urunDetayModal")).show();


    
}