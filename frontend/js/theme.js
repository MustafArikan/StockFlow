(function() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);

    // Tarayıcı arayüzünün (mobil adres çubuğu) rengini temayla eşitler.
    // Renkler style.css içindeki --nb-canvas jetonuyla birebir aynıdır.
    const THEME_COLORS = { light: '#eeefe9', dark: '#16181f' };

    function applyThemeColor(activeTheme) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', THEME_COLORS[activeTheme] || THEME_COLORS.light);
    }

    applyThemeColor(theme);

    // Tema birden fazla yerden değiştirilebiliyor (theme.js ve config.js içindeki
    // layoutThemeToggleBtn). Her çağrı noktasını tek tek bağlamak yerine
    // data-theme özniteliği izlenir; böylece hangi düğme kullanılırsa kullanılsın
    // tarayıcı rengi kendiliğinden güncel kalır.
    new MutationObserver(() => {
        applyThemeColor(document.documentElement.getAttribute('data-theme'));
    }).observe(document.documentElement, { attributeFilter: ['data-theme'] });

    // AÇIK PENCERELERE TEMA YAYILIMI
    // Masaüstü kabuğunda her pencere ayrı bir belgedir (iframe). Menü
    // çubuğundaki tema düğmesine basıldığında yalnızca üst belge değişir;
    // açık pencereler eski temada kalırdı. "storage" olayı aynı origin'deki
    // DİĞER belgelerde tetiklendiği için pencereler değişimi buradan duyar.
    // (Değişikliği yapan belgede tetiklenmez — orası zaten kendini günceller.)
    window.addEventListener('storage', (e) => {
        if (e.key !== 'theme' || !e.newValue) return;
        document.documentElement.setAttribute('data-theme', e.newValue);
        document.documentElement.setAttribute('data-bs-theme', e.newValue);
    });

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            updateThemeToggleIcon(themeToggleBtn, theme);

            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', newTheme);
                document.documentElement.setAttribute('data-bs-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeToggleIcon(themeToggleBtn, newTheme);
            });
        }
    });

    function updateThemeToggleIcon(btn, theme) {
        if (theme === 'dark') {
            btn.innerHTML = '☀️'; // Sun icon for light mode
            btn.setAttribute('title', 'Açık Temaya Geç');
        } else {
            btn.innerHTML = '🌙';
            btn.setAttribute('title', 'Koyu Temaya Geç');
        }
    }
})();