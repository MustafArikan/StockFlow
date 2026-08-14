// =============================================================================
// PENCERE YÖNETİCİSİ (WINDOW MANAGER)
// =============================================================================
// Masaüstü kabuğunda birden çok uygulamayı aynı anda, taşınabilir ve
// boyutlandırılabilir pencerelerde açar. Her pencerenin içeriği bir <iframe>
// ile yüklenir.
//
// NEDEN IFRAME?
// Sayfalar arasında 25'ten fazla ORTAK element id'si var (aramaKutusu 4
// sayfada, modalBaslik 6 sayfada, paginationContainer 2 sayfada...). Tüm
// sayfalar tek belgeye doldurulsaydı getElementById yanlış pencerenin
// elemanını döndürürdü ve sayfa JS'lerinin tamamı (7 dosyada 737 çağrı)
// pencere köküne göre yeniden yazılmak zorunda kalırdı. Ayrı belge = çakışma
// fiziksel olarak imkânsız, mevcut sayfa kodu olduğu gibi çalışır.
//
// SAYFA TARAFI: js/config.js içindeki isEmbeddedWindow() gömülü çalışmayı
// algılar ve kabuğu (ray/menü/çerçeve) bir daha kurmaz.
// =============================================================================

(function () {
    'use strict';

    const STORAGE_KEY = 'wmSession';
    const TASKBAR_ID = 'dtTaskbar';

    // Pencerenin ekrandan taşmasını önlemek için kenar payı
    const EDGE_PAD = 8;
    const MIN_W = 320;
    const MIN_H = 200;

    // Dar ekranda serbest pencere kullanılamaz; tek pencere tam ekran çalışır.
    const MOBILE_BP = 991.98;
    const isMobile = () => window.innerWidth <= MOBILE_BP;

    let windows = [];       // { id, url, title, el, iframe, x, y, w, h, max, min, z }
    // Katman tabanı: ikon rayları 1040, sekme şeridi 1900, menü çubuğu 2000.
    // Pencereler ikonların üstünde, şeridin altında kalmalı (bkz. style.css 22B).
    let zTop = 1100;
    let seq = 0;
    let activeId = null;

    // ---------------------------------------------------------------- yardımcı
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    // Sekmeler menü çubuğunun İÇİNDE durduğu için ayrıca dikey yer kaplamaz;
    // pencerelerin üst sınırı yalnızca menü çubuğu yüksekliğidir.
    // (Değişken CSS tarafında hâlâ okunuyor, bu yüzden 0'da sabitlenir.)
    function syncTaskbarHeight() {
        document.documentElement.style.setProperty('--dt-taskbar-h', '0px');
        return 0;
    }

    function viewport() {
        const topbar = document.querySelector('.topbar');
        const top = topbar ? topbar.getBoundingClientRect().height : 46;
        return { top, left: 0, w: window.innerWidth, h: window.innerHeight - top };
    }

    // Yeni pencereler üst üste binmesin diye kademeli açılır
    function cascadePos(i) {
        const vp = viewport();
        const w = Math.min(1080, Math.round(vp.w * 0.72));
        const h = Math.min(720, Math.round(vp.h * 0.78));
        const step = 28;
        const x = clamp(vp.w * 0.5 - w / 2 + (i % 6) * step - 70, EDGE_PAD, Math.max(EDGE_PAD, vp.w - w - EDGE_PAD));
        const y = clamp(vp.top + 16 + (i % 6) * step, vp.top + EDGE_PAD, Math.max(vp.top + EDGE_PAD, vp.h - 120));
        return { x: Math.round(x), y: Math.round(y), w, h };
    }

    // ------------------------------------------------------------- oturum kaydı
    // Form pencereleri ("?modal=...") oturuma YAZILMAZ.
    // Geri yüklenseler yarım doldurulmuş bir form boş hâliyle geri gelirdi;
    // kullanıcı kaydettiğini sanabilir. Oturum yalnızca uygulama pencerelerini
    // hatırlar; formlar geçicidir.
    function isFormWindow(url) {
        return /[?&]modal=/.test(url || '');
    }

    function saveSession() {
        try {
            const data = windows.filter(w => !isFormWindow(w.url)).map(w => ({
                url: w.url, title: w.title,
                x: w.x, y: w.y, w: w.w, h: w.h, max: w.max, min: w.min, z: w.z
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, active: activeId, windows: data }));
        } catch (e) { /* kota dolabilir, oturum kaydı kritik değil */ }
    }

    function loadSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && Array.isArray(parsed.windows)) ? parsed : null;
        } catch (e) { return null; }
    }

    // --------------------------------------------------------------- iskelet
    // Sekme şeridi menü çubuğunun içinde, topbar.partial.js tarafından
    // oluşturulur. Bulunamazsa (eski önbellekli topbar) menü çubuğuna
    // sonradan eklenir; hiçbir durumda ayrı bir bar yaratılmaz.
    function ensureTaskbar() {
        let bar = document.getElementById(TASKBAR_ID);
        if (bar) return bar;
        bar = document.createElement('div');
        bar.id = TASKBAR_ID;
        bar.className = 'dt-tabstrip';
        bar.setAttribute('role', 'tablist');
        bar.setAttribute('aria-label', 'Açık pencereler');
        const topbar = document.querySelector('.topbar');
        if (topbar) {
            const right = topbar.querySelector('.dt-menubar-right');
            if (right) topbar.insertBefore(bar, right);
            else topbar.appendChild(bar);
        } else {
            document.body.appendChild(bar);
        }
        return bar;
    }

    function renderTaskbar() {
        const bar = ensureTaskbar();
        bar.innerHTML = '';
        bar.classList.toggle('is-empty', windows.length === 0);

        windows.forEach(w => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'dt-tab' + (w.id === activeId ? ' active' : '') + (w.min ? ' minimized' : '');
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', w.id === activeId ? 'true' : 'false');
            tab.title = w.title;

            const label = document.createElement('span');
            label.className = 'dt-tab-label';
            label.textContent = w.title;

            const close = document.createElement('span');
            close.className = 'dt-tab-close';
            close.setAttribute('role', 'button');
            close.setAttribute('aria-label', w.title + ' penceresini kapat');
            close.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
            close.addEventListener('click', (e) => { e.stopPropagation(); closeWindow(w.id); });

            tab.appendChild(label);
            tab.appendChild(close);
            tab.addEventListener('click', () => {
                if (w.min) { w.min = false; applyGeometry(w); }
                focusWindow(w.id);
            });
            bar.appendChild(tab);
        });

        syncTaskbarHeight();
    }

    // MASAÜSTÜ İKONLARI PENCERE AÇAR
    // İkonlar gerçek <a href> olarak kalır: orta tık / Ctrl+tık ile sayfayı
    // ayrı sekmede açmak çalışmaya devam eder (tarayıcı alışkanlığı korunur).
    // Yalnızca düz sol tık yakalanıp pencereye çevrilir.
    function interceptIconClicks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('#sidebar a[href], #sidebar-right a[href]');
            if (!link) return;
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            if (link.target === '_blank') return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || /^https?:/i.test(href)) return;

            e.preventDefault();
            const label = link.querySelector('.dt-label');
            openWindow(href, (label ? label.textContent : link.textContent).trim() || 'StockFlow');

            // Mobilde ikon çekmecesi seçimden sonra kapanır
            if (isMobile()) {
                document.querySelectorAll('#sidebar, #sidebar-right')
                    .forEach(r => r.classList.remove('show-mobile'));
            }
        });
    }

    // ---------------------------------------------------------------- pencere
    function buildWindowEl(w) {
        const el = document.createElement('section');
        el.className = 'dt-win';
        el.dataset.winId = w.id;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', w.title);

        el.innerHTML = `
            <header class="dt-win-bar">
                <div class="dt-win-title">
                    <span class="dt-titlebar-icon"><i class="bi bi-hexagon-fill" aria-hidden="true"></i></span>
                    <span class="dt-win-text"></span>
                </div>
                <div class="dt-window-controls">
                    <button type="button" class="dt-wc dt-wc-min" aria-label="Simge durumuna küçült" title="Simge durumuna küçült"><i class="bi bi-dash-lg" aria-hidden="true"></i></button>
                    <button type="button" class="dt-wc dt-wc-max" aria-label="Tam ekran" title="Tam ekran"><i class="bi bi-square" aria-hidden="true"></i></button>
                    <button type="button" class="dt-wc dt-wc-close" aria-label="Pencereyi kapat" title="Kapat"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
                </div>
            </header>
            <div class="dt-win-body">
                <iframe class="dt-win-frame" title="" referrerpolicy="same-origin" allow="camera; clipboard-write"></iframe>
                <div class="dt-win-veil" aria-hidden="true"></div>
            </div>
            <div class="dt-rs dt-rs-n"  data-dir="n"></div>
            <div class="dt-rs dt-rs-s"  data-dir="s"></div>
            <div class="dt-rs dt-rs-e"  data-dir="e"></div>
            <div class="dt-rs dt-rs-w"  data-dir="w"></div>
            <div class="dt-rs dt-rs-ne" data-dir="ne"></div>
            <div class="dt-rs dt-rs-nw" data-dir="nw"></div>
            <div class="dt-rs dt-rs-se" data-dir="se"></div>
            <div class="dt-rs dt-rs-sw" data-dir="sw"></div>`;

        el.querySelector('.dt-win-text').textContent = w.title;
        const frame = el.querySelector('.dt-win-frame');
        frame.title = w.title;
        frame.src = w.url;
        w.iframe = frame;

        // --- pencere kontrolleri ---
        el.querySelector('.dt-wc-close').addEventListener('click', () => closeWindow(w.id));
        el.querySelector('.dt-wc-min').addEventListener('click', () => minimizeWindow(w.id));
        el.querySelector('.dt-wc-max').addEventListener('click', () => toggleMaximize(w.id));
        el.querySelector('.dt-win-bar').addEventListener('dblclick', (e) => {
            if (e.target.closest('.dt-wc')) return;
            toggleMaximize(w.id);
        });

        // Pencereye herhangi bir yerden dokunmak onu öne getirir
        el.addEventListener('mousedown', () => focusWindow(w.id), true);

        attachDrag(w, el);
        attachResize(w, el);
        return el;
    }

    function applyGeometry(w) {
        const el = w.el;
        if (!el) return;
        el.classList.toggle('maximized', !!w.max);
        el.classList.toggle('minimized', !!w.min);

        if (isMobile()) {
            // Mobilde pencere yönetimi yok: tek tam ekran yüzey
            el.style.left = el.style.top = el.style.width = el.style.height = '';
            return;
        }
        if (w.max) {
            el.style.left = el.style.top = el.style.width = el.style.height = '';
            return;
        }
        el.style.left = w.x + 'px';
        el.style.top = w.y + 'px';
        el.style.width = w.w + 'px';
        el.style.height = w.h + 'px';
    }

    function focusWindow(id) {
        const w = windows.find(x => x.id === id);
        if (!w) return;
        if (activeId === id && w.el.style.zIndex == zTop) return;
        activeId = id;
        zTop += 1;
        w.z = zTop;
        w.el.style.zIndex = zTop;
        windows.forEach(x => x.el && x.el.classList.toggle('active', x.id === id));
        renderTaskbar();
        updateMenubarTitle();
        saveSession();
    }

    function openWindow(url, title, opts) {
        opts = opts || {};
        // Aynı adres zaten açıksa yenisini açma, mevcut olanı öne getir
        const existing = windows.find(w => w.url === url);
        if (existing && !opts.forceNew) {
            if (existing.min) { existing.min = false; applyGeometry(existing); }
            focusWindow(existing.id);
            return existing.id;
        }

        const id = 'win' + (++seq);
        const geo = opts.geometry || cascadePos(windows.length);
        const w = {
            id, url, title: title || 'StockFlow',
            x: geo.x, y: geo.y, w: geo.w, h: geo.h,
            max: !!opts.maximized, min: false, z: ++zTop
        };
        w.el = buildWindowEl(w);
        w.el.style.zIndex = w.z;
        document.body.appendChild(w.el);
        windows.push(w);
        applyGeometry(w);
        focusWindow(id);
        saveSession();
        return id;
    }

    function closeWindow(id) {
        const i = windows.findIndex(w => w.id === id);
        if (i === -1) return;
        const w = windows[i];
        if (w.el && w.el.parentNode) w.el.parentNode.removeChild(w.el);
        windows.splice(i, 1);
        if (activeId === id) {
            const next = windows.slice().sort((a, b) => b.z - a.z)[0];
            activeId = next ? next.id : null;
            if (next) focusWindow(next.id);
        }
        renderTaskbar();
        updateMenubarTitle();
        updateEmptyState();
        saveSession();
    }

    function minimizeWindow(id) {
        const w = windows.find(x => x.id === id);
        if (!w) return;
        w.min = true;
        applyGeometry(w);
        const next = windows.filter(x => !x.min).sort((a, b) => b.z - a.z)[0];
        activeId = next ? next.id : null;
        if (next) focusWindow(next.id); else { renderTaskbar(); updateMenubarTitle(); }
        saveSession();
    }

    function toggleMaximize(id) {
        const w = windows.find(x => x.id === id);
        if (!w) return;
        w.max = !w.max;
        applyGeometry(w);
        focusWindow(id);
        saveSession();
    }

    // ------------------------------------------------------------- sürükleme
    // NOT: Konum left/top ile yazılır, transform ile DEĞİL. Pencere içeriği
    // iframe olduğu için transform bir "containing block" oluşturur ve
    // içerideki position:fixed öğeleri (SweetAlert diyalogları) pencereye
    // hapsolur. left/top bu tuzağa düşmez.
    function attachDrag(w, el) {
        const bar = el.querySelector('.dt-win-bar');
        let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

        const onMove = (e) => {
            if (!dragging) return;
            const vp = viewport();
            const nx = ox + (e.clientX - sx);
            const ny = oy + (e.clientY - sy);
            // Başlık çubuğu her zaman erişilebilir kalsın
            w.x = clamp(nx, -(w.w - 120), vp.w - 120);
            w.y = clamp(ny, vp.top, vp.top + vp.h - 44);
            el.style.left = w.x + 'px';
            el.style.top = w.y + 'px';
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            document.body.classList.remove('dt-dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            saveSession();
        };

        bar.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || e.target.closest('.dt-wc')) return;
            if (w.max || isMobile()) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY; ox = w.x; oy = w.y;
            // Sürüklerken fare iframe'in üstüne geçerse olaylar kaybolur:
            // örtü katmanı bunu engeller.
            document.body.classList.add('dt-dragging');
            focusWindow(w.id);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
    }

    // ---------------------------------------------------------- boyutlandırma
    function attachResize(w, el) {
        el.querySelectorAll('.dt-rs').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (e.button !== 0 || w.max || isMobile()) return;
                const dir = handle.dataset.dir;
                const sx = e.clientX, sy = e.clientY;
                const o = { x: w.x, y: w.y, w: w.w, h: w.h };
                const vp = viewport();
                let resizing = true;

                const onMove = (ev) => {
                    if (!resizing) return;
                    const dx = ev.clientX - sx, dy = ev.clientY - sy;
                    let { x, y, w: ww, h: hh } = o;

                    if (dir.includes('e')) ww = clamp(o.w + dx, MIN_W, vp.w - o.x - EDGE_PAD);
                    if (dir.includes('s')) hh = clamp(o.h + dy, MIN_H, vp.top + vp.h - o.y - EDGE_PAD);
                    if (dir.includes('w')) {
                        ww = clamp(o.w - dx, MIN_W, o.x + o.w - EDGE_PAD);
                        x = o.x + (o.w - ww);
                    }
                    if (dir.includes('n')) {
                        hh = clamp(o.h - dy, MIN_H, o.y + o.h - vp.top);
                        y = o.y + (o.h - hh);
                    }
                    w.x = Math.round(x); w.y = Math.round(y);
                    w.w = Math.round(ww); w.h = Math.round(hh);
                    el.style.left = w.x + 'px'; el.style.top = w.y + 'px';
                    el.style.width = w.w + 'px'; el.style.height = w.h + 'px';
                };
                const onUp = () => {
                    resizing = false;
                    document.body.classList.remove('dt-dragging');
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    saveSession();
                };

                document.body.classList.add('dt-dragging');
                focusWindow(w.id);
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }

    // ------------------------------------------------------------- yardımcılar
    function updateMenubarTitle() {
        const el = document.getElementById('dtMenubarApp');
        if (!el) return;
        const w = windows.find(x => x.id === activeId);
        el.textContent = w ? w.title : '';
    }

    function updateEmptyState() {
        document.body.classList.toggle('dt-no-windows', windows.length === 0);
    }

    // Gömülü sayfa başlığını bildirince pencere ve sekme adı güncellenir.
    window.__wmReportTitle = function (frameEl, title) {
        if (!frameEl || !title) return;
        const w = windows.find(x => x.iframe === frameEl);
        if (!w) return;
        w.title = title;
        const t = w.el.querySelector('.dt-win-text');
        if (t) t.textContent = title;
        w.el.setAttribute('aria-label', title);
        w.iframe.title = title;
        renderTaskbar();
        updateMenubarTitle();
        saveSession();
    };

    // Pencere içindeki sayfalar buradan yeni pencere açar
    // (ör. tablodaki "Görüntüle" düğmesi).
    window.__wmOpen = function (url, title, opts) {
        return openWindow(url, title, opts);
    };

    // Ekran küçülüp büyüdüğünde pencereleri görünür alanda tut
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const vp = viewport();
            windows.forEach(w => {
                if (w.max) return;
                w.w = Math.min(w.w, vp.w - EDGE_PAD * 2);
                w.h = Math.min(w.h, vp.h - EDGE_PAD * 2);
                w.x = clamp(w.x, -(w.w - 120), vp.w - 120);
                w.y = clamp(w.y, vp.top, vp.top + vp.h - 44);
                applyGeometry(w);
            });
            document.body.classList.toggle('dt-wm-mobile', isMobile());
            saveSession();
        }, 150);
    });

    // ------------------------------------------------------------------ başlat
    function init() {
        ensureTaskbar();
        updateEmptyState();
        syncTaskbarHeight();
        interceptIconClicks();
        document.body.classList.toggle('dt-wm-mobile', isMobile());

        // Kapatılan pencere yeniden açılabilsin diye oturum geri yüklenir
        const session = loadSession();
        if (session && session.windows.length) {
            session.windows
                .slice()
                .sort((a, b) => (a.z || 0) - (b.z || 0))
                .forEach(s => openWindow(s.url, s.title, {
                    forceNew: true,
                    maximized: s.max,
                    geometry: { x: s.x, y: s.y, w: s.w, h: s.h }
                }));
            windows.forEach(w => { if (w.min) applyGeometry(w); });
        }

        // shell-boot.js doğrudan açılan sayfayı buraya yönlendirir:
        //   desktop.html?open=products.html
        // İstenen uygulama pencere olarak açılır (zaten açıksa öne gelir).
        try {
            const requested = new URLSearchParams(window.location.search).get('open');
            if (requested && !/^[a-z]+:/i.test(requested) && !requested.startsWith('//')) {
                openWindow(requested, baslikTahmini(requested));
                // Adres temizlenir: yenilendiğinde pencere ikinci kez açılmasın,
                // oturum geri yükleme zaten işi devralır.
                window.history.replaceState({}, '', 'desktop.html');
            }
        } catch (e) { /* URL okunamazsa masaüstü boş açılır */ }

        renderTaskbar();
        updateEmptyState();
    }

    // Pencere başlığı iframe yüklenince gerçek sayfa başlığıyla değişir
    // (__wmReportTitle). Bu yalnızca o ana kadarki geçici addır.
    function baslikTahmini(url) {
        const adlar = {
            'index.html': 'Ana Sayfa', 'products.html': 'Ürünler',
            'categories.html': 'Kategoriler', 'movements.html': 'Stok Hareketleri',
            'warehouses.html': 'Depolar', 'suppliers.html': 'Tedarikçiler',
            'assets.html': 'Ekipman', 'users.html': 'Kullanıcılar',
            'roles.html': 'Rol ve Yetki', 'policies.html': 'Politikalar',
            'audit-logs.html': 'Sistem Logları', 'notifications.html': 'Bildirimler',
            'hybrid-scanner.html': 'Barkod Okuyucu', 'profile.html': 'Profil Ayarları'
        };
        const dosya = url.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
        return adlar[dosya] || 'StockFlow';
    }

    window.WindowManager = {
        open: openWindow,
        close: closeWindow,
        focus: focusWindow,
        list: () => windows.map(w => ({ id: w.id, url: w.url, title: w.title })),
        init
    };
})();
