const API_URL = `${CONFIG.API_BASE_URL}/suppliers`;
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

let tumTedarikciler = [];
let filtreliTedarikciler = [];
const tabloGovdesi = document.getElementById("tedarikciTablosuGovdesi");
let currentPage = 1;
const pageSize = 10;
let aktifArama = '';
let siralamaSutunu = 'id';
let siralamaYonu = 'asc';


function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ---- Liste + arama + sıralama + sayfalama ----
function veriyiGuncelle() {
    const q = aktifArama.trim().toLowerCase();

    filtreliTedarikciler = tumTedarikciler.filter(t => {
        if (!q) return true;
        return (t.name && t.name.toLowerCase().includes(q)) ||
               (t.contactName && t.contactName.toLowerCase().includes(q)) ||
               (t.contactPhone && t.contactPhone.toLowerCase().includes(q)) ||
               (t.taxNumber && t.taxNumber.toString().toLowerCase().includes(q)) ||
               (t.id && t.id.toString().includes(q));
    });

    filtreliTedarikciler.sort((a, b) => {
        let dA = a[siralamaSutunu] != null ? a[siralamaSutunu] : '';
        let dB = b[siralamaSutunu] != null ? b[siralamaSutunu] : '';
        if (typeof dA === 'string') {
            return siralamaYonu === 'asc' ? dA.localeCompare(dB) : dB.localeCompare(dA);
        }
        return siralamaYonu === 'asc' ? dA - dB : dB - dA;
    });

    const toplamSayfa = Math.ceil(filtreliTedarikciler.length / pageSize) || 1;
    if (currentPage > toplamSayfa) currentPage = toplamSayfa;

    const bas = (currentPage - 1) * pageSize;
    const sayfadaki = filtreliTedarikciler.slice(bas, bas + pageSize);

    tabloyuCiz(sayfadaki);
    sayfalamayiCiz(toplamSayfa, currentPage);
}

function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }
    veriyiGuncelle();
}

document.getElementById("thId")?.addEventListener("click", () => sirala("id"));
document.getElementById("thAd")?.addEventListener("click", () => sirala("name"));

document.getElementById("aramaKutusu")?.addEventListener("keyup", (e) => {
    aktifArama = e.target.value;
    currentPage = 1;
    veriyiGuncelle();
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
        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Tedarikçiler yüklenemedi. (${escapeHtml(hata.message)})</td></tr>`;
        const p = document.getElementById("paginationContainer");
        if (p) p.innerHTML = "";
    }
}

function tabloyuCiz(liste) {
    tabloGovdesi.innerHTML = "";

    if (!liste.length) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    const duzenlenebilir = hasPermission("Supplier.Edit");
    const silinebilir = hasPermission("Supplier.Delete");

    let html = "";
    liste.forEach(t => {
        let aksiyon = "";
        aksiyon += `<button class="btn btn-sm btn-outline-info rounded-pill btn-goruntule me-1" data-id="${t.id}">Görüntüle</button>`;
        if (duzenlenebilir) aksiyon += `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle me-1" data-id="${t.id}">Düzenle</button>`;
        if (silinebilir) aksiyon += `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${t.id}">Sil</button>`;
        

        const aksiyonTd = (duzenlenebilir || silinebilir) ? `<td class="text-end">${aksiyon}</td>` : "";

        html += `
            <tr>
                <td class="fw-bold text-muted small">${t.id}</td>
                <td class="fw-bold">${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.contactName) || '<span class="text-muted">-</span>'}</td>
                <td>${escapeHtml(t.contactPhone) || '<span class="text-muted">-</span>'}</td>
                <td>${escapeHtml(t.taxNumber) || '<span class="text-muted">-</span>'}</td>
                ${aksiyonTd}
            </tr>`;
    });
    tabloGovdesi.innerHTML = html;
}

function sayfalamayiCiz(totalPages, currentPage) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

document.getElementById("paginationContainer")?.addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".page-action");
    if (!btn) return;
    const li = btn.closest(".page-item");
    if (li && (li.classList.contains("disabled") || li.classList.contains("active"))) return;
    const page = parseInt(btn.getAttribute("data-page"));
    if (!isNaN(page)) { currentPage = page; veriyiGuncelle(); }
});

// ---- Ekle / Düzenle (kaydet) ----
document.getElementById("btnTedarikciKaydet")?.addEventListener("click", async () => {
    const id = document.getElementById("tedarikciId").value;
    const name = document.getElementById("tedarikciAdi").value.trim();
    const btn = document.getElementById("btnTedarikciKaydet");

    if (!name) { alert("Lütfen tedarikçi adı girin!"); return; }

    const veri = {
        name: name,
        contactName: document.getElementById("tedarikciIlgiliKisi").value.trim() || null,
        contactPhone: document.getElementById("tedarikciTelefon").value.trim() || null,
        contactEmail: document.getElementById("tedarikciEposta").value.trim() || null,
        address: document.getElementById("tedarikciAdres").value.trim() || null,
        taxNumber: document.getElementById("tedarikciVergiNo").value.trim() || null
    };

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

        tedarikcileriYukle();
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
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
    if (!confirm("Bu tedarikçiyi silmek istediğinize emin misiniz?")) return;
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
        tedarikcileriYukle();
    } catch (hata) {
        alert("Tedarikçi silinemedi: " + hata.message);
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

// Yetkiye göre buton/kolon gizleme
if (!hasPermission("Supplier.Add")) {
    document.querySelector('[data-bs-target="#tedarikciModal"]')?.classList.add('d-none');
}
if (!hasPermission("Supplier.Edit") && !hasPermission("Supplier.Delete")) {
    document.getElementById("islemSutunuBasligi")?.classList.add('d-none');
}

tedarikcileriYukle();
