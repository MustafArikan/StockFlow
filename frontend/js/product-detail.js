let aktifDetayUrunId = null;
function renderUrunDetay(urun, secenekler ={}){
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
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Tarih</small>
                                <div class="fw-bold fs-6 mt-1 text-dark">${tarihFormatla(urun.createdAt)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                                <small class="text-muted text-uppercase fw-bold fs-07rem">Mevcut Stok</small>
                                <div class="fw-bold fs-5 mt-1 ${urun.stockQuantity <= urun.minStockLevel ? 'text-danger' : 'text-success'}">${urun.stockQuantity}</div>
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
                                    ? urun.attributes.map(attr => {
                                        let val = attr.value;
                                        if (val === "true" || val === true) val = "Var";
                                        if (val === "false" || val === false) val = "Yok";
                                        return `
                                        <tr>
                                            <td class="text-muted fw-bold w-40">${escapeHtml(attr.key)}</td>
                                            <td class="text-dark fw-semibold">${escapeHtml(val)}</td>    
                                        </tr>`;
                                    }).join('')
                                    : `<tr><td class="text-muted fst-italic">Özel nitelik (kural) bulunamadı.</td></tr>`
                                }
                            </table>
                        </div>

                        <h6 class="fw-bold text-secondary text-uppercase small mb-3 border-bottom pb-2"> Tedarikçiler</h6>
                        <div class="bg-white p-3 rounded-3 shadow-sm border border-light">
                            <table class="table table-sm table-borderless mb-0" id="detayTedarikciListesi">
                                <tr><td class="text-muted fst-italic">Tedarikçi bulunamadı.</td></tr>
                            </table>
                            ${secenekler.tedarikciYonetimi ? `
                                <div class="d-flex gap-3 mb-3 align-items-center">
                                    <div class="flex-grow-1">
                                        <select class="form-select mb-2" id="detayTedarikciSelect">
                                            <option value="">Tedarikçi seçin...</option>
                                        </select>
                                        <input type="number" class="form-control" id="detayTedarikciFiyat" placeholder="Alış Fiyatı" min="0">
                                    </div>
                                        <button type="button" id="btnDetayTedarikciEkle" class="btn btn-primary w-25 rounded-pill py-2 fw-bold">Bağla</button>
                                </div>`:""}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    `;
}


async function urunDetayAc(productId, secenekler = {}){
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

    kap.innerHTML = renderUrunDetay(urun, secenekler);
    aktifDetayUrunId = productId;
    detayTedarkciYukle(productId, secenekler.tedarikciYonetimi);                        
    if (secenekler.tedarikciYonetimi) tedarikciSecenekleriniYukle();
    
    new bootstrap.Modal(document.getElementById("urunDetayModal")).show();


    
}

async function detayTedarkciYukle(productId, yonetim = false) {
    const tablo = document.getElementById("detayTedarikciListesi");
    try{
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}/suppliers`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı.");
        
        const liste = await cevap.json();
        tablo.innerHTML = "";

        if (liste.length === 0) { 
            tablo.innerHTML = `<tr><td class="text-muted fst-italic">Bu ürüne bağlı tedarikçi yok.</td></tr>`; return; 
        }

        liste.forEach(ps => {
            tablo.innerHTML += `<tr><td class="fw-semibold">${escapeHtml(ps.supplierName)}</td>
                <td class="text-muted small">${ps.purchasePrice != null ? ps.purchasePrice + ' ₺' : '-'}</td>
                ${yonetim ? `<td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill btn-tedarikci-kaldir" data-sid="${ps.supplierId}">Kaldır</button>
                </td>` : ""}
            </tr>`;
                
        });
    }catch(hata) {
        tablo.innerHTML = `<tr><td class="text-danger">${hata.message}</td></tr>`;

    }
}


async function tedarikciSecenekleriniYukle () {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/suppliers?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı.");

        const data = await cevap.json();
        const tedarikciler = data.items || data;
        const select = document.getElementById("detayTedarikciSelect");

        if (select) {
            select.innerHTML = '<option value="">Tedarikçi seçin...</option>';
            tedarikciler.forEach(tedarikci => {
                const option = document.createElement("option");
                option.value = tedarikci.id;
                option.textContent = tedarikci.name;
                select.appendChild(option);
            });
        }
    } catch (hata) {
        console.error("Tedarikçi dropdown yükleme hatası:", hata);
        const select = document.getElementById("detayTedarikciSelect");
        if(select) select.innerHTML = '<option value="" disabled>Yüklenemedi!</option>';
    }
}

document.addEventListener("click", async (e) => {
    if (e.target.closest("#btnDetayTedarikciEkle")) {
            const supplierId = document.getElementById("detayTedarikciSelect").value;
            const fiyat = document.getElementById("detayTedarikciFiyat").value;
            
            if (!supplierId) {
                uyariGoster("Lütfen tedarikçi seçin."); 
                return;
            }
            const veri ={
                supplierId: parseInt(supplierId),
                purchasePrice: fiyat ? parseFloat(fiyat): null,
                supplierProductCode: null,
                leadTimeDays: null,
                isPreferred: false
            };
            try{
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${aktifDetayUrunId}/suppliers`, {
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(veri)
            });

            if(!cevap.ok) throw new Error(await cevap.text() || "Bağlama başarısız.");

            detayTedarkciYukle(aktifDetayUrunId, true);
            document.getElementById("detayTedarikciSelect").value = "";
            document.getElementById("detayTedarikciFiyat").value  = "";

            }catch(hata){
                hataGoster("Hata: " + hata.message);
            }
        };
    const kaldirBtn = e.target.closest(".btn-tedarikci-kaldir");
    if (kaldirBtn) {
            if (!(await onayla("Bu tedarikçi bağını kaldırmak istiyor musunuz?", "Evet, kaldır"))) return;
            const sid = kaldirBtn.getAttribute("data-sid");
            try{
                const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${aktifDetayUrunId}/suppliers/${sid}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (!cevap.ok) throw new Error("Silme başarısız.");
                detayTedarkciYukle(aktifDetayUrunId, true);
            } catch (hata) {
                hataGoster("Tedarikçi silinemedi: " + hata.message);
            }

        }

    
});