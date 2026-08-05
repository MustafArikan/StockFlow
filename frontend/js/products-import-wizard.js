(function () {
    const state = {
        step: 1,
        sessionId: null,
        headers: [],
        previewRows: [],
        systemFields: [],
        columnMapping: {},   // { "Name": "Ürün Adı" }
        valueMappings: {},   // { "CategoryName": { "elektronik": "Elektronik" } }
        targetLocationId: null,
        categories: []
    };

    function resetWizard() {
        state.step = 1;
        state.sessionId = null;
        state.columnMapping = {};
        state.valueMappings = {};
        state.targetLocationId = null;
        
        document.getElementById('excelImportFile').value = '';
        document.getElementById('importStep1Loading').classList.add('d-none');
        document.querySelector('label[for="excelImportFile"]').classList.remove('d-none');
        
        document.getElementById('importWarehouseId').value = '';
        document.getElementById('importLocationId').innerHTML = '<option value="">Önce depo seçin...</option>';
        document.getElementById('importLocationId').disabled = true;

        goToStep(1);
    }

    // ---- ADIM 1: Dosya Yükleme ----
    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        document.getElementById('importStep1Loading').classList.remove('d-none');
        document.querySelector('label[for="excelImportFile"]').classList.add('d-none');

        try {
            const result = await apiRequest('/products/import/session', 'POST', formData);
            state.sessionId = result.sessionId;
            state.headers = result.headers;
            state.previewRows = result.previewRows;
            state.systemFields = result.systemFields;
            state.columnMapping = { ...result.suggestedMapping };

            renderStep2(); // oto-eşleme sonrası doğrudan eşleme ekranına geç
        } catch (err) {
            hataGoster(err.message || "Dosya yüklenirken hata oluştu.");
            resetWizard();
        }
    }

    // ---- ADIM 2: Sütun Eşleme ----
    function renderStep2() {
        goToStep(2);
        const container = document.getElementById('importStep2Content');
        container.replaceChildren(); 

        state.systemFields.forEach(group => {
            const groupCol = document.createElement('div');
            groupCol.className = 'col-md-6';
            
            const groupCard = document.createElement('div');
            groupCard.className = 'card border-0 bg-light p-3 h-100';
            
            const groupTitle = document.createElement('h6');
            groupTitle.className = 'fw-bold text-dark mb-3 border-bottom pb-2';
            groupTitle.textContent = group.group;
            groupCard.appendChild(groupTitle);

            group.fields.forEach(field => {
                const row = document.createElement('div');
                row.className = 'import-mapping-row mb-3';

                const label = document.createElement('label');
                label.className = 'form-label small fw-bold text-muted mb-1';
                label.textContent = field.label + (field.required ? ' *' : '');

                const select = document.createElement('select');
                select.className = 'form-select form-select-sm';
                select.dataset.systemField = field.key;

                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = 'Eşleştirilmedi';
                select.appendChild(emptyOpt);

                state.headers.forEach(h => {
                    const opt = document.createElement('option');
                    opt.value = h;
                    opt.textContent = h;
                    if (state.columnMapping[field.key] === h) opt.selected = true;
                    select.appendChild(opt);
                });

                select.addEventListener('change', (e) => {
                    if (e.target.value) state.columnMapping[field.key] = e.target.value;
                    else delete state.columnMapping[field.key];
                });

                row.append(label, select);
                groupCard.appendChild(row);
            });
            groupCol.appendChild(groupCard);
            container.appendChild(groupCol);
        });
    }

    // ---- ADIM 3: Değer Eşleme (sadece CategoryName ve select-tipi dinamik özellikler için) ----
    async function renderStep3() {
        goToStep(3);
        const container = document.getElementById('importStep3Content');
        container.replaceChildren();

        // Check if required fields are mapped
        const requiredKeys = ["Name", "Barcode", "CategoryName"];
        const missing = requiredKeys.filter(k => !state.columnMapping[k]);
        if (missing.length > 0) {
            uyariGoster(`Lütfen zorunlu alanları eşleştirin. Eksik: ${missing.join(', ')}`);
            goToStep(2);
            return;
        }

        // Load categories if not already
        if (state.categories.length === 0) {
            try {
                const cats = await apiRequest('/categories?pageSize=1000', 'GET');
                state.categories = cats.items || cats;
            } catch(e) { console.error("Kategoriler yüklenemedi", e); }
        }

        const fieldsNeedingValueMap = ['CategoryName']; 

        for (const fieldKey of fieldsNeedingValueMap) {
            if (!state.columnMapping[fieldKey]) continue;
            const excelColumn = state.columnMapping[fieldKey];

            try {
                const data = await apiRequest(
                    `/products/import/session/${state.sessionId}/distinct-values?column=${encodeURIComponent(excelColumn)}`,
                    'GET'
                );

                const section = document.createElement('div');
                section.className = 'mb-4';
                
                const title = document.createElement('h6');
                title.className = 'fw-bold mb-3';
                title.textContent = `"${excelColumn}" sütunundaki eşsiz değerleri eşleştirin`;
                section.appendChild(title);

                const grid = document.createElement('div');
                grid.className = 'row g-2';

                data.distinctValues.forEach(rawValue => {
                    const col = document.createElement('div');
                    col.className = 'col-md-6';
                    
                    const row = document.createElement('div');
                    row.className = 'd-flex align-items-center bg-light rounded px-3 py-2 border';

                    const label = document.createElement('span');
                    label.className = 'text-truncate fw-bold me-3 flex-grow-1';
                    label.title = rawValue;
                    label.textContent = rawValue; 

                    const select = document.createElement('select');
                    select.className = 'form-select form-select-sm w-auto';
                    select.style.minWidth = '150px';
                    select.dataset.rawValue = rawValue;
                    select.dataset.systemField = fieldKey;

                    // Kategori seçenekleri
                    const emptyOpt = document.createElement('option');
                    emptyOpt.value = '';
                    emptyOpt.textContent = 'Kategori Seçin';
                    select.appendChild(emptyOpt);
                    
                    state.categories.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.name; // Backend is expecting category name for ValueMappings or ID? The backend expects name or mapped name to match categories dictionary which is ToDictionary(c => c.Name.ToLower())
                        opt.textContent = c.name;
                        
                        // Otonom eşleşme bulmaya çalış (basit)
                        if (c.name.toLowerCase() === rawValue.toLowerCase().trim()) {
                            opt.selected = true;
                            if (!state.valueMappings[fieldKey]) state.valueMappings[fieldKey] = {};
                            state.valueMappings[fieldKey][rawValue] = c.name;
                        }
                        
                        select.appendChild(opt);
                    });

                    select.addEventListener('change', (e) => {
                        if (!state.valueMappings[fieldKey]) state.valueMappings[fieldKey] = {};
                        state.valueMappings[fieldKey][rawValue] = e.target.value;
                    });

                    row.append(label, select);
                    col.appendChild(row);
                    grid.appendChild(col);
                });

                section.appendChild(grid);
                container.appendChild(section);
            } catch(e) {
                console.error("Benzersiz değerler alınamadı", e);
            }
        }
    }

    function goToStep(n) {
        state.step = n;
        [1, 2, 3].forEach(i => {
            const el = document.getElementById(`importStep${i}`);
            if (el) el.classList.toggle('d-none', i !== n);
        });
        
        const btnBack = document.getElementById('btnImportBack');
        if (n > 1) btnBack.classList.remove('d-none');
        else btnBack.classList.add('d-none');
        
        const btnNext = document.getElementById('btnImportNext');
        if (n === 1) {
            btnNext.classList.add('d-none');
        } else if (n === 2) {
            btnNext.classList.remove('d-none');
            btnNext.textContent = 'İleri';
            btnNext.className = 'btn btn-primary rounded-pill px-5 fw-bold shadow-sm';
        } else if (n === 3) {
            btnNext.classList.remove('d-none');
            btnNext.innerHTML = '<i class="bi bi-check-circle me-1"></i> İçe Aktarmayı Başlat';
            btnNext.className = 'btn btn-success rounded-pill px-5 fw-bold shadow-sm';
        }
        
        renderStepIndicator();
    }

    function renderStepIndicator() {
        const el = document.getElementById('importStepIndicator');
        el.replaceChildren();
        const labels = ['Dosya Yükle', 'Sütun Eşleştir', 'Değer Eşleştir'];
        labels.forEach((label, idx) => {
            const stepNum = idx + 1;
            const item = document.createElement('div');
            item.className = 'd-flex align-items-center';
            
            const badge = document.createElement('span');
            badge.className = 'import-step-badge' +
                (stepNum < state.step ? ' completed' : stepNum === state.step ? ' active' : '');
            badge.textContent = stepNum < state.step ? '✓' : String(stepNum);
            
            const text = document.createElement('span');
            text.className = stepNum === state.step ? 'fw-bold text-dark' : 'text-muted';
            text.textContent = label;
            
            item.append(badge, text);
            el.appendChild(item);
        });
    }

    // ---- Commit ----
    async function handleCommit() {
        if (!state.targetLocationId) {
            uyariGoster("Lütfen tüm ürünlerin ekleneceği raf/lokasyonu seçin.");
            return;
        }
        
        const btnNext = document.getElementById('btnImportNext');
        btnNext.disabled = true;
        btnNext.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Aktarılıyor...';

        try {
            const result = await apiRequest(`/products/import/session/${state.sessionId}/commit`, 'POST', {
                sessionId: state.sessionId,
                columnMapping: state.columnMapping,
                valueMappings: state.valueMappings,
                targetLocationId: parseInt(state.targetLocationId)
            });
            
            showImportReport(result);
            const modal = bootstrap.Modal.getInstance(document.getElementById('importWizardModal'));
            if(modal) modal.hide();
            resetWizard();
            if (typeof urunleriYukle === 'function') urunleriYukle(1);
        } catch (err) {
            hataGoster(err.message || "İçe aktarma sırasında bir hata oluştu.");
        } finally {
            btnNext.disabled = false;
        }
    }
    
    function showImportReport(report) {
        const alertContainer = document.getElementById('importReportAlert');
        if (alertContainer) {
            let reportHtml = `
                <div class="alert ${report.errorCount > 0 ? 'alert-warning' : 'alert-success'} rounded-3 p-4 border shadow-sm alert-dismissible fade show">
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    <h5 class="fw-bold mb-3"><i class="bi bi-clipboard-data-fill"></i> İçe Aktarma Sonuç Raporu</h5>
                    <p class="mb-1"><strong>Toplam İşlenen Satır:</strong> ${report.totalRows}</p>
                    <p class="mb-1 text-success"><strong>Sisteme Eklenen Ürün:</strong> ${report.successCount}</p>
                    <p class="mb-3 text-danger"><strong>Hatalı/Engellenen Satır:</strong> ${report.errorCount}</p>
            `;

            if (report.errors && report.errors.length > 0) {
                reportHtml += `<h6 class="fw-bold text-muted mt-3 mb-2">Hata Detayları (İlk 50):</h6><ul class="list-group small mb-0 import-error-list">`;
                report.errors.slice(0, 50).forEach(err => {
                    reportHtml += `
                        <li class="list-group-item list-group-item-danger d-flex justify-content-between align-items-start mb-1 rounded-2">
                            <div class="ms-2 me-auto">
                                <div class="fw-bold text-dark">Satır ${err.rowNumber}</div>
                                ${err.errors.join('<br>')}
                            </div>
                        </li>`;
                });
                reportHtml += `</ul>`;
            }
            reportHtml += `</div>`;
            alertContainer.innerHTML = reportHtml;
        }
    }

    async function loadWarehouses() {
        try {
            const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
            const warehouses = data.items || data;
            const select = document.getElementById('importWarehouseId');
            select.innerHTML = '<option value="">Depo Seçin...</option>';
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                select.appendChild(opt);
            });
        } catch(e) {
            console.error("Depolar yüklenemedi", e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('excelImportFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileUpload(file);
        });

        document.getElementById('btnImportNext')?.addEventListener('click', () => {
            if (state.step === 1) return; 
            if (state.step === 2) renderStep3();
            else if (state.step === 3) handleCommit();
        });

        document.getElementById('btnImportBack')?.addEventListener('click', () => {
            if (state.step > 1) goToStep(state.step - 1);
        });

        document.getElementById('btnCloseImportWizard')?.addEventListener('click', resetWizard);
        
        // Modal açıldığında depoları yükle
        const importModalEl = document.getElementById('importWizardModal');
        if (importModalEl) {
            importModalEl.addEventListener('show.bs.modal', () => {
                resetWizard();
                loadWarehouses();
            });
        }
        
        const warehouseSelect = document.getElementById('importWarehouseId');
        if (warehouseSelect) {
            warehouseSelect.addEventListener('change', async function() {
                const whId = this.value;
                const locSelect = document.getElementById('importLocationId');
                
                if (!whId) {
                    locSelect.innerHTML = '<option value="">Önce depo seçin...</option>';
                    locSelect.disabled = true;
                    state.targetLocationId = null;
                    return;
                }
                
                locSelect.innerHTML = '<option value="">Yükleniyor...</option>';
                locSelect.disabled = false;
                
                try {
                    const data = await apiRequest(`/locations/by-warehouse/${whId}?pageSize=1000`, 'GET');
                    const locations = data.items || data;
                    locSelect.innerHTML = '<option value="">Raf seçin...</option>';
                    locations.forEach(l => {
                        const opt = document.createElement('option');
                        opt.value = l.id;
                        opt.textContent = l.code;
                        locSelect.appendChild(opt);
                    });
                } catch(e) {
                    locSelect.innerHTML = '<option value="">Hata oluştu</option>';
                    console.error("Raflar yüklenemedi", e);
                }
            });
        }
        
        const locSelect = document.getElementById('importLocationId');
        if (locSelect) {
            locSelect.addEventListener('change', function() {
                state.targetLocationId = this.value;
            });
        }
    });
})();
