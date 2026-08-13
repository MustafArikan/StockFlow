const API_URL = `${CONFIG.API_BASE_URL}/suppliers`;
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

let tumTedarikciler = [];
const tabloGovdesi = document.getElementById("tedarikciTablosuGovdesi");

const supplierView = createDataView({
    containerId: "tedarikciTablosuGovdesi",
    paginationContainerId: "paginationContainer",
    mode: 'table',
    emptyColspan: 6,
    emptyMessage: "Kayıt bulunamadı.",
    searchFields: ['name', 'contactName', 'contactPhone', 'taxNumber', 'id'],
    defaultSortKey: 'id',
    defaultSortDir: 'desc',
    pageSize: 10,
    renderRow: (t) => {
        const duzenlenebilir = hasPermission("Supplier.Edit");
        const silinebilir = hasPermission("Supplier.Delete");
        let aksiyon = "";
        aksiyon += `<button class="btn btn-sm btn-outline-info rounded-pill btn-goruntule me-1" data-id="${t.id}">Görüntüle</button>`;
        if (duzenlenebilir) aksiyon += `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle me-1" data-id="${t.id}">Düzenle</button>`;
        if (silinebilir) aksiyon += `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${t.id}">Sil</button>`;
        const aksiyonTd = `<td class="text-end">${aksiyon}</td>`;
        return `
            <tr>
                <td class="fw-bold text-muted small">${tarihFormatla(t.createdAt)}</td>
                <td class="fw-bold">${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.contactName) || '<span class="text-muted">-</span>'}</td>
                <td>${escapeHtml(t.contactPhone) || '<span class="text-muted">-</span>'}</td>
                <td>${escapeHtml(t.taxNumber) || '<span class="text-muted">-</span>'}</td>
                ${aksiyonTd}
            </tr>`;
    }
});

document.getElementById("thId")?.addEventListener("click", () => supplierView.setSort("id"));
document.getElementById("thAd")?.addEventListener("click", () => supplierView.setSort("name"));

document.getElementById("aramaKutusu")?.addEventListener("input", (e) => {
    supplierView.setSearch(e.target.value);
});

document.getElementById("siralamaTedarikci")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "TARIH_YENI") supplierView.setSortState("id", "desc");
    else if (val === "TARIH_ESKI") supplierView.setSortState("id", "asc");
    else if (val === "Z_A") supplierView.setSortState("name", "desc");
    else supplierView.setSortState("name", "asc");
});

document.getElementById("btnFiltreleriTemizle")?.addEventListener("click", () => {
    const aramaKutu = document.getElementById("aramaKutusu");
    if (aramaKutu) aramaKutu.value = "";
    
    const siralama = document.getElementById("siralamaTedarikci");
    if (siralama) siralama.value = "TARIH_YENI";
    
    supplierView.setSearch("");
    supplierView.setSortState("id", "desc");
});

