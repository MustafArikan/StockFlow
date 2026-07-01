/**
 * Modül: Stok Hareketleri
 */

const MAX_ISLEM_ADEDI = 100000; // Güvenlik kuralı: Tek seferde en fazla işlem limiti

// 1. HAFIZA YÖNETİMİ
const VARSAYILAN_VERILER = [
    { id: 4, tarih: "28.06.2026 09:20", kod: "SSD-1TB", ad: "Samsung 990 PRO 1TB M.2", tip: "CIKIS", adet: 10, personel: "hamit@godeva.com.tr", duzenlendi: false },
    { id: 3, tarih: "29.06.2026 10:15", kod: "VGA-4090", ad: "NVIDIA GeForce RTX 4090 24GB", tip: "GIRIS", adet: 15, personel: "admin@godeva.com.tr", duzenlendi: false },
    { id: 2, tarih: "29.06.2026 11:30", kod: "CPU-7800", ad: "AMD Ryzen 7 7800X3D İşlemci", tip: "CIKIS", adet: 3, personel: "operator@godeva.com.tr", duzenlendi: true },
    { id: 1, tarih: "29.06.2026 14:00", kod: "RAM-C32", ad: "Corsair Vengeance 32GB DDR5", tip: "GIRIS", adet: 50, personel: "admin@godeva.com.tr", duzenlendi: false }
];

// Tarayıcı hafızasını oku (F5 yapınca silinmesin diye)
let stokHareketleri = JSON.parse(localStorage.getItem('stokHareketleri')) || VARSAYILAN_VERILER;

// Değişiklik olunca bunu çağırıp tarayıcıya yazarız
function veriyiHafizayaKaydet() {
    localStorage.setItem('stokHareketleri', JSON.stringify(stokHareketleri));
}

let aktifFiltre = 'TUMU';
let aktifArama = '';
let tarihArtan = false; 

const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

// 2. FİLTRELEME VE SIRALAMA MANTIĞI
function veriyiGuncelle() {
    let filtrelenmis = [...stokHareketleri];

    // Önce tip filtresini uygula
    if (aktifFiltre !== 'TUMU') {
        filtrelenmis = filtrelenmis.filter(x => x.tip === aktifFiltre);
    }
    
    // Sonra arama kutusu filtresini uygula
    if (aktifArama) {
        filtrelenmis = filtrelenmis.filter(x => 
            x.ad.toLowerCase().includes(aktifArama) || 
            x.kod.toLowerCase().includes(aktifArama) || 
            x.personel.toLowerCase().includes(aktifArama)
        );
    }

    // Sonra tarih sıralamasını yap (Yeniden eskiye veya Eskiden yeniye)
    filtrelenmis.sort((a, b) => {
        const parcala = (t) => {
            const [gun, ay, yil] = t.split(' ')[0].split('.');
            const [saat, dakika] = t.split(' ')[1].split(':');
            return new Date(yil, ay - 1, gun, saat, dakika);
        };
        const dateA = parcala(a.tarih);
        const dateB = parcala(b.tarih);
        
        if(dateA.getTime() === dateB.getTime()) return tarihArtan ? a.id - b.id : b.id - a.id;
        return tarihArtan ? dateA - dateB : dateB - dateA;
    });

    // Hazırlanan son veriyi ekrana çizmesi için gönder
    tabloyuCiz(filtrelenmis);
}

