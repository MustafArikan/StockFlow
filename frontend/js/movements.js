/**
 * Modül: Stok Hareketleri Yönetimi (Movements)
 * Geliştirici: Ekip Frontend / Sistem Entegrasyon Sorumlusu
 * Açıklama: Bu dosya, C# Web API ile haberleşerek stok hareketlerini çeker, ekler ve günceller.
 * QR Kod (Scanner) modülü ile entegre çalışır.
 */

const MAX_ISLEM_ADEDI = 100000;

// GÜVENLİK: XSS Saldırılarına karşı kullanıcı girdilerini temizler (Injection önlemi)
function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Global Değişkenler
let stokHareketleri = []; // API'den gelen veriler burada tutulacak
let aktifFiltre = 'TUMU';
let aktifArama = '';
let tarihArtan = false;

// DOM Element Referansları
const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");
const urunSecimi = document.getElementById("urunSecimi");
const kaydetButonu = document.getElementById("btnKaydet");
const islemTipi = document.getElementById("islemTipi");
const islemAdedi = document.getElementById("islemAdedi");
const hareketId = document.getElementById("hareketId");


// ==========================================
// 1. API İLETİŞİMİ (ÜRÜNLERİ VE HAREKETLERİ ÇEKME)
// ==========================================

/**
 * Görev: Backend API'den kayıtlı ürünleri çeker ve Formdaki Dropdown'u (Select) doldurur.
 */
