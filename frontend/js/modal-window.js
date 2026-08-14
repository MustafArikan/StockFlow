// =============================================================================
// MODAL → PENCERE KÖPRÜSÜ (MODAL WINDOW BRIDGE)
// =============================================================================
// Bootstrap modallarını masaüstü kabuğunda birer PENCERE olarak açar.
//
// TASARIM: Modalın HTML'i ve onu dolduran JS kodu OLDUĞU GİBİ KALIR.
// Sayfa "?modal=urunModal&id=5" ile açıldığında bu modül modalın
// .modal-content'ini alıp sayfanın gövdesine yerleştirir. Element id'leri
// değişmediği için formu dolduran mevcut kod (products.js vb.) hiç
// değiştirilmeden çalışmaya devam eder.
//
// Böylece 29 modalın her biri için ayrı sayfa yazmak gerekmez; her sayfa
// kendi modallarını parametreyle "form kipinde" açar.
//
// AKIŞ
//   Liste penceresi : ModalWindow.open('urunModal', {id: 5})
//                     → kabuk yeni pencere açar: products.html?modal=urunModal&id=5
//   Form penceresi  : modal içeriği sayfaya monte edilir, mevcut JS doldurur
//   Kaydet          : ModalWindow.done('products') → pencere kapanır,
//                     liste penceresi kendini tazeler
//
// -----------------------------------------------------------------------------
// HANGİSİ PENCERE, HANGİSİ MODAL KALIR?
// -----------------------------------------------------------------------------
// PENCERE OLUR — kullanıcı içinde "çalışıyorsa":
//   • içerik kaydırma gerektiriyorsa (uzun form, bölümlü ekran)
//   • birden çok adımı varsa (sihirbaz)
//   • çok alanlı veri girişi varsa (ekle / düzenle formları)
//   • kullanıcının aynı anda başka bir şeye bakması işine yarıyorsa
//     (ör. ürünü düzenlerken listeyi görmek, iki kaydı karşılaştırmak)
//
// MODAL KALIR — tek bir şeye "bakıp kapatıyorsa":
//   • onay / uyarı kutuları (silmek istediğinize emin misiniz)
//   • tek amaçlı küçük araçlar (barkod göster-yazdır, kamera önizleme)
//   • tek alanlık hızlı girişler
//
// Sebep: pencere kalıcı bir çalışma alanıdır, taşınır ve arkada durur.
// Anlık bir onay için pencere açmak kullanıcıyı yorar; uzun bir formu
// modala sıkıştırmak da sayfayı kilitler. Ayrım buradan geliyor.
// =============================================================================

