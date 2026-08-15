// table-utils.js
window.TableUtils = {
    sortData: function(data, key, asc = true) {
        return data.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return asc ? valA.localeCompare(valB, 'tr', { sensitivity: 'base' }) : valB.localeCompare(valA, 'tr', { sensitivity: 'base' });
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return asc ? valA - valB : valB - valA;
            }
            
            if(valA < valB) return asc ? -1 : 1;
            if(valA > valB) return asc ? 1 : -1;
            return 0;
        });
    },
    renderEmptyRow: function(colspan, message = "Kayıt bulunamadı.") {
        return `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.escapeHtml(message)}</td></tr>`;
    }
};

// --- Otomatik Filtre Sayacı ve Temizle Butonu Yönetimi ---
document.addEventListener("DOMContentLoaded", () => {
    // ID'si "btnFiltreleriTemizle" ile başlayan tüm butonları bul
    const clearButtons = document.querySelectorAll('button[id^="btnFiltreleriTemizle"]');
    
    clearButtons.forEach(btn => {
        const card = btn.closest('.card');
        if (!card) return;
        
        // Temizle butonunu brutalist tarza (btn-outline-secondary) çevirelim ki disabled olunca bozuk (p-0) durmasın
        btn.classList.remove('btn-link', 'text-decoration-none', 'text-muted', 'p-0');
        btn.classList.add('btn-outline-secondary', 'fw-bold', 'd-inline-flex', 'align-items-center');

        let badge = btn.querySelector('.filter-counter-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge bg-dark ms-2 filter-counter-badge d-none';
            badge.style.borderRadius = 'var(--nb-r-sm, 4px)';
            btn.appendChild(badge);
        }

        function updateFilterCount() {
            let activeCount = 0;
            const filterInputs = card.querySelectorAll('.card-body input, .card-body select');
            
            filterInputs.forEach(input => {
                if (input.type === 'hidden' && (!input.id || !input.id.toLowerCase().includes('filtre'))) return;
                
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.checked) activeCount++;
                } else if (input.value && input.value.trim() !== '') {
                    if (input.type === 'number') {
                        let idLower = (input.id || '').toLowerCase();
                        if (idLower.includes('min') && input.hasAttribute('min')) {
                            if (parseFloat(input.value) <= parseFloat(input.getAttribute('min'))) return;
                        }
                        if (idLower.includes('max') && input.hasAttribute('max')) {
                            if (parseFloat(input.value) >= parseFloat(input.getAttribute('max'))) return;
                        }
                    }
                    activeCount++;
                }
            });
            
            if (activeCount > 0) {
                if (badge) {
                    badge.textContent = activeCount;
                    badge.classList.remove('d-none');
                }
                btn.disabled = false;
                btn.style.cursor = 'pointer';
            } else {
                if (badge) badge.classList.add('d-none');
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
            }
        }

        // Değişiklikleri dinle
        card.addEventListener('change', updateFilterCount);
        card.addEventListener('keyup', updateFilterCount);

        // Özel noUiSlider veya diğer 3. parti slider eylemlerini (sürükle-bırak) yakalamak için
        card.addEventListener('mouseup', () => setTimeout(updateFilterCount, 50));
        card.addEventListener('touchend', () => setTimeout(updateFilterCount, 50));

        // Özel eventleri dinle (örn. cascader js tarafından tetiklenen)
        card.addEventListener('filtreGuncellendi', updateFilterCount);

        btn.addEventListener('click', () => {
            setTimeout(updateFilterCount, 150);
        });

        // İlk açılış
        setTimeout(updateFilterCount, 200);
    });
});
