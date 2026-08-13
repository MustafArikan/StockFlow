let aktifDetayUrunId = null;

async function urunDetayAc(productId, secenekler = {}) {
    // Modal markup'ı sayfada yoksa (ör. tedarikçiler ekranı) buraya eklenir.
    // Eskiden bu kontrol yoktu; modal bulunmayan sayfalarda getElementById(...)
    // null dönüp "Cannot set properties of null" hatasıyla işlem kırılıyordu.
    if (typeof ensureProductDetailModal === 'function') {
        ensureProductDetailModal();
    }
    if (!document.getElementById('urunDetayModal')) {
        hataGoster('Ürün detay penceresi yüklenemedi. Lütfen sayfayı yenileyin.');
        return;
    }

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
    let featuredAttrs = [];
    let tumKurallar = [];
    try {
        const kuralCevap = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${urun.categoryId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (kuralCevap.ok) {
            tumKurallar = await kuralCevap.json();
            featuredAttrs = tumKurallar
                .filter(k => k.isFeatured)
                .sort((a, b) => a.displayOrder - b.displayOrder);
        }
    } catch (e) {
        console.warn("Nitelik kuralları alınamadı:", e);
    }

    renderFeaturedAttributeCards(featuredAttrs, urun.attributes || []);

    // --- DOM MANİPÜLASYONLARI (XSS KORUMALI) ---

    // 1. Sekme: Temel Bilgiler
    document.getElementById("detayUrunAdi").textContent = urun.name;
    if (document.getElementById("detayKategoriAdi")) document.getElementById("detayKategoriAdi").textContent = urun.categoryName;
    if (document.getElementById("detayUrunModeli")) document.getElementById("detayUrunModeli").textContent = "Belirtilmemiş";
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
        const kuralSirasi = new Map(tumKurallar.map(k => [k.attributeKey, k.displayOrder]));
        const siraliAttrs = [...urun.attributes].sort(
            (a, b) => (kuralSirasi.get(a.key) ?? 999) - (kuralSirasi.get(b.key) ?? 999)
        );

        ozelliklerListesi.innerHTML = siraliAttrs.map(attr => {
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

    // 6. Sekme: Paketleme Birimleri
    const paketlemeListesi = document.getElementById("detayPaketlemeListesi");
    if (paketlemeListesi) {
        const birimler = urun.unitConversions || [];
        if (birimler.length > 0) {
            paketlemeListesi.innerHTML = birimler.map(b => `
                <div class="col-12 col-md-6">
                    <button type="button"
                            class="btn btn-outline-secondary w-100 h-100 text-start p-3 rounded-4 d-flex align-items-center gap-3 paketleme-birim-btn"
                            data-conversion-id="${escapeHtml(String(b.id))}">
                        <i class="bi bi-upc-scan fs-3 text-secondary"></i>
                        <span class="flex-grow-1">
                            <span class="d-block fw-bold text-dark">${escapeHtml(b.alternativeUnitName)}</span>
                            <span class="d-block small text-muted">1 ${escapeHtml(b.alternativeUnitShortCode)} = ${escapeHtml(String(b.conversionFactor))} ${escapeHtml(urun.unitShortCode || '')}</span>
                            <span class="d-block small text-secondary font-monospace">${b.barcode ? escapeHtml(b.barcode) : 'Barkod atanmamış'}</span>
                        </span>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </button>
                </div>`).join('');
        } else {
            paketlemeListesi.innerHTML = `<div class="col-12 text-center text-muted fst-italic py-4">Bu ürün için tanımlı koli/kutu birimi bulunmuyor.</div>`;
        }
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
    if (!tablo) return;

    // Token buradan okunur. Eskiden başka bir sayfa scriptinin (products.js,
    // suppliers.js ...) tanımladığı global `token` değişkenine yaslanıyordu;
    // o script yüklenmeyen bir sayfada ReferenceError veriyordu.
    const token = localStorage.getItem('token');

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

function renderFeaturedAttributeCards(featuredAttrs, urunAttrleri) {
    const kapsayici = document.getElementById("detayOneCikanNitelikler");
    if (!kapsayici) return;

    if (featuredAttrs.length === 0) {
        kapsayici.innerHTML = "";
        kapsayici.classList.add("d-none");
        return;
    }

    kapsayici.classList.remove("d-none");
    kapsayici.innerHTML = featuredAttrs.map(kural => {
        const bulunan = urunAttrleri.find(a => a.key === kural.attributeKey);
        const deger = bulunan ? bulunan.value : "Belirtilmemiş";
        return `
        <div class="col-12 col-md-6">
            <div class="bg-secondary bg-opacity-10 text-secondary p-4 rounded-4 h-100 border border-secondary border-opacity-25 d-flex flex-column justify-content-center">
                <small class="text-uppercase fw-bold opacity-75 mb-1">${escapeHtml(kural.attributeKey)}</small>
                <div class="fs-4 fw-bold">${escapeHtml(String(deger))}</div>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.paketleme-birim-btn');
    if (!btn) return;
    const conversionId = parseInt(btn.getAttribute('data-conversion-id'));
    if (typeof paketlemeDetayAc === 'function') {
        paketlemeDetayAc(aktifDetayUrunId, conversionId);
    }
});

async function paketlemeDetayAc(productId, conversionId) {
    if (typeof ensurePackagingDetailModal === 'function') ensurePackagingDetailModal();
    if (!document.getElementById('paketlemeDetayModal')) return;

    const token = localStorage.getItem('token');
    let birimler;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}/unit-conversions`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Paketleme bilgisi alınamadı.");
        birimler = await cevap.json();
    } catch (e) {
        hataGoster(e.message);
        return;
    }

    const birim = birimler.find(b => b.id === conversionId);
    if (!birim) { hataGoster("Paketleme birimi bulunamadı."); return; }

    document.getElementById("paketDetayBaslik").textContent = birim.alternativeUnitName;
    document.getElementById("paketDetayBarkodMetni").textContent = birim.barcode || "Barkod atanmamış";
    document.getElementById("paketDetayBarkodTipi").textContent = birim.barcodeType || "Bilinmiyor";
    document.getElementById("paketDetayBirimAdi").textContent = `${birim.alternativeUnitName} (${birim.alternativeUnitShortCode})`;
    document.getElementById("paketDetayCevrim").textContent = String(birim.conversionFactor);
    document.getElementById("paketDetayVarsayilan").textContent = birim.isDefault ? "Evet" : "Hayır";

    const urunAdiEl = document.getElementById("detayUrunAdi");
    document.getElementById("paketDetayUrunAdi").textContent = urunAdiEl ? urunAdiEl.textContent : "-";

    const gorselKapsayici = document.getElementById("paketDetayBarkodGorseli");
    gorselKapsayici.innerHTML = "";
    if (birim.barcode && typeof JsBarcode === 'function') {
        // SVG yerine Canvas kullanıp base64 image'a çeviriyoruz ki JsBarcode içine inline style atmasın
        const canvas = document.createElement("canvas");
        try {
            JsBarcode(canvas, birim.barcode, { format: "CODE128", displayValue: false, height: 60 });
            const img = document.createElement("img");
            img.src = canvas.toDataURL("image/png");
            gorselKapsayici.appendChild(img);
        } catch (e) {
            gorselKapsayici.textContent = "Barkod görseli oluşturulamadı.";
        }
    }

    new bootstrap.Modal(document.getElementById("paketlemeDetayModal")).show();
}

if (typeof window !== 'undefined') {
    window.paketlemeDetayAc = paketlemeDetayAc;
}
