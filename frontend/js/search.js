(function () {
    'use strict';

    // Sayfa gömülü mü (iframe içinde mi)
    const isEmbedded = () => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    };

    // Arama Veritabanı
    const searchData = [
        { id: 'home', title: 'Ana Sayfa', desc: 'Genel durum, kısayollar ve özet bilgiler.', icon: 'bi-house-fill', url: 'index.html', badge: 'Sayfa' },
        { id: 'products', title: 'Ürün Kataloğu', desc: 'Tüm ürünleri listele, ara ve yönet.', icon: 'bi-box-seam', url: 'products.html', badge: 'Sayfa', tag: '@urun' },
        { id: 'movements', title: 'Stok Hareketleri', desc: 'Giriş, çıkış ve transfer işlemleri.', icon: 'bi-arrow-left-right', url: 'movements.html', badge: 'Sayfa', tag: '#stok' },
        { id: 'warehouses', title: 'Depolar', desc: 'Depo tanımları ve stok konumları.', icon: 'bi-building', url: 'warehouses.html', badge: 'Sayfa', tag: '/depo' },
        { id: 'suppliers', title: 'Tedarikçiler', desc: 'Firma kayıtları ve tedarikçi bilgileri.', icon: 'bi-truck', url: 'suppliers.html', badge: 'Sayfa', tag: '#tedarikci' },
        { id: 'categories', title: 'Kategoriler', desc: 'Ürün kategorilerini ve ağaç yapısını düzenle.', icon: 'bi-tags', url: 'categories.html', badge: 'Sayfa', tag: '/sayfa' },
        { id: 'users', title: 'Kullanıcılar', desc: 'Tüm kullanıcı kayıtlarını listele, ara ve yönet.', icon: 'bi-people', url: 'users.html', badge: 'Sayfa', tag: '@kullanici' },
        { id: 'roles', title: 'Rol ve Yetki', desc: 'Kullanıcı izinleri ve yetki sınırları.', icon: 'bi-shield-lock', url: 'roles.html', badge: 'Sayfa', tag: '@kullanici' },
        { id: 'notifications', title: 'Bildirimler', desc: 'Uyarılar ve kritik stok alarmları.', icon: 'bi-bell', url: 'notifications.html', badge: 'Sayfa', tag: '/sayfa' },
        { id: 'profile', title: 'Profil Ayarları', desc: 'Hesap bilgileri ve güvenlik ayarları.', icon: 'bi-person-gear', url: 'profile.html', badge: 'Ayar', tag: '@kullanici' },
        { id: 'scanner', title: 'Barkod/QR Okuyucu', desc: 'Kamera ile hızlı barkod tarama.', icon: 'bi-upc-scan', url: 'hybrid-scanner.html', badge: 'Araç', tag: '/arac' },
    ];

    // Global Event Listener (her frame'de çalışır)
    document.addEventListener('keydown', (e) => {
        // Ctrl+K veya Cmd+K yakalama
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            triggerSearchModal();
        }
    });

    function triggerSearchModal() {
        if (isEmbedded()) {
            // İframe içinden tetiklenirse ana pencereye mesaj gönder veya fonksiyon çağır
            try {
                if (window.top && typeof window.top.toggleNbSearch === 'function') {
                    window.top.toggleNbSearch();
                } else if (window.parent && typeof window.parent.toggleNbSearch === 'function') {
                    window.parent.toggleNbSearch();
                }
            } catch (err) {
                console.error("Ana pencereye erişilemedi", err);
            }
        } else {
            // Ana penceredeyse doğrudan aç
            if (typeof window.toggleNbSearch === 'function') {
                window.toggleNbSearch();
            }
        }
    }

    // Modal Yalnızca En Üst Kabukta Oluşturulur
    if (!isEmbedded()) {
        let isSearchOpen = false;
        let activeIndex = 0;
        let currentFilteredData = [];
        
        function initSearchDOM() {
            if (document.getElementById('nbSearchOverlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'nbSearchOverlay';
            overlay.className = 'nb-search-overlay';
            
            overlay.innerHTML = `
                <div class="nb-search-modal" id="nbSearchModal">
                    <div class="nb-search-header">
                        <i class="bi bi-search nb-search-icon"></i>
                        <input type="text" id="nbSearchInput" class="nb-search-input" placeholder="Bir sayfa, kullanıcı veya tedarikçi ara..." autocomplete="off">
                        <div class="nb-search-esc">ESC</div>
                    </div>
                    <div class="nb-search-results" id="nbSearchResults"></div>
                    <div class="nb-search-footer">
                        <div><kbd>↑</kbd> <kbd>↓</kbd> ile gez</div>
                        <div><kbd>Enter</kbd> ile seç</div>
                        <div><kbd>@</kbd> kullanıcı</div>
                        <div><kbd>#</kbd> tedarikçi</div>
                        <div><kbd>/</kbd> sayfa</div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);

            const input = document.getElementById('nbSearchInput');
            const results = document.getElementById('nbSearchResults');

            // Kapatma
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) window.toggleNbSearch(false);
            });

            // Input filtreleme
            let debounceTimer;
            input.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    renderResults(e.target.value);
                }, 300);
            });

            // Yön tuşları
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (activeIndex < currentFilteredData.length - 1) {
                        activeIndex++;
                        updateActiveState();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (activeIndex > 0) {
                        activeIndex--;
                        updateActiveState();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentFilteredData.length > 0 && currentFilteredData[activeIndex]) {
                        navigate(currentFilteredData[activeIndex]);
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    window.toggleNbSearch(false);
                } else if (e.key === 'Tab') {
                    // Otomatik tamamlama (Auto-complete)
                    e.preventDefault();
                    if (currentFilteredData.length > 0 && currentFilteredData[activeIndex]) {
                        const activeItem = currentFilteredData[activeIndex];
                        const val = input.value.trim();
                        
                        // Eğer arama @, #, / ile başlıyorsa ve seçili öğenin o tag'i varsa tag'i tamamla
                        if ((val.startsWith('@') || val.startsWith('#') || val.startsWith('/')) && activeItem.tag) {
                             input.value = activeItem.tag + ' ';
                        } else {
                             // Yoksa direkt başlığı tamamla
                             input.value = activeItem.title + ' ';
                        }
                        
                        renderResults(input.value);
                    }
                }
            });
        }

        async function renderResults(query) {
            const resultsContainer = document.getElementById('nbSearchResults');
            currentFilteredData = filterData(query);
            
            const q = (query || "").toLowerCase().trim();
            
            // Backend Aramaları (Kullanıcılar ve Tedarikçiler)
            let isUserSearch = q.startsWith('@kullanici') || q.startsWith('@kullanıcı');
            let isSupplierSearch = q.startsWith('#tedarikci') || q.startsWith('#tedarikçi');

            if (isUserSearch) {
                // Sadece veritabanı kayıtları görünsün, statik sayfaları gizle
                currentFilteredData = [];
                
                const searchStr = q.substring(10).trim();
                try {
                    const token = localStorage.getItem('token');
                    const url = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:5000/api';
                    const res = await fetch(`${url}/users?pageSize=20&search=${encodeURIComponent(searchStr)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const items = data.items || [];
                        const dynamicItems = items.map(u => ({
                            id: 'usr_' + u.id,
                            title: u.firstName + ' ' + u.lastName,
                            desc: (u.email || '') + ' - ' + (u.role || ''),
                            icon: 'bi-person-badge',
                            url: `users.html?modal=kullaniciModal&id=${u.id}`,
                            badge: 'Kayıt'
                        }));
                        currentFilteredData = currentFilteredData.concat(dynamicItems);
                    }
                } catch (e) { console.error('Kullanıcı araması başarısız', e); }
            } else if (isSupplierSearch) {
                // Sadece veritabanı kayıtları görünsün, statik sayfaları gizle
                currentFilteredData = [];
                
                const searchStr = q.substring(10).trim();
                try {
                    const token = localStorage.getItem('token');
                    const url = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:5000/api';
                    const res = await fetch(`${url}/suppliers?search=${encodeURIComponent(searchStr)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const items = Array.isArray(data) ? data : (data.items || []);
                        const dynamicItems = items.map(s => ({
                            id: 'sup_' + s.id,
                            title: s.name,
                            desc: (s.contactName || '') + (s.contactPhone ? ' (' + s.contactPhone + ')' : ''),
                            icon: 'bi-truck',
                            url: `suppliers.html?modal=tedarikciModal&id=${s.id}`,
                            badge: 'Kayıt'
                        }));
                        currentFilteredData = currentFilteredData.concat(dynamicItems);
                    }
                } catch (e) { console.error('Tedarikçi araması başarısız', e); }
            }

            activeIndex = 0;

            if (currentFilteredData.length === 0) {
                resultsContainer.innerHTML = '<div class="nb-search-empty">Sonuç bulunamadı.</div>';
                return;
            }

            resultsContainer.innerHTML = currentFilteredData.map((item, index) => `
                <div class="nb-search-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="nb-search-item-icon">
                        <i class="bi ${item.icon}"></i>
                    </div>
                    <div class="nb-search-item-content">
                        <div class="nb-search-item-title">${item.title}</div>
                        <div class="nb-search-item-desc">${item.desc}</div>
                    </div>
                    <div class="nb-search-item-badge">${item.badge}</div>
                </div>
            `).join('');

            // Tıklama eventleri
            resultsContainer.querySelectorAll('.nb-search-item').forEach(el => {
                el.addEventListener('mouseenter', () => {
                    activeIndex = parseInt(el.getAttribute('data-index'));
                    updateActiveState();
                });
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-index'));
                    navigate(currentFilteredData[idx]);
                });
            });
        }

        function filterData(query) {
            if (!query) return searchData;
            const q = query.toLowerCase().trim();
            
            // Özel tag aramaları (@, #, /)
            if (q.startsWith('@') || q.startsWith('#') || q.startsWith('/')) {
                // Eğer sadece prefix yazılmışsa
                if (q.length === 1) {
                    return searchData.filter(i => i.tag && i.tag.startsWith(q));
                }
                
                const textWithoutPrefix = q.substring(1).trim();
                return searchData.filter(i => 
                    (i.tag && i.tag.toLowerCase().startsWith(q)) || 
                    i.title.toLowerCase().includes(textWithoutPrefix) ||
                    i.desc.toLowerCase().includes(textWithoutPrefix)
                );
            }

            // Normal arama
            const results = searchData.filter(item => 
                item.title.toLowerCase().includes(q) || 
                item.desc.toLowerCase().includes(q) ||
                (item.tag && item.tag.toLowerCase().includes(q))
            );

            // Akıllı Sıralama: Başlığı aranan kelimeyle başlayanlar en üstte görünsün
            results.sort((a, b) => {
                const aTitleStarts = a.title.toLowerCase().startsWith(q) ? 1 : 0;
                const bTitleStarts = b.title.toLowerCase().startsWith(q) ? 1 : 0;
                if (aTitleStarts !== bTitleStarts) return bTitleStarts - aTitleStarts; // 1 olan öne geçer
                
                const aTitleIncludes = a.title.toLowerCase().includes(q) ? 1 : 0;
                const bTitleIncludes = b.title.toLowerCase().includes(q) ? 1 : 0;
                if (aTitleIncludes !== bTitleIncludes) return bTitleIncludes - aTitleIncludes;
                
                return 0;
            });

            return results;
        }

        function updateActiveState() {
            const items = document.querySelectorAll('.nb-search-item');
            items.forEach((item, index) => {
                if (index === activeIndex) {
                    item.classList.add('active');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
        }

        function navigate(item) {
            window.toggleNbSearch(false);
            if (window.WindowManager) {
                window.WindowManager.open(item.url, item.title);
            } else {
                window.location.href = item.url;
            }
        }

        window.toggleNbSearch = function (forceState) {
            initSearchDOM();
            const overlay = document.getElementById('nbSearchOverlay');
            const input = document.getElementById('nbSearchInput');
            
            isSearchOpen = forceState !== undefined ? forceState : !isSearchOpen;
            
            if (isSearchOpen) {
                overlay.classList.add('active');
                input.value = '';
                renderResults('');
                setTimeout(() => input.focus(), 50); // Animasyon sonrası focus
            } else {
                overlay.classList.remove('active');
                input.blur();
            }
        };
    }
})();