async function formIcinUrunleriGetir() {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products`);
        if (!cevap.ok) throw new Error(`HTTP Hatası: ${cevap.status}`);

        const urunler = await cevap.json();

        // Kutunun içini temizle
        urunSecimi.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';

        // API'den gelen ürünleri döngü ile ekle (value = Barkod, Text = İsim)
        urunler.forEach(urun => {
            urunSecimi.innerHTML += `<option value="${urun.barcode}">${urun.name}</option>`;
        });
    } catch (hata) {
        console.error("Ürün listesi çekilemedi:", hata);
        urunSecimi.innerHTML = '<option value="" disabled>API Bağlantı Hatası! Backend çalışıyor mu?</option>';
    }
}

/**
 * Görev: Şu an test amaçlı LocalStorage kullanılıyor.
 * İlerleyen fazlarda burası `fetch('${CONFIG.API_BASE_URL}/stock/movements')` olarak güncellenecektir.
 */
function verileriYukle() {
    stokHareketleri = JSON.parse(localStorage.getItem('stokHareketleri')) || [];
    veriyiGuncelle();
}

function veriyiHafizayaKaydet() {
    localStorage.setItem('stokHareketleri', JSON.stringify(stokHareketleri));
}


// ==========================================
// 2. TABLO İŞLEMLERİ VE FİLTRELEME (UI RENDER)
// ==========================================
function veriyiGuncelle() {
    let filtrelenmis = [...stokHareketleri];

    // Buton Filtreleri (GIRIS / CIKIS)
    if (aktifFiltre !== 'TUMU') {
        filtrelenmis = filtrelenmis.filter(x => x.tip === aktifFiltre);
    }

    // Metin Arama Filtresi
    if (aktifArama) {
        filtrelenmis = filtrelenmis.filter(x =>
            x.ad.toLowerCase().includes(aktifArama) ||
            x.kod.toLowerCase().includes(aktifArama) ||
            x.personel.toLowerCase().includes(aktifArama)
        );
    }

    // Tarihe Göre Sıralama Algoritması
    filtrelenmis.sort((a, b) => {
        const parcala = (t) => {
            const temizTarih = t.replace(',', ''); // Hatalı virgülleri temizler
            const [gun, ay, yil] = temizTarih.split(' ')[0].split('.');
            const [saat, dakika] = temizTarih.split(' ')[1].split(':');
            return new Date(yil, ay - 1, gun, saat, dakika);
        };
        const dateA = parcala(a.tarih);
        const dateB = parcala(b.tarih);
        return tarihArtan ? dateA - dateB : dateB - dateA;
    });

    tabloyuCiz(filtrelenmis);
}

function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = "";
    if (veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    veriListesi.forEach(hareket => {
        let tipEtiketi = hareket.tip === "GIRIS" ? `<span class="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>` : `<span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;
        let adetRengi = hareket.tip === "GIRIS" ? "text-success" : "text-danger";
        let adetIsareti = hareket.tip === "GIRIS" ? "+" : "-";

        const satir = `
            <tr>
                <td class="text-muted small text-center border-end align-middle">${escapeHtml(hareket.tarih)}</td>
                <td class="fw-bold text-center border-end align-middle d-none d-md-table-cell">${escapeHtml(hareket.kod)}</td>
                <td class="border-end align-middle">${escapeHtml(hareket.ad)}</td>
                <td class="text-center border-end align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center border-end align-middle ${adetRengi}">${adetIsareti}${hareket.adet}</td>
                <td class="text-center border-end align-middle d-none d-md-table-cell">${escapeHtml(hareket.personel)}</td>               
                <td class="text-center align-middle">
                    <div class="d-flex flex-column flex-md-row gap-1 justify-content-center">
                        <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="islemDuzenle(${hareket.id})">Düzenle</button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="silIslem(${hareket.id})">Sil</button>
                    </div>
                </td>
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

// Filtreleme Dinleyicileri
document.getElementById("btnTumu").addEventListener("click", () => { aktifFiltre = 'TUMU'; aktifButonuGuncelle("btnTumu"); veriyiGuncelle(); });
document.getElementById("btnGirisler").addEventListener("click", () => { aktifFiltre = 'GIRIS'; aktifButonuGuncelle("btnGirisler"); veriyiGuncelle(); });
document.getElementById("btnCikislar").addEventListener("click", () => { aktifFiltre = 'CIKIS'; aktifButonuGuncelle("btnCikislar"); veriyiGuncelle(); });
aramaKutusu.addEventListener("keyup", (event) => { aktifArama = event.target.value.toLowerCase(); veriyiGuncelle(); });

function siralaTarih() {
    tarihArtan = !tarihArtan;
    document.getElementById("tarihBaslik").innerText = tarihArtan ? "Tarih ↑" : "Tarih ↓";
    veriyiGuncelle();
}

function aktifButonuGuncelle(aktifId) {
    document.querySelectorAll("#btnTumu, #btnGirisler, #btnCikislar").forEach(btn => {
        btn.className = btn.className.replace("btn-dark", "btn-outline-dark").replace("btn-success", "btn-outline-success").replace("btn-danger", "btn-outline-danger").replace("text-white", "");
    });
    const seciliBtn = document.getElementById(aktifId);
    if (aktifId === "btnTumu") seciliBtn.className = "btn btn-dark btn-sm rounded-pill px-3";
    if (aktifId === "btnGirisler") seciliBtn.className = "btn btn-success btn-sm rounded-pill px-3 text-white";
    if (aktifId === "btnCikislar") seciliBtn.className = "btn btn-danger btn-sm rounded-pill px-3 text-white";
}


// ==========================================
// 3. FORM DENETİMİ (DÜZENLE BUTONU KİLİDİ)
// ==========================================
/**
 * Görev: Kullanıcı formda değişiklik yapmadan "Kaydet" butonuna basamasın.
 */
function formuDenetle() {
    const tip = islemTipi.value;
    const urun = urunSecimi.value;
    const adet = islemAdedi.value;
    const gId = hareketId.value;

    // Kural 1: Tüm alanlar doldurulmuş olmalı
    if (tip === "" || urun === "" || !adet || parseInt(adet) <= 0) {
        kaydetButonu.disabled = true;
        return;
    }

    // Kural 2: Düzenleme modundaysa, veriler eskisinden farklı olmalı
    if (gId) {
        const eskiKayit = stokHareketleri.find(x => x.id == gId);
        if (eskiKayit && eskiKayit.tip === tip && eskiKayit.kod === urun && eskiKayit.adet == parseInt(adet)) {
            kaydetButonu.disabled = true; // Değişiklik yok, KİLİTLE!
        } else {
            kaydetButonu.disabled = false; // Veri değişti, AÇ!
        }
    } else {
        kaydetButonu.disabled = false; // Yeni Ekleme modu, AÇ!
    }
}

islemTipi.addEventListener("change", formuDenetle);
urunSecimi.addEventListener("change", formuDenetle);
islemAdedi.addEventListener("input", formuDenetle);


// ==========================================
// 4. BARKOD (KAMERA) ENTEGRASYONU
// ==========================================
const btnKameraAc = document.getElementById("btnKameraAc");
const btnKameraKapat = document.getElementById("btnKameraKapat");
const kameraAlani = document.getElementById("kameraAlani");

btnKameraAc.addEventListener("click", () => {

    //Okuma başladığı an diğer işlemleri engelle
    btnKameraAc.disabled = true;
    kaydetButonu.disabled = true;

    kameraAlani.classList.remove("d-none"); // Kutuyu göster

    startScanner('reader', (okunanBarkod) => {
        // Okunan verideki alt satır ve boşlukları temizler
        const temizBarkod = okunanBarkod.replace(/[\n\r]+/g, '').trim();

        // API'den gelen listede bu barkoda sahip ürün var mı?
        const secenek = Array.from(urunSecimi.options).find(o => o.value === temizBarkod);

        if (secenek) {
            urunSecimi.value = temizBarkod; // Eşleşeni Seç
            formuDenetle(); // Buton kilidini hesapla
            stopScanner(); // Donanımı kapat
            kameraAlani.classList.add("d-none");

            // İşlem bitti, kilitleri aç
            btnKameraAc.disabled = false;
            // Başarılı okuma mesajı
            // // alert("Ürün Eşleşti: " + secenek.text); 
            alert("Ürün başarıyla bulundu: " + secenek.text);
        } else {
            alert(`Sistemde eşleşen ürün bulunamadı: [${temizBarkod}]\nNot: Ürünlerin Backend'den yüklendiğinden emin olun.`);
        }
    }, (hataMesaji) => {
        // Hata fırlatıldığında (Kamera izni reddedilmesi vb. durumlarda)
        if (hataMesaji === "CAMERA_START_FAILED") {
            kameraAlani.classList.add("d-none"); // Açılamayan kameranın kutusunu gizle
        }
    });
});

