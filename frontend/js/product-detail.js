let aktifDetayUrunId = null;

async function urunDetayAc(productId, secenekler = {}) {
    const token = localStorage.getItem('token');

    // Ürün temel bilgilerini çek
    let urun;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Ürün bilgisi alınamadı.");
        urun = await cevap.json();
    } catch(e) {
        hataGoster(e.message);
        return;
    }

    // Ürün stok/depo seviyelerini çek
    let stokBilgileri = [];
    try {
        const stokCevap = await fetch(`${CONFIG.API_BASE_URL}/stock-levels/by-product/${productId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (stokCevap.ok) {
            stokBilgileri = await stokCevap.json();
        }
    } catch(e) {
        console.warn("Stok detayları alınamadı:", e);
    }

    // Ürün stok hareketlerini çek
    let stokHareketleri = [];
    try {
        const hareketlerCevap = await fetch(`${CONFIG.API_BASE_URL}/stock/movements/product/${productId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (hareketlerCevap.ok) {
            stokHareketleri = await hareketlerCevap.json();
        }
    } catch (e) {
        console.warn("Stok hareketleri alınamadı:", e);
    }

    aktifDetayUrunId = productId;
    
    // Model Bilgisini Çıkarma
    let urunModeli = "Belirtilmemiş";
    if (urun.attributes && urun.attributes.length > 0) {
        const modelAttr = urun.attributes.find(a => a.key.toLowerCase().includes('model'));
        if (modelAttr) urunModeli = modelAttr.value;
    }

    // --- DOM MANİPÜLASYONLARI (XSS KORUMALI) ---

    // 1. Sekme: Temel Bilgiler
    document.getElementById("detayUrunAdi").textContent = urun.name;
    document.getElementById("detayKategoriAdi").textContent = urun.categoryName;
    document.getElementById("detayUrunModeli").textContent = urunModeli;
    document.getElementById("detayBarkod").textContent = urun.barcode;
    document.getElementById("detayTarih").textContent = tarihFormatla(urun.createdAt);
    
    const mevcutStokElem = document.getElementById("detayMevcutStok");
    const mevcutStokIcon = document.getElementById("detayMevcutStokIcon");
    mevcutStokElem.textContent = urun.stockQuantity;
    
    if (urun.stockQuantity <= urun.minStockLevel) {
        mevcutStokElem.className = "fw-bold fs-3 mt-1 text-danger";
        mevcutStokIcon.className = "bi bi-boxes fs-3 mb-2 text-danger";
    } else {
        mevcutStokElem.className = "fw-bold fs-3 mt-1 text-success";
        mevcutStokIcon.className = "bi bi-boxes fs-3 mb-2 text-success";
    }
    document.getElementById("detayMinStok").textContent = urun.minStockLevel;

    // 2. Sekme: Özellikler
    const ozelliklerListesi = document.getElementById("detayOzelliklerListesi");
    if (urun.attributes && urun.attributes.length > 0) {
        ozelliklerListesi.innerHTML = urun.attributes.map(attr => {
            let val = attr.value;
            if (val === "true" || val === true) val = "Var";
            if (val === "false" || val === false) val = "Yok";
            return `
            <tr>
                <td class="text-muted fw-bold w-50">${escapeHtml(attr.key)}</td>
                <td class="text-dark fw-semibold">${escapeHtml(val.toString())}</td>    
            </tr>`;
        }).join('');
    } else {
        ozelliklerListesi.innerHTML = `<tr><td colspan="2" class="text-center text-muted fst-italic py-3">Özel nitelik (kural) bulunamadı.</td></tr>`;
    }

    // 4. Sekme: Stok Dağılımı
    const stokListesi = document.getElementById("detayStokDagitimListesi");
    const stokFooter = document.getElementById("detayStokDagitimFooter");
    if (stokBilgileri && stokBilgileri.length > 0) {
        stokListesi.innerHTML = stokBilgileri.map(stok => `
            <tr>
                <td class="fw-semibold text-dark">${escapeHtml(stok.warehouseName)}</td>
                <td class="text-secondary">${escapeHtml(stok.locationCode)}</td>    
                <td class="text-end fw-bold text-primary fs-6">${escapeHtml(stok.quantity.toString())}</td>    
            </tr>`).join('');
        
        stokFooter.classList.remove("d-none");
        document.getElementById("detayGenelToplamStok").textContent = urun.stockQuantity;
    } else {
        stokListesi.innerHTML = `<tr><td colspan="3" class="text-muted fst-italic text-center py-4">Bu ürün için stok kaydı bulunamadı.</td></tr>`;
        stokFooter.classList.add("d-none");
    }

    // 5. Sekme: Stok Hareketleri
    const hareketlerListesi = document.getElementById("detayStokHareketleriListesi");
    if (stokHareketleri && stokHareketleri.length > 0) {
        hareketlerListesi.innerHTML = stokHareketleri.map(h => {
            let badgeClass = h.movementType === 'IN' ? 'bg-success' : (h.movementType === 'OUT' ? 'bg-danger' : 'bg-info');
            let typeText = h.movementType === 'IN' ? 'Giriş' : (h.movementType === 'OUT' ? 'Çıkış' : 'Transfer');
            let miktarPrefix = h.movementType === 'OUT' ? '-' : '+';
            if (h.movementType === 'TRANSFER') miktarPrefix = '';

            return `
            <tr>
                <td class="text-muted small fw-semibold">${tarihFormatla(h.date)}</td>
                <td><span class="badge ${badgeClass} rounded-pill px-3">${typeText}</span></td>    
                <td class="fw-bold">${miktarPrefix}${h.quantity}</td>    
                <td class="small text-secondary fw-semibold">${escapeHtml(h.personel)}</td>    
                <td class="small text-muted text-break" title="${escapeHtml(h.description || '')}">${escapeHtml(h.description || '-')}</td>    
            </tr>`;
        }).join('');
    } else {
        hareketlerListesi.innerHTML = `<tr><td colspan="5" class="text-muted fst-italic text-center py-4">Bu ürün için henüz stok hareketi bulunmuyor.</td></tr>`;
    }

    // 3. Sekme: Tedarikçi Yönetimi Alanlarını Göster/Gizle (Sadece Görüntüleme)
    const tedarikciIslemBasligi = document.getElementById("detayTedarikciIslemSutunuBasligi");
    if (tedarikciIslemBasligi) {
        tedarikciIslemBasligi.classList.add("d-none"); // Her zaman gizli
    }

    // Tedarikçi listesini çek ve tabloyu güncelle (Sadece Görüntüleme)
    detayTedarkciYukle(productId, false);                        
    
    // Modalı her açılışta 1. sekmeye (Temel Bilgiler) sıfırla
    const carousel = document.getElementById('urunDetayCarousel');
    const bsCarousel = bootstrap.Carousel.getInstance(carousel) || new bootstrap.Carousel(carousel);
    bsCarousel.to(0);
    
    // Modalı göster
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
            tablo.innerHTML = `<tr><td colspan="3" class="text-center text-muted fst-italic py-4">Bu ürüne bağlı tedarikçi bulunmamaktadır.</td></tr>`; return; 
        }

        liste.forEach(ps => {
            tablo.innerHTML += `<tr>
                <td class="fw-semibold">${escapeHtml(ps.supplierName)}</td>
                <td class="text-muted fw-bold">${ps.purchasePrice != null ? escapeHtml(ps.purchasePrice.toString()) + ' ₺' : '-'}</td>
                ${yonetim ? `<td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill btn-tedarikci-kaldir shadow-sm px-3" data-sid="${escapeHtml(ps.supplierId.toString())}">
                        <i class="bi bi-trash3 me-1"></i> Kaldır
                    </button>
                </td>` : ""}
            </tr>`;
        });
    } catch(hata) {
        tablo.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">${escapeHtml(hata.message)}</td></tr>`;
    }
}