(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var CHILD_MODAL = params.get('modal');       // form kipindeysek modal id'si
    var CHANNEL = 'stockflow-data';

    // Hangi modallar pencere olarak açılacak? Sayfa kendi listesini
    // ModalWindow.register() ile bildirir. Kayıtlı olmayan modallar eski
    // davranışını korur (ör. küçük onay/yardım kutuları).
    var windowModals = Object.create(null);

    // ---------------------------------------------------------------- ortak
    function bc() {
        try { return new BroadcastChannel(CHANNEL); } catch (e) { return null; }
    }

    // Veri değişikliğini TÜM açık pencerelere duyurur (liste tazeleme için)
    function notifyChanged(topic) {
        var ch = bc();
        if (ch) { ch.postMessage({ type: 'changed', topic: topic }); ch.close(); }
        // BroadcastChannel yoksa localStorage olayı yedek yol olur
        try { localStorage.setItem('__dataPing', topic + ':' + Date.now()); } catch (e) { }
    }

    var handlers = Object.create(null);

    function onChanged(topic, fn) {
        (handlers[topic] = handlers[topic] || []).push(fn);
    }

    function fire(topic) {
        (handlers[topic] || []).forEach(function (fn) {
            try { fn(); } catch (e) { console.error('tazeleme hatası:', e); }
        });
    }

    (function listen() {
        var ch = bc();
        if (ch) ch.onmessage = function (e) {
            if (e.data && e.data.type === 'changed') fire(e.data.topic);
        };
        window.addEventListener('storage', function (e) {
            if (e.key === '__dataPing' && e.newValue) fire(String(e.newValue).split(':')[0]);
        });
    })();

    // ------------------------------------------------------- LİSTE PENCERESİ
    // Modalı yeni pencerede açar. Kabuğa erişemezsek (bağımsız sayfa) eski
    // Bootstrap davranışına düşer — sayfa tek başına da çalışmaya devam eder.
    // BÜYÜK BAĞLAM TAŞIMA (payload)
    // Bazı ekranlar adrese sığmayan bir nesneye ihtiyaç duyuyor (ör. log
    // detayı: eski/yeni değerlerin JSON dökümü). Bunlar sessionStorage'a
    // yazılıp anahtarı adresle gönderilir. Aynı sekmedeki aynı origin'li
    // iframe'ler sessionStorage'ı paylaştığı için pencere veriyi okuyabilir.
    // Okunduktan sonra silinir; yenilemede bayat veri kalmaz.
    var PAYLOAD_ON_EK = 'mwPayload:';

    function payloadYaz(veri) {
        var anahtar = 'p' + Date.now() + Math.random().toString(36).slice(2, 7);
        try { sessionStorage.setItem(PAYLOAD_ON_EK + anahtar, JSON.stringify(veri)); } catch (e) { return null; }
        return anahtar;
    }

    function payloadOku() {
        var anahtar = params.get('pkey');
        if (!anahtar) return null;
        try {
            var ham = sessionStorage.getItem(PAYLOAD_ON_EK + anahtar);
            sessionStorage.removeItem(PAYLOAD_ON_EK + anahtar);
            return ham ? JSON.parse(ham) : null;
        } catch (e) { return null; }
    }

    function open(modalId, extraParams, title, opts) {
        opts = opts || {};

        // ÖZYİNELEME KORUMASI
        // Bir form penceresi KENDİ modalını yeniden açamaz — sonsuz pencere
        // zinciri olurdu. Ama BAŞKA bir modalı pencere olarak açabilmelidir:
        // ör. "Tedarikçi Ürünleri" penceresindeki ürün adına tıklayıp ürün
        // detayını açmak. Koruma bu yüzden çağrı yerlerinde değil BURADA ve
        // yalnızca aynı modal için uygulanır.
        if (CHILD_MODAL && CHILD_MODAL === modalId) return false;

        var q = new URLSearchParams();
        q.set('modal', modalId);
        Object.keys(extraParams || {}).forEach(function (k) {
            if (extraParams[k] !== undefined && extraParams[k] !== null) q.set(k, extraParams[k]);
        });
        if (opts.payload) {
            var anahtar = payloadYaz(opts.payload);
            if (anahtar) q.set('pkey', anahtar);
        }

        // Pencere varsayılan olarak BULUNDUĞUMUZ sayfada açılır; modalın
        // işaretlemesi ve JS'i orada olduğu için doğrusu budur.
        // İSTİSNA (opts.page): Bir modal başka bir sayfaya ait olabilir.
        // Örnek: Stok Hareketleri'nde barkoda tıklanınca ürün detayı açılır,
        // ama detay modalı ve onu dolduran kod products.html'de yaşar. O
        // durumda pencere o sayfada açılır.
        var page = opts.page || window.location.pathname.split('/').pop() || 'index.html';
        var url = page + '?' + q.toString();

        try {
            if (window.parent && window.parent !== window && typeof window.parent.__wmOpen === 'function') {
                // forceNew VERİLMEZ: aynı kaydın formu ikinci kez açılmak
                // istenirse yeni pencere yığmak yerine açık olan öne gelir.
                // Farklı kayıtların adresleri farklı olduğu için (id=5, id=9)
                // onlar yine ayrı pencerelerde açılır.
                window.parent.__wmOpen(url, title || windowModals[modalId] || 'StockFlow');
                return true;
            }
        } catch (e) { /* kabuğa erişilemedi */ }

        // Yedek: kabuk yoksa modalı eskisi gibi aç
        var el = document.getElementById(modalId);
        if (el && window.bootstrap) bootstrap.Modal.getOrCreateInstance(el).show();
        return false;
    }

    // TETİKLEYİCİLERİ DEVRALMA
    //
    // DİKKAT — NEDEN "stopPropagation" YETMİYOR:
    // Bootstrap, data-api dinleyicilerini seçiciyle kaydederken
    // addEventListener'ın üçüncü argümanını true veriyor; yani o da YAKALAMA
    // (capture) evresinde dinliyor. Üstelik kütüphane bizden önce yüklendiği
    // için aynı düğümde (document) BİZDEN ÖNCE sıraya giriyor. Bu yüzden biz
    // ne yaparsak yapalım modal önce açılıyordu: pencere de açılıyor, modal da
    // üstüne biniyordu.
    //
    // Çözüm olayı durdurmak değil, Bootstrap'in seçicisini hiç eşleştirmemek:
    // tetikleyiciden data-bs-toggle kaldırılır. (data-bs-target DURUR — sayfa
    // kodu düğmeyi hâlâ o seçiciyle buluyor.)
    function claimTrigger(el) {
        var id = (el.getAttribute('data-bs-target') || '').replace('#', '');
        if (!id || !windowModals[id] || el.hasAttribute('data-mw-open')) return;
        el.removeAttribute('data-bs-toggle');
        el.setAttribute('data-mw-open', id);
    }

    function claimAll(root) {
        (root || document).querySelectorAll('[data-bs-target]').forEach(claimTrigger);
    }

    function interceptTriggers() {
        claimAll();

        // Tablo satırları gibi sonradan basılan tetikleyiciler de devralınır
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                m.addedNodes.forEach(function (n) {
                    if (n.nodeType !== 1) return;
                    if (n.hasAttribute && n.hasAttribute('data-bs-target')) claimTrigger(n);
                    if (n.querySelectorAll) claimAll(n);
                });
            });
        }).observe(document.documentElement, { childList: true, subtree: true });

        document.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('[data-mw-open]');
            if (!t) return;
            var id = t.getAttribute('data-mw-open');
            e.preventDefault();
            open(id, {}, windowModals[id]);
        });
    }

    // ------------------------------------------------------- FORM PENCERESİ
    // Modalın içeriğini sayfaya monte eder.
    function mountChild() {
        var modal = document.getElementById(CHILD_MODAL);
        if (!modal) return false;

        var content = modal.querySelector('.modal-content');
        if (!content) return false;

        var host = document.querySelector('.dt-window-content') || document.body;

        // Sayfanın geri kalanı (liste, filtreler) gizlenir.
        // SİLİNMEZ: sayfa JS'i bu elemanlara erişmeye devam ediyor, kaldırmak
        // null referans hatalarına yol açardı.
        //
        // DİKKAT — DİĞER MODALLAR GİZLENMEZ:
        // Bir modal zaten varsayılan olarak görünmezdir (.modal { display:none })
        // ve yalnızca açılınca görünür. Ona "d-none" eklenirse Bootstrap .show
        // sınıfını eklese bile d-none'ın !important'ı kazanır ve modal BİR DAHA
        // AÇILAMAZ. Ürün formundaki "Okut" düğmesi bu yüzden çalışmıyordu:
        // kamera modali (#scannerModalUrunler) d-none ile kilitlenmişti.
        Array.prototype.forEach.call(host.children, function (c) {
            if (c === modal) return;                       // taşınacak modalın kabuğu
            if (c.classList && c.classList.contains('modal')) return;
            c.classList.add('d-none');
        });

        var page = document.createElement('div');
        page.className = 'mw-page';
        page.appendChild(content);          // modal-content taşınır
        host.appendChild(page);

        document.body.classList.add('mw-form-window');

        // Pencere başlığı modalın başlığından alınır.
        // DİKKAT: Başlık sonradan değişebiliyor — ör. urunDuzenle() kaydı
        // sunucudan çektikten SONRA "Ürün Düzenle" yazıyor. Tek seferlik
        // okuma yapılırsa sekmede "Yeni Ürün Ekle" yazılı kalır. Bu yüzden
        // başlık elemanı izlenir ve her değişimde yeniden bildirilir.
        var titleEl = content.querySelector('.modal-title');

        var reportTitle = function () {
            var t = titleEl ? titleEl.textContent.trim() : '';
            if (!t) t = (document.title || 'StockFlow').split(/[-–|]/)[0].trim();
            try {
                if (window.parent && typeof window.parent.__wmReportTitle === 'function') {
                    window.parent.__wmReportTitle(window.frameElement, t);
                }
            } catch (e) { }
        };

        reportTitle();

        if (titleEl) {
            new MutationObserver(reportTitle)
                .observe(titleEl, { childList: true, characterData: true, subtree: true });
        }

        // Modalı kapatan her düğme artık PENCEREYİ kapatır
        page.addEventListener('click', function (e) {
            var d = e.target.closest('[data-bs-dismiss="modal"]');
            if (!d) return;
            e.preventDefault();
            closeSelf();
        });

        // EYLEM SATIRINI SABİTLE
        // Bu formlarda Kaydet/İptal düğmeleri modal-footer'da değil, formun
        // en sonunda duruyor. Modalda sorun değildi (kutu kısaydı) ama pencere
        // yüksekliğinde kaydetmek için formun dibine inmek gerekiyor.
        // Formun SON çocuğu düğme içeriyorsa sabitlenir.
        var form = content.querySelector('form');
        if (form && form.children.length) {
            var son = form.children[form.children.length - 1];
            if (son.querySelector('button, .btn')) son.classList.add('mw-actions');
        }

        return true;
    }

    // Mevcut kodda kaydetme sonrası "modalInstance.hide()" çağrılıyor.
    // Form penceresinde bu çağrı pencereyi kapatmalı. Bootstrap'in Modal
    // sınıfını sarmalayarak bunu tek noktadan çözüyoruz — çağrı yerlerinin
    // hiçbirini değiştirmek gerekmiyor.
    function shimBootstrapModal() {
        if (!window.bootstrap || !bootstrap.Modal) return;

        // Sahte örnek: "hide()" modalı gizlemek yerine PENCEREYİ kapatır.
        var sahteOrnek = function (el) {
            return {
                show: function () { },                 // zaten görünür
                hide: function () { closeSelf(); },
                toggle: function () { closeSelf(); },
                dispose: function () { },
                _element: el
            };
        };

        // Sayfalar Bootstrap Modal'a ÜÇ farklı yoldan ulaşıyor:
        //   getOrCreateInstance(...).hide()   (products, categories)
        //   getInstance(...)?.hide()          (warehouses, suppliers, users)
        //   new bootstrap.Modal(...).show()   (users, movements, roles,
        //                                      product-detail)
        // Üçü de sarmalanmazsa ya pencere kapanmaz ya da monte edilmiş
        // içeriğin ÜSTÜNE bir de gerçek modal açılır. Bu yüzden sınıfın
        // kendisi devralınıyor.
        var OrijModal = bootstrap.Modal;

        function ModalKopru(el, ayarlar) {
            if (el && el.id === CHILD_MODAL) return sahteOrnek(el);
            return new OrijModal(el, ayarlar);
        }

        // Statik üyeler (VERSION, Default, NAME ...) korunur
        Object.getOwnPropertyNames(OrijModal).forEach(function (k) {
            if (['length', 'name', 'prototype', 'caller', 'arguments'].indexOf(k) !== -1) return;
            try { ModalKopru[k] = OrijModal[k]; } catch (e) { }
        });
        ModalKopru.prototype = OrijModal.prototype;

        ['getOrCreateInstance', 'getInstance'].forEach(function (ad) {
            var orij = OrijModal[ad] && OrijModal[ad].bind(OrijModal);
            if (!orij) return;
            ModalKopru[ad] = function (el) {
                if (el && el.id === CHILD_MODAL) return sahteOrnek(el);
                return orij(el);
            };
        });

        bootstrap.Modal = ModalKopru;
    }

    function closeSelf() {
        try {
            if (window.parent && window.parent !== window && window.parent.WindowManager) {
                var frames = window.parent.document.querySelectorAll('.dt-win-frame');
                for (var i = 0; i < frames.length; i++) {
                    if (frames[i].contentWindow === window) {
                        var win = frames[i].closest('.dt-win');
                        if (win) { window.parent.WindowManager.close(win.dataset.winId); return; }
                    }
                }
            }
        } catch (e) { }
        // Kabuk yoksa geri dön
        window.history.back();
    }

    // Kaydetme başarılı olduğunda çağrılır: veriyi duyur + pencereyi kapat
    function done(topic) {
        if (topic) notifyChanged(topic);
        closeSelf();
    }

    // FORM PENCERESİ AÇILIŞI — ortak kalıp
    //
    // Sayfaların "düzenle" fonksiyonları kaydı BELLEKTEKİ listeden arıyor
    // (ör. tumKategoriler.find(...)) ve bulamazsa sessizce çıkıyor. Form
    // penceresinde o liste hiç yüklenmediği için form boş "yeni kayıt"
    // hâlinde kalır — kullanıcı düzenlediğini sanır, yeni kayıt açar.
    // Bu yüzden düzenleme penceresi kaydı TEK BAŞINA sunucudan çeker.
    //
    // Kullanım (sayfa JS'inde):
    //   ModalWindow.formBoot({
    //       modal : 'kategoriModal',
    //       edit  : async (id, p) => { ... kaydı getir, formu doldur ... },
    //       create: (p)          => { ... boş formu hazırla ... }
    //   });
    //
    // İkinci argüman (p) adres satırındaki TÜM parametreleri taşır. Görüntüleme
    // pencereleri çoğu zaman id dışında bağlam da istiyor (ör. başlıkta yazacak
    // ürün adı, kilitlenecek raf); bunlar p üzerinden gelir.
    function allParams() {
        var o = {};
        params.forEach(function (v, k) { o[k] = v; });
        return o;
    }

    function formBoot(cfg) {
        if (!CHILD_MODAL || CHILD_MODAL !== cfg.modal) return false;

        var run = function () {
            var id = params.get('id');
            var p = allParams();
            try {
                if (id && typeof cfg.edit === 'function') return cfg.edit(id, p);
                if (!id && typeof cfg.create === 'function') return cfg.create(p);
            } catch (e) {
                console.error('form penceresi hazırlanamadı:', e);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
        } else {
            setTimeout(run, 0);
        }
        return true;
    }

    // ------------------------------------------------------------------ API
    window.ModalWindow = {
        formBoot: formBoot,
        // Adrese sığmayan bağlamı okur (bkz. open'daki payload açıklaması)
        payload: payloadOku,
        // Sayfa hangi modallarının pencere olarak açılacağını bildirir:
        //   ModalWindow.register({ urunModal: 'Ürün Formu' })
        register: function (map) { Object.assign(windowModals, map); },
        open: open,
        done: done,
        close: closeSelf,
        notifyChanged: notifyChanged,
        onChanged: onChanged,
        // Sayfa JS'i ağır liste yüklemesini atlamak için bunu kontrol eder
        isFormWindow: !!CHILD_MODAL,
        modalId: CHILD_MODAL
    };

    // ---------------------------------------------------------------- başlat
    if (CHILD_MODAL) {
        shimBootstrapModal();

        // DİKKAT — ZAMANLAMA:
        // config.js sayfa içeriğini ".dt-window-content" içine sarmayı
        // "await loadAuthContext()" SONRASINA bırakıyor. Yani DOMContentLoaded
        // anında bu kapsayıcı henüz YOK. O anda monte edilirse modal içeriği
        // gövdeye konur, ardından config.js onu da sarmalar ve gizleme mantığı
        // yanlış elemanlara uygulanır.
        // Bu yüzden kapsayıcı belirene kadar beklenir.
        var mounted = false;
        var tryMount = function () {
            if (mounted) return true;
            if (!document.querySelector('.dt-window-content')) return false;
            mounted = mountChild();
            return mounted;
        };

        document.addEventListener('DOMContentLoaded', function () {
            if (tryMount()) return;
            // subtree izlenir: bazı modallar sayfaya SONRADAN enjekte ediliyor
            // (ör. ürün detay modalı, ensureProductDetailModal ile çağrıldığında
            // oluşuyor). Yalnızca gövdenin doğrudan çocukları izlenseydi bu
            // modallar hiç monte edilemezdi.
            var obs = new MutationObserver(function () {
                if (tryMount()) obs.disconnect();
            });
            obs.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(function () { obs.disconnect(); }, 15000);
        });
    } else {
        document.addEventListener('DOMContentLoaded', interceptTriggers);
    }
})();