btnKameraKapat.addEventListener("click", () => {
    stopScanner();
    kameraAlani.classList.add("d-none");
});

document.getElementById('stokIslemModal').addEventListener('hidden.bs.modal', () => {
    stopScanner();
    kameraAlani.classList.add("d-none");
});


// ==========================================
// 5. CRUD İŞLEMLERİ (EKLE, DÜZENLE, SİL)
// ==========================================
document.querySelector('[data-bs-target="#stokIslemModal"]').addEventListener("click", () => {
    document.getElementById("modalBaslik").innerText = "Yeni Stok İşlemi";
    hareketId.value = "";
    document.getElementById("stokIslemFormu").reset();
    kaydetButonu.innerText = "Ekle ve Onayla";
    formuDenetle();
});

// Tablodaki Mavi Düzenle Butonuna Tıklanınca
function islemDuzenle(id) {
    const kayit = stokHareketleri.find(x => x.id === id);
    hareketId.value = kayit.id;
    islemTipi.value = kayit.tip;
    urunSecimi.value = kayit.kod; // Burada dropdown'dan otomatik eşleşme yapılır
    islemAdedi.value = kayit.adet;

    kaydetButonu.innerText = "Düzenle ve Onayla";
    document.getElementById("modalBaslik").innerText = "İşlemi Düzenle";

    formuDenetle(); // Veriler aynı olduğu için Kaydet butonu kilitli başlar!
    bootstrap.Modal.getOrCreateInstance(document.getElementById('stokIslemModal')).show();
}

kaydetButonu.addEventListener("click", () => {
    const gId = hareketId.value;
    const adet = parseInt(islemAdedi.value);

    if (adet > MAX_ISLEM_ADEDI) {
        alert(`Maksimum ${MAX_ISLEM_ADEDI} adet girebilirsiniz!`); return;
    }

    if (gId) {
        // GÜNCELLEME İŞLEMİ
        let mevcutKayit = stokHareketleri.find(x => x.id == gId);
        mevcutKayit.tip = islemTipi.value;
        mevcutKayit.kod = urunSecimi.value;
        mevcutKayit.ad = urunSecimi.options[urunSecimi.selectedIndex].text.replace(/\[.*?\] /, ""); // [Barkod] kısmını temizleyip ismi alır
        mevcutKayit.adet = adet;
        mevcutKayit.duzenlendi = true;
    } else {
        // YENİ EKLEME İŞLEMİ
        stokHareketleri.unshift({
            id: Date.now(),
            tarih: new Date().toLocaleString("tr-TR").slice(0, 16),
            kod: urunSecimi.value,
            ad: urunSecimi.options[urunSecimi.selectedIndex].text.replace(/\[.*?\] /, ""),
            tip: islemTipi.value,
            adet: adet,
            personel: "aktif.kullanici@godeva.com.tr",
            duzenlendi: false
        });
    }

    veriyiHafizayaKaydet();
    veriyiGuncelle();
    bootstrap.Modal.getInstance(document.getElementById('stokIslemModal')).hide();
});

function silIslem(id) {
    if (confirm("Bu işlemi silmek istediğinizden emin misiniz?")) {
        stokHareketleri = stokHareketleri.filter(x => x.id !== id);
        veriyiHafizayaKaydet();
        veriyiGuncelle();
    }
}

// 6. UYGULAMAYI BAŞLAT
formIcinUrunleriGetir();
verileriYukle();