// 3. TABLO ÇİZİM İŞLEMİ (HTML kodlarını JavaScript ile oluşturma)
function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = ""; // Mevcut tabloyu temizle

    if (veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    // Döngü ile her veriyi HTML satırına çevir
    veriListesi.forEach(hareket => {
        let tipEtiketi = hareket.tip === "GIRIS" ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>` : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;
        let adetRengi = hareket.tip === "GIRIS" ? "text-success" : "text-danger";
        let adetIsareti = hareket.tip === "GIRIS" ? "+" : "-";
        let duzenlendiEtiketi = hareket.duzenlendi ? `<span class="badge bg-warning text-dark ms-2" style="font-size: 0.65rem;">Düzenlendi</span>` : "";

        // d-none d-md-table-cell sınıfları telefonda ilgili sütunları gizler
        const satir = `
            <tr>
                <td class="text-muted small text-center border-end align-middle">${hareket.tarih}</td>
                <td class="fw-bold text-center border-end align-middle d-none d-md-table-cell">${hareket.kod}</td>
                <td class="border-end align-middle">${hareket.ad} ${duzenlendiEtiketi}</td> 
                <td class="text-center border-end align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center border-end align-middle ${adetRengi}">${adetIsareti}${hareket.adet}</td>
                <td class="text-center border-end align-middle d-none d-md-table-cell">${hareket.personel}</td>
                <td class="text-center align-middle d-flex gap-2 justify-content-center flex-wrap">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="islemDuzenle(${hareket.id})">Düzenle</button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="silIslem(${hareket.id})">Sil</button>
                </td>
            </tr>`;
        tabloGovdesi.innerHTML += satir;
    });
}

// 4. BUTON VE ARAMA DİNLEYİCİLERİ (Kullanıcı hareketlerini yakalar)
document.getElementById("btnTumu").addEventListener("click", () => { aktifFiltre = 'TUMU'; aktifButonuGuncelle("btnTumu"); veriyiGuncelle(); });
document.getElementById("btnGirisler").addEventListener("click", () => { aktifFiltre = 'GIRIS'; aktifButonuGuncelle("btnGirisler"); veriyiGuncelle(); });
document.getElementById("btnCikislar").addEventListener("click", () => { aktifFiltre = 'CIKIS'; aktifButonuGuncelle("btnCikislar"); veriyiGuncelle(); });
aramaKutusu.addEventListener("keyup", (event) => { aktifArama = event.target.value.toLowerCase(); veriyiGuncelle(); });

function siralaTarih() {
    tarihArtan = !tarihArtan;
    document.getElementById("tarihBaslik").innerText = tarihArtan ? "Tarih ↑" : "Tarih ↓";
    veriyiGuncelle();
}

// 5. GÜVENLİK VE FORM KONTROLÜ
function formuDenetle() {
    const tip = document.getElementById("islemTipi").value;
    const urun = document.getElementById("urunSecimi").value;
    const adet = document.getElementById("islemAdedi").value;
    const kaydetButonu = document.getElementById("btnKaydet");

    // Bütün alanlar doluysa ve adet sıfırdan büyükse butonu aç
    if (tip !== "" && urun !== "" && adet && parseInt(adet) > 0) {
        kaydetButonu.disabled = false;
    } else {
        kaydetButonu.disabled = true;
    }
}

// Kutuların içindeki veriler değiştikçe sürekli formu denetle
document.getElementById("islemTipi").addEventListener("change", formuDenetle);
document.getElementById("urunSecimi").addEventListener("change", formuDenetle);
document.getElementById("islemAdedi").addEventListener("input", formuDenetle);

document.querySelector('[data-bs-target="#stokIslemModal"]').addEventListener("click", () => {
    document.getElementById("modalBaslik").innerText = "Yeni Stok İşlemi";
    document.getElementById("hareketId").value = ""; 
    document.getElementById("stokIslemFormu").reset(); 
    document.getElementById("btnKaydet").innerText = "Ekle ve Onayla";
    formuDenetle(); 
});

function islemDuzenle(id) {
    const kayit = stokHareketleri.find(x => x.id === id);
    document.getElementById("hareketId").value = kayit.id;
    document.getElementById("islemTipi").value = kayit.tip;
    document.getElementById("urunSecimi").value = kayit.kod;
    document.getElementById("islemAdedi").value = kayit.adet;
    
    document.getElementById("btnKaydet").innerText = "Düzenle ve Onayla";
    document.getElementById("modalBaslik").innerText = "İşlemi Düzenle";
    
    formuDenetle(); 
    new bootstrap.Modal(document.getElementById('stokIslemModal')).show();
}

// KAYDETME İŞLEMİ (Ekle veya Güncelle)
document.getElementById("btnKaydet").addEventListener("click", () => {
    const gizliId = document.getElementById("hareketId").value;
    const islemAdedi = parseInt(document.getElementById("islemAdedi").value);

    // KURAL: Girilen sayı sınırı aşıyorsa sistemi durdur
    if (islemAdedi > MAX_ISLEM_ADEDI) {
        alert(`Sistem Koruması: Tek seferde en fazla ${MAX_ISLEM_ADEDI.toLocaleString('tr-TR')} adet işlem yapabilirsiniz!`);
        return; 
    }

    if (gizliId) {
        // ID varsa bu eski bir kayıttır, sadece güncelle (Tarihe dokunma)
        let mevcutKayit = stokHareketleri.find(x => x.id == gizliId);
        mevcutKayit.tip = document.getElementById("islemTipi").value;
        mevcutKayit.kod = document.getElementById("urunSecimi").value;
        mevcutKayit.ad = document.getElementById("urunSecimi").options[document.getElementById("urunSecimi").selectedIndex].text;
        mevcutKayit.adet = islemAdedi;
        mevcutKayit.duzenlendi = true; 
    } else {
        // ID yoksa bu yepyeni bir kayıttır.
        stokHareketleri.unshift({
            id: Date.now(), // Benzersiz bir kimlik oluştur
            tarih: new Date().toLocaleString("tr-TR").slice(0, 16), // SİSTEM SAATİNİ OTOMATİK AL
            kod: document.getElementById("urunSecimi").value,
            ad: document.getElementById("urunSecimi").options[document.getElementById("urunSecimi").selectedIndex].text,
            tip: document.getElementById("islemTipi").value,
            adet: islemAdedi,
            personel: "aktif.kullanici@godeva.com.tr", 
            duzenlendi: false
        });
    }

    veriyiHafizayaKaydet(); // F5 yapınca silinmesin diye hafızaya kaydet
    veriyiGuncelle();
    bootstrap.Modal.getInstance(document.getElementById('stokIslemModal')).hide();
});

function silIslem(id) {
    if (confirm("Bu işlemi silmek istediğinizden emin misiniz?")) {
        // id'si eşit OLMAYANLARI filtreleyerek, silineni dışarıda bırakıyoruz
        stokHareketleri = stokHareketleri.filter(x => x.id !== id);
        veriyiHafizayaKaydet();
        veriyiGuncelle();
    }
}

// Butonların renklerini ayarlayan görsel fonksiyon
function aktifButonuGuncelle(aktifId) {
    document.getElementById("btnTumu").className = "btn btn-outline-dark btn-sm rounded-pill px-3";
    document.getElementById("btnGirisler").className = "btn btn-outline-success btn-sm rounded-pill px-3";
    document.getElementById("btnCikislar").className = "btn btn-outline-danger btn-sm rounded-pill px-3";

    const btn = document.getElementById(aktifId);
    if (aktifId === "btnTumu") btn.className = "btn btn-dark btn-sm rounded-pill px-3";
    if (aktifId === "btnGirisler") btn.className = "btn btn-success btn-sm rounded-pill px-3 text-white";
    if (aktifId === "btnCikislar") btn.className = "btn btn-danger btn-sm rounded-pill px-3 text-white";
}

// Sayfa ilk yüklendiğinde tabloda verileri göstermesi için başlatıcı
veriyiGuncelle();