/**
 * Modül 4: Stok Hareketleri Yönetimi
 * Açıklama: Ön yüz tablosunun dinamik çizimi, filtreleme, arama ve 
 * anlık veri ekleme/düzenleme işlemlerini yönetir.
 */

// 1. LOKAL VERİ SETİ 
let stokHareketleri = [
    { id: 1, tarih: "29.06.2026 10:15", kod: "VGA-4090", ad: "NVIDIA GeForce RTX 4090 24GB", tip: "GIRIS", adet: 15, personel: "admin@godeva.com.tr" },
    { id: 2, tarih: "29.06.2026 11:30", kod: "CPU-7800", ad: "AMD Ryzen 7 7800X3D İşlemci", tip: "CIKIS", adet: 3, personel: "operator@godeva.com.tr" },
    { id: 3, tarih: "29.06.2026 14:00", kod: "RAM-C32", ad: "Corsair Vengeance 32GB DDR5", tip: "GIRIS", adet: 50, personel: "admin@godeva.com.tr" },
    { id: 4, tarih: "28.06.2026 09:20", kod: "SSD-1TB", ad: "Samsung 990 PRO 1TB M.2", tip: "CIKIS", adet: 10, personel: "hamit@godeva.com.tr" }
];

// DOM Element Referansları
const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

// 2. TABLO ÇİZİM MOTORU
function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = ""; // Mevcut tabloyu temizle

    veriListesi.forEach(hareket => {
        // İşlem tipine göre görsel renklendirmeler (GIRIS / CIKIS)
        let tipEtiketi = hareket.tip === "GIRIS"
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>`
            : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;

        let adetRengi = hareket.tip === "GIRIS" ? "text-success" : "text-danger";
        let adetIsareti = hareket.tip === "GIRIS" ? "+" : "-";

        // HTML Satır Şablonu
        let satir = `
            <tr>
                <td class="text-muted small">${hareket.tarih}</td>
                <td class="fw-bold">${hareket.kod}</td>
                <td>${hareket.ad}</td>
                <td>${tipEtiketi}</td>
                <td class="fw-bold ${adetRengi}">${adetIsareti}${hareket.adet}</td>
                <td class="small">${hareket.personel}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="islemDuzenle(${hareket.id})">Düzenle</button>
                </td>
            </tr>
        `;
        tabloGovdesi.innerHTML += satir;
    });
}

// Sayfa yüklendiğinde varsayılan verileri ekrana bas
tabloyuCiz(stokHareketleri);

// 3. FİLTRELEME VE ARAMA DİNLEYİCİLERİ (GIRIS ve CIKIS'a göre filtreler)
document.getElementById("btnTumu").addEventListener("click", () => tabloyuCiz(stokHareketleri));
document.getElementById("btnGirisler").addEventListener("click", () => tabloyuCiz(stokHareketleri.filter(x => x.tip === "GIRIS")));
document.getElementById("btnCikislar").addEventListener("click", () => tabloyuCiz(stokHareketleri.filter(x => x.tip === "CIKIS")));

aramaKutusu.addEventListener("keyup", (event) => {
    let arananKelime = event.target.value.toLowerCase();
    const filtrelenmisVeri = stokHareketleri.filter(x =>
        x.ad.toLowerCase().includes(arananKelime) ||
        x.kod.toLowerCase().includes(arananKelime) ||
        x.personel.toLowerCase().includes(arananKelime)
    );
    tabloyuCiz(filtrelenmisVeri);
});

// 4. MODAL SIFIRLAMA (Yeni Kayıt İçin)
document.querySelector('[data-bs-target="#stokIslemModal"]').addEventListener("click", () => {
    document.getElementById("modalBaslik").innerText = "Yeni Stok İşlemi";
    document.getElementById("hareketId").value = "";
    document.getElementById("islemAdedi").value = "";
    document.getElementById("islemTipi").value = "GIRIS"; // Yeni kayıt varsayılanı GIRIS olsun 
    document.getElementById("btnKaydet").innerText = "Ekle ve Onayla";
});

// 5. KAYIT DÜZENLEME (Forma Veri Taşıma)
function islemDuzenle(id) {
    const kayit = stokHareketleri.find(x => x.id === id);

    document.getElementById("hareketId").value = kayit.id;
    document.getElementById("islemTipi").value = kayit.tip;
    document.getElementById("urunSecimi").value = kayit.kod;
    document.getElementById("islemAdedi").value = kayit.adet;

    document.getElementById("btnKaydet").innerText = "Düzenle ve Onayla";

    document.getElementById("modalBaslik").innerText = "İşlemi Düzenle";

    // Bootstrap Modal API'si ile pencereyi programatik olarak aç
    const modalElement = document.getElementById('stokIslemModal');
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

// 6. KAYDET BUTONU (Ekleme / Güncelleme Karar Mekanizması)
document.getElementById("btnKaydet").addEventListener("click", () => {
    const islemTipi = document.getElementById("islemTipi").value;
    const islemAdedi = document.getElementById("islemAdedi").value;
    const urunSecici = document.getElementById("urunSecimi");
    const urunKodu = urunSecici.value;
    const urunAdi = urunSecici.options[urunSecici.selectedIndex].text;

    const gizliId = document.getElementById("hareketId").value;

    // Basit Validasyon (Doğrulama)
    if (!islemAdedi || islemAdedi <= 0) {
        alert("Lütfen geçerli bir adet girin!");
        return;
    }

    if (gizliId) {
        // GÜNCELLEME İŞLEMİ
        let mevcutKayit = stokHareketleri.find(x => x.id == gizliId);
        mevcutKayit.tip = islemTipi;
        mevcutKayit.kod = urunKodu;
        mevcutKayit.ad = urunAdi;
        mevcutKayit.adet = parseInt(islemAdedi);
    } else {
        // YENİ EKLEME İŞLEMİ
        const yeniHareket = {
            id: Date.now(),
            tarih: new Date().toLocaleString("tr-TR").slice(0, 16),
            kod: urunKodu,
            ad: urunAdi,
            tip: islemTipi,
            adet: parseInt(islemAdedi),
            personel: "aktif.kullanici@godeva.com.tr"
        };
        stokHareketleri.unshift(yeniHareket);
    }

    // Tabloyu yeni verilerle baştan çiz
    tabloyuCiz(stokHareketleri);

    // İşlem bitince Bootstrap Modal'ını kapat
    const modalElement = document.getElementById('stokIslemModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) { modalInstance.hide(); }
});