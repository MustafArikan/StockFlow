(function() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            updateThemeToggleIcon(themeToggleBtn, theme);

            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', newTheme);
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