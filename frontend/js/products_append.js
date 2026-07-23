
// --- FİLTRELEME İŞLEMLERİ ---
document.getElementById('filtreKategoriId')?.addEventListener('change', async function() {
    const categoryId = this.value;
    const filterArea = document.getElementById('dynamicFilterArea');
    const filterContainer = document.getElementById('dynamicFilterContainer');

    // Kategori değiştiğinde her halükarda genel listeyi güncelle
    currentPage = 1;
    veriyiGuncelle();

    if (!categoryId) {
        filterArea.classList.add('d-none');
        filterContainer.innerHTML = '';
        return;
    }

    try {
        filterArea.classList.remove('d-none');
        filterContainer.innerHTML = '<div class="col-12 text-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Özellikler yükleniyor...</div>';
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${categoryId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Kurallar çekilemedi!");
        
        const rules = await response.json();
        rules.reverse(); // Yukarıdan aşağıya

        filterContainer.innerHTML = '';

        const validRules = rules.filter(r => r.targetLevel !== "Asset");
        
        if (validRules.length === 0) {
            filterContainer.innerHTML = '<div class="col-12 text-muted fst-italic">Bu kategoriye ait filtrelenebilir özellik bulunamadı.</div>';
            return;
        }

        validRules.forEach(rule => {
            let options = [];
            if (rule.allowedValues && rule.allowedValues !== "[]") {
                try { options = JSON.parse(rule.allowedValues); } 
                catch(e) { options = rule.allowedValues.split(',').map(s => s.trim()); }
            }

            let uiType = rule.uiComponent || rule.dataType;
            let inputHtml = '';

            if (uiType === 'searchable_dropdown' || uiType === 'autocomplete') {
                let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">`).join('');
                inputHtml = `<input list="datalist_filter_${rule.id}" class="form-control form-control-sm kural-filtresi" data-rule-key="${escapeHtml(rule.attributeKey)}" placeholder="Ara veya Seç...">
                             <datalist id="datalist_filter_${rule.id}">
                                ${optionsHtml}
                             </datalist>`;
            }
            else if (uiType === 'dropdown' || uiType === 'icon_dropdown' || uiType === 'radio' || uiType === 'segmented_button' || uiType === 'color_picker') {
                let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
                inputHtml = `<select class="form-select form-select-sm kural-filtresi" data-rule-key="${escapeHtml(rule.attributeKey)}">
                                <option value="">Tümü</option>
                                ${optionsHtml}
                             </select>`;
            } 
            else if (uiType === 'toggle_switch' || uiType === 'checkbox' || uiType === 'boolean') {
                inputHtml = `<select class="form-select form-select-sm kural-filtresi" data-rule-key="${escapeHtml(rule.attributeKey)}">
                                <option value="">Tümü</option>
                                <option value="true">Evet/Açık</option>
                                <option value="false">Hayır/Kapalı</option>
                             </select>`;
            }
            else { 
                inputHtml = `<input type="text" class="form-control form-control-sm kural-filtresi" data-rule-key="${escapeHtml(rule.attributeKey)}" placeholder="Ara...">`;
            }

            const div = document.createElement('div');
            div.className = 'col-md-3 mb-2';
            div.innerHTML = `<label class="form-label small fw-bold mb-1">${escapeHtml(rule.attributeKey)}</label>
                             ${inputHtml}`;
            filterContainer.appendChild(div);
        });

        // Dinamik filtrelere event listener ekle
        document.querySelectorAll('.kural-filtresi').forEach(el => {
            el.addEventListener('input', () => {
                currentPage = 1;
                veriyiGuncelle();
            });
            el.addEventListener('change', () => {
                currentPage = 1;
                veriyiGuncelle();
            });
        });

    } catch(e) {
        console.error("Filtre kuralları yüklenirken hata:", e);
        filterContainer.innerHTML = '<div class="col-12 text-danger">Özellikler yüklenemedi.</div>';
    }
});

document.getElementById('btnFiltreleriTemizle')?.addEventListener('click', () => {
    document.getElementById('aramaKutusu').value = '';
    aktifArama = '';
    
    const catSelect = document.getElementById('filtreKategoriId');
    if (catSelect) {
        catSelect.value = '';
        const event = new Event('change');
        catSelect.dispatchEvent(event);
    }
});