async function tedarikcileriYukle() {
    try {

        const cevap = await fetch(API_URL, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';

            return;
        }
        if (!cevap.ok) throw new Error("Sunucu hatası: " + cevap.status);

        const sonuc = await cevap.json();
        tumTedarikciler = sonuc.items || sonuc; // GET /suppliers düz dizi döner
        supplierView.setItems(tumTedarikciler);
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Tedarikçiler yüklenemedi. (${escapeHtml(hata.message)})</td></tr>`;
        const p = document.getElementById("paginationContainer");
        if (p) p.innerHTML = "";
    }
}

// tabloyuCiz motora taşındı

// ---- Ekle / Düzenle (kaydet) ----
document.getElementById("btnTedarikciKaydet")?.addEventListener("click", async () => {
    const id = document.getElementById("tedarikciId").value;
    const name = document.getElementById("tedarikciAdi").value.trim();
    const btn = document.getElementById("btnTedarikciKaydet");

    if (!name) { uyariGoster("Lütfen tedarikçi adı girin!"); return; }

    const veri = {
        name: name,
        contactName: document.getElementById("tedarikciIlgiliKisi").value.trim() || null,
        contactPhone: document.getElementById("tedarikciTelefon").value.trim() || null,
        contactEmail: document.getElementById("tedarikciEposta").value.trim() || null,
        address: document.getElementById("tedarikciAdres").value.trim() || null,
        taxNumber: document.getElementById("tedarikciVergiNo").value.trim() || null
    };

    if (veri.contactPhone && !window.isValidPhone(veri.contactPhone)) {
        uyariGoster("Geçerli bir telefon numarası giriniz! (Örn: 0555 555 55 55)");
        return;
    }

    const metod = id ? "PUT" : "POST";
    const adres = id ? `${API_URL}/${id}` : API_URL;

    try {
        btn.disabled = true;
        btn.innerText = "Kaydediliyor...";

        const cevap = await fetch(adres, {
            method: metod,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(veri)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }
        if (!cevap.ok) throw new Error(await cevap.text() || "İşlem başarısız.");

        bootstrap.Modal.getInstance(document.getElementById("tedarikciModal"))?.hide();
        document.getElementById("tedarikciFormu").reset();
        document.getElementById("tedarikciId").value = "";

        aktifArama = "";
        const aramaKutusu = document.getElementById("aramaKutusu");
        if (aramaKutusu) aramaKutusu.value = "";

        basariToast(id ? "Tedarikçi güncellendi" : "Tedarikçi eklendi");
        tedarikcileriYukle();
    } catch (hata) {
        hataGoster("İşlem başarısız: " + hata.message);
    } finally {
        btn.disabled = false;
        btn.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    }
});

function tedarikciDuzenle(id) {
    const t = tumTedarikciler.find(x => x.id === id);
    if (!t) return;

    document.getElementById("tedarikciId").value = t.id;
    document.getElementById("tedarikciAdi").value = t.name || "";
    document.getElementById("tedarikciIlgiliKisi").value = t.contactName || "";
    document.getElementById("tedarikciTelefon").value = t.contactPhone || "";
    document.getElementById("tedarikciEposta").value = t.contactEmail || "";
    document.getElementById("tedarikciAdres").value = t.address || "";
    document.getElementById("tedarikciVergiNo").value = t.taxNumber || "";

    document.getElementById("modalBaslik").innerText = "Tedarikçi Düzenle";
    document.getElementById("btnTedarikciKaydet").innerText = "Güncelle";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("tedarikciModal")).show();
}

async function tedarikciSil(id) {
    if (!(await onayla("Bu tedarikçi kalıcı olarak silinecek.", "Evet, sil"))) return;
    try {
        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }
        if (!cevap.ok) throw new Error("Silme başarısız.");
        
        basariToast("Tedarikçi silindi");
        tedarikcileriYukle();
    } catch (hata) {
        hataGoster("Tedarikçi silinemedi: " + hata.message);
    }
}

//tedarikçi ürünleri görüntüle
async function tedarikciUrunleriniGoster(supplierId) {
    const tablo = document.getElementById("tedarikciUrunListesi");

    const t = tumTedarikciler.find(x => x.id === supplierId);
    if(t) document.getElementById("tedarikciUrunModalBaslik").textContent = t.name + " — Ürünleri";
    try{
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/suppliers/${supplierId}/products`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Ürünler Yüklenemedi.");
        
        const liste = await cevap.json();
        tablo.innerHTML = "";

        bootstrap.Modal.getOrCreateInstance(document.getElementById("tedarikciUrunModal")).show();

        if (liste.length === 0) { 
            tablo.innerHTML = `<tr><td colspan="3" class="text-muted fst-italic">Bu tedarikçiye ait ürün yok.</td></tr>`; return;
        }

        liste.forEach(sp => {
            tablo.innerHTML += `<tr>
                <td class="fw-semibold">
                    <a href="#" class="urun-detay-link" data-pid="${sp.productId}">${escapeHtml(sp.productName)}</a>
                </td>
                <td class="text-muted small">${escapeHtml(sp.productBarcode)}</td>
                <td>${sp.purchasePrice != null ? sp.purchasePrice + ' ₺' : '-'}</td>
            </tr>`;         
        });

        

    }catch(hata){
        tablo.innerHTML = `<tr><td colspan="3" class="text-danger">${hata.message}</td></tr>`;
    }
    
}



//

// Tablo içi Düzenle/Sil (event delegation)
tabloGovdesi?.addEventListener("click", (e) => {
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");
    const btnGoruntule = e.target.closest(".btn-goruntule");


    if (btnDuzenle) tedarikciDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) tedarikciSil(parseInt(btnSil.getAttribute("data-id")));
    else if (btnGoruntule) tedarikciUrunleriniGoster(parseInt(btnGoruntule.getAttribute("data-id")));

});

document.getElementById("tedarikciUrunListesi").addEventListener("click", (e) => {
    const link = e.target.closest(".urun-detay-link");
    if (!link) return;
    e.preventDefault();
    urunDetayAc(parseInt(link.getAttribute("data-pid")));
});

// "Yeni Tedarikçi Ekle" modalı açılırken formu sıfırla
document.querySelector('[data-bs-target="#tedarikciModal"]')?.addEventListener("click", () => {
    document.getElementById("tedarikciFormu").reset();
    document.getElementById("tedarikciId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Tedarikçi Ekle";
    document.getElementById("btnTedarikciKaydet").innerText = "Ekle ve Kaydet";
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadAuthContext();
    // Yetkiye göre buton/kolon gizleme
    if (!hasPermission("Supplier.Add")) {
        document.querySelector('[data-bs-target="#tedarikciModal"]')?.classList.add('d-none');
    }

    tedarikcileriYukle();
});
