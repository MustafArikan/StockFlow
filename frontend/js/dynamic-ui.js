class DynamicUI {
    // --- YENİ ÜRÜN / DÜZENLEME FORMU İÇİN (PIM) ---
    static renderFormInput(rule, options, escapeHtml) {
        let inputHtml = '';
        let requiredAttr = rule.isRequired ? 'required' : '';
        let uiType = rule.uiComponent || rule.dataType;

        if (uiType === 'searchable_dropdown') {
            let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}" data-tokens="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
            inputHtml = `<select class="selectpicker form-control dynamic-rule-input" data-width="100%" data-live-search="true" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" title="Seçiniz..." ${requiredAttr}>
                            <option value="" data-tokens="temizle">Seçiniz...</option>
                            ${optionsHtml}
                         </select>`;
        }
        else if (uiType === 'autocomplete') {
            let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">`).join('');
            inputHtml = `<input list="datalist_${rule.id}" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" placeholder="Yazınız veya seçiniz..." ${requiredAttr}>
                         <datalist id="datalist_${rule.id}">
                            ${optionsHtml}
                         </datalist>`;
        }
        else if (uiType === 'dropdown') {
            let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
            inputHtml = `<select class="form-select dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="dropdown" ${requiredAttr}>
                            <option value="">Seçiniz...</option>
                            ${optionsHtml}
                         </select>`;
        } 
        else if (uiType === 'icon_dropdown') {
            let optionsHtml = options.map(opt => `<li><a class="dropdown-item icon-dropdown-item" href="#" data-value="${escapeHtml(opt)}"><i class="bi bi-star me-2"></i>${escapeHtml(opt)}</a></li>`).join('');
            inputHtml = `<div class="dropdown dynamic-rule-input-group" data-rule-id="${rule.id}">
                            <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center icon-dropdown-btn" type="button" data-bs-toggle="dropdown">
                                <span>Seçiniz...</span>
                            </button>
                            <ul class="dropdown-menu w-100">
                                ${optionsHtml}
                            </ul>
                            <input type="hidden" class="dynamic-rule-input icon-dropdown-hidden" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="icon_dropdown" ${requiredAttr}>
                         </div>`;
        } 
        else if (uiType === 'radio' || uiType === 'segmented_button') {
            let wrapperClass = uiType === 'segmented_button' ? 'btn-group w-100' : 'mt-2';
            let roleAttr = uiType === 'segmented_button' ? 'role="group"' : '';
            inputHtml = `<div class="${wrapperClass} dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="radio" ${roleAttr}>`;
            options.forEach((opt, idx) => {
                let isSeg = uiType === 'segmented_button';
                let btnCls = isSeg ? 'btn-check' : 'form-check-input';
                let lblCls = isSeg ? 'btn btn-outline-primary' : 'form-check-label';
                if (isSeg) {
                    inputHtml += `<input class="${btnCls}" type="radio" name="rule_${rule.id}" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                  <label class="${lblCls}" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>`;
                } else {
                    inputHtml += `<div class="form-check form-check-inline">
                                    <input class="${btnCls}" type="radio" name="rule_${rule.id}" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                    <label class="${lblCls}" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                                  </div>`;
                }
            });
            inputHtml += `</div>`;
        }
        else if (uiType === 'checkbox_group') {
            inputHtml = `<div class="mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="checkbox_group">`;
            options.forEach((opt, idx) => {
                inputHtml += `<div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" name="rule_${rule.id}[]" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}">
                                <label class="form-check-label" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                              </div>`;
            });
            inputHtml += `</div>`;
        }
        else if (uiType === 'slider' || uiType === 'range_slider_integer' || uiType === 'range_slider_decimal') {
            if (options && options.length > 1) {
                // Özel dizi değerli form slider'ı (Tek değer seçimi)
                let rMin = 0;
                let rMax = options.length - 1;
                let rStep = 1;
                let encodedOptions = escapeHtml(JSON.stringify(options));
                inputHtml = `<div class="d-flex align-items-center dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="discrete_slider" data-options='${encodedOptions}'>
                                <input type="range" class="form-range flex-grow-1" min="${rMin}" max="${rMax}" step="${rStep}" value="${rMin}" id="rule_${rule.id}" oninput="const arr=JSON.parse(this.parentElement.dataset.options); document.getElementById('val_${rule.id}').value=arr[this.value]; document.getElementById('hidden_${rule.id}').value=arr[this.value]">
                                <input type="text" class="form-control form-control-sm ms-2 text-center" style="width:100px;" id="val_${rule.id}" value="${escapeHtml(options[0])}" readonly>
                                <input type="hidden" id="hidden_${rule.id}" value="${escapeHtml(options[0])}">
                             </div>`;
            } else {
                let rMin = parseFloat(rule.minValue);
                if (isNaN(rMin)) rMin = 0;
                let rMax = parseFloat(rule.maxValue);
                if (isNaN(rMax)) rMax = 100;
                if (rMin >= rMax) rMax = rMin + 100;
                let rStep = (rule.dataType === 'decimal' || uiType === 'range_slider_decimal') ? 0.01 : 1;
                inputHtml = `<div class="d-flex align-items-center dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="range_slider" data-min="${rMin}" data-max="${rMax}">
                                <input type="range" class="form-range flex-grow-1" min="${rMin}" max="${rMax}" step="${rStep}" value="${rMin}" id="rule_${rule.id}" oninput="document.getElementById('val_${rule.id}').value=this.value">
                                <input type="number" class="form-control form-control-sm ms-2 text-center w-75px" id="val_${rule.id}" value="${rMin}" min="${rMin}" max="${rMax}" step="${rStep}" oninput="document.getElementById('rule_${rule.id}').value=this.value">
                             </div>`;
            }
        }
        else if (uiType === 'color_picker') {
            if (options && options.length > 0) {
                inputHtml = `<div class="d-flex flex-wrap mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker">`;
                options.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline m-0 me-2 mb-2 p-0">
                                    <label class="form-check-label d-flex align-items-center p-1 border rounded" style="cursor:pointer;" for="color_${rule.id}_${idx}">
                                        <input class="form-check-input color-radio-item ms-1 me-2" type="radio" name="rule_${rule.id}" id="color_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                        <span class="d-inline-block rounded-circle shadow-sm" title="${escapeHtml(opt)}" style="width:24px; height:24px; background-color:${escapeHtml(opt)}; border:1px solid #ddd;"></span>
                                    </label>
                                  </div>`;
                });
                inputHtml += `</div>`;
            } else {
                inputHtml = `<div class="input-group mb-3 mt-2 dynamic-rule-input-group">
                                <input type="color" class="form-control form-control-color dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker" id="color_${rule.id}" value="#0d6efd" title="Renk seçin">
                                <input type="text" class="form-control" id="colorLabel_${rule.id}" placeholder="Renk hex kodu (#000000)" oninput="document.getElementById('color_${rule.id}').value=this.value" ${requiredAttr}>
                             </div>`;
            }
        }
        else if (uiType === 'toggle_switch') {
            inputHtml = `<div class="form-check form-switch mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="boolean">
                            <input class="form-check-input" type="checkbox" role="switch" name="rule_${rule.id}" id="rule_${rule.id}">
                            <label class="form-check-label text-muted" for="rule_${rule.id}">Evet / Açık</label>
                         </div>`;
        }
        else if (uiType === 'checkbox' || uiType === 'boolean') {
            inputHtml = `<div class="form-check mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="boolean">
                            <input class="form-check-input" type="checkbox" name="rule_${rule.id}" id="rule_${rule.id}">
                            <label class="form-check-label text-muted" for="rule_${rule.id}">Evet / Doğru</label>
                         </div>`;
        }
        else if (uiType === 'masked_textbox') {
            let imeiPattern = (rule.attributeKey && rule.attributeKey.toLowerCase().includes('imei')) ? 'inputmode="numeric" maxlength="15" pattern="[0-9]{15}"' : '';
            inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr} placeholder="Örn: XXXX-XXXX" ${imeiPattern}>`;
        }
        else if (rule.dataType === 'number') {
            inputHtml = `<input type="number" step="1" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="number" ${requiredAttr}>`;
        } 
        else if (rule.dataType === 'decimal') {
            inputHtml = `<input type="number" step="0.01" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="decimal" ${requiredAttr}>`;
        }
        else { 
            inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr}>`;
        }
        
        return inputHtml;
    }

    // --- FİLTRELEME ALANI İÇİN (ÜRÜNLER LİSTESİ) ---
    static renderFilterInput(rule, options, escapeHtml) {
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
        else if (uiType === 'slider' || uiType === 'range_slider_integer' || uiType === 'range_slider_decimal' || rule.dataType === 'number' || rule.dataType === 'decimal') {
            if (options && options.length > 1) {
                // Özel dizi değerli slider (Örn: 128GB, 256GB, 512GB)
                let encodedOptions = escapeHtml(JSON.stringify(options));
                inputHtml = `<div class="px-2 pb-3 pt-1">
                                <div class="double-slider" id="slider_${rule.id}" data-options='${encodedOptions}'></div>
                                <div class="d-flex justify-content-between mt-3 text-muted small px-1 fw-bold">
                                    <span id="filter_min_lbl_${rule.id}"></span>
                                    <span id="filter_max_lbl_${rule.id}"></span>
                                </div>
                                <input type="hidden" class="kural-filtresi" id="filter_hidden_${rule.id}" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="discrete_range">
                             </div>`;
            } else {
                // Sayısal aralıklı slider
                let rMin = parseFloat(rule.minValue);
                if (isNaN(rMin)) rMin = 0;
                let rMax = parseFloat(rule.maxValue);
                if (isNaN(rMax)) rMax = 1000;
                if (rMin >= rMax) rMax = rMin + 1000;
                let rStep = (rule.dataType === 'decimal' || uiType === 'range_slider_decimal') ? 0.01 : 1;
                inputHtml = `<div class="px-2 pb-3 pt-1">
                                <div class="double-slider" id="slider_${rule.id}" data-min="${rMin}" data-max="${rMax}" data-step="${rStep}"></div>
                                <div class="d-flex justify-content-between mt-3">
                                    <input type="number" id="filter_min_${rule.id}" class="form-control form-control-sm text-center w-45" placeholder="Min" step="${rStep}">
                                    <input type="number" id="filter_max_${rule.id}" class="form-control form-control-sm text-center w-45" placeholder="Max" step="${rStep}">
                                    <input type="hidden" class="kural-filtresi" id="filter_hidden_${rule.id}" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="range">
                                </div>
                             </div>`;
            }
        }
        else { 
            inputHtml = `<input type="text" class="form-control form-control-sm kural-filtresi" data-rule-key="${escapeHtml(rule.attributeKey)}" placeholder="Ara...">`;
        }
        return inputHtml;
    }

    // --- KATEGORİLER EKRANI İÇİN (KURAL ÖNİZLEME) ---
    static renderPreviewInput(uiType, secenekler, minVal, maxVal, escapeHTML) {
        let inputHtml = "";
        
        if (uiType === 'searchable_dropdown') {
            inputHtml = `<select class="form-select form-select-sm">
                            <option value="">Seçiniz...</option>
                            ${secenekler.map(opt => `<option value="${escapeHTML(opt)}">${escapeHTML(opt)}</option>`).join('')}
                         </select>
                         <small class="text-muted fst-italic">Not: Gerçek formda arama kutulu açılır liste olarak görünür.</small>`;
        }
        else if (uiType === 'autocomplete') {
            inputHtml = `<input list="dl_preview" class="form-control form-control-sm" placeholder="Seçiniz veya yazınız...">
                         <datalist id="dl_preview">
                            ${secenekler.map(opt => `<option value="${escapeHTML(opt)}">`).join('')}
                         </datalist>`;
        }
        else if (uiType === 'dropdown') {
            inputHtml = `<select class="form-select form-select-sm">
                            <option value="">Seçiniz...</option>
                            ${secenekler.map(opt => `<option value="${escapeHTML(opt)}">${escapeHTML(opt)}</option>`).join('')}
                         </select>`;
        } 
        else if (uiType === 'icon_dropdown') {
            inputHtml = `<div class="dropdown">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle w-100 text-start" type="button">
                                Seçiniz...
                            </button>
                         </div>`;
        }
        else if (uiType === 'radio' || uiType === 'segmented_button') {
            inputHtml = `<div class="d-flex flex-wrap gap-2">`;
            const defaultOpts = secenekler.length > 0 ? secenekler : ["Örn 1", "Örn 2"];
            defaultOpts.forEach((opt, idx) => {
                let isSeg = uiType === 'segmented_button';
                let btnCls = isSeg ? 'btn-check' : 'form-check-input';
                let lblCls = isSeg ? 'btn btn-outline-primary btn-sm' : 'form-check-label small';
                if (isSeg) {
                    inputHtml += `<div><input class="${btnCls}" type="radio" name="prev_rad" id="pr_${idx}">
                                  <label class="${lblCls}" for="pr_${idx}">${escapeHTML(opt)}</label></div>`;
                } else {
                    inputHtml += `<div class="form-check form-check-inline m-0">
                                    <input class="${btnCls}" type="radio" name="prev_rad" id="pr_${idx}">
                                    <label class="${lblCls}" for="pr_${idx}">${escapeHTML(opt)}</label>
                                  </div>`;
                }
            });
            inputHtml += `</div>`;
        }
        else if (uiType === 'checkbox_group') {
            inputHtml = `<div class="d-flex flex-wrap gap-2">`;
            const defaultOpts = secenekler.length > 0 ? secenekler : ["Örn 1", "Örn 2"];
            defaultOpts.forEach((opt, idx) => {
                inputHtml += `<div class="form-check form-check-inline m-0">
                                <input class="form-check-input" type="checkbox" id="pc_${idx}">
                                <label class="form-check-label small" for="pc_${idx}">${escapeHTML(opt)}</label>
                              </div>`;
            });
            inputHtml += `</div>`;
        }
        else if (uiType === 'range_slider_integer' || uiType === 'range_slider_decimal' || uiType === 'slider') {
            if (secenekler && secenekler.length > 1) {
                let rMin = 0;
                let rMax = secenekler.length - 1;
                let encodedOptions = escapeHTML(JSON.stringify(secenekler));
                inputHtml = `<div class="d-flex align-items-center w-100" data-options='${encodedOptions}'>
                                <input type="range" class="form-range flex-grow-1" min="${rMin}" max="${rMax}" step="1" value="${rMin}" oninput="const arr=JSON.parse(this.parentElement.dataset.options); document.getElementById('prev_num').value=arr[this.value]">
                                <input type="text" class="form-control form-control-sm text-center ms-2" style="width:100px;" id="prev_num" value="${escapeHTML(secenekler[0])}" readonly>
                             </div>`;
            } else {
                let step = (uiType === 'range_slider_decimal') ? 0.01 : 1;
                inputHtml = `<div class="d-flex align-items-center w-100">
                                <span class="small text-muted me-2">${minVal}</span>
                                <input type="range" class="form-range flex-grow-1" min="${minVal}" max="${maxVal}" step="${step}" value="${minVal}" oninput="document.getElementById('prev_num').value=this.value">
                                <span class="small text-muted ms-2 me-2">${maxVal}</span>
                                <input type="number" class="form-control form-control-sm text-center w-75px" id="prev_num" value="${minVal}" min="${minVal}" max="${maxVal}" step="${step}" oninput="this.previousElementSibling.previousElementSibling.value=this.value">
                             </div>`;
            }
        }
        else if (uiType === 'color_picker') {
            if (secenekler && secenekler.length > 0) {
                inputHtml = `<div class="d-flex flex-wrap">`;
                secenekler.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline m-0 me-2 p-0">
                                    <label class="form-check-label d-flex align-items-center p-1 border rounded" style="cursor:pointer;" for="prev_color_${idx}">
                                        <input class="form-check-input ms-1 me-2" type="radio" name="prev_color" id="prev_color_${idx}">
                                        <span class="d-inline-block rounded-circle shadow-sm" title="${escapeHTML(opt)}" style="width:20px; height:20px; background-color:${escapeHTML(opt)}; border:1px solid #ddd;"></span>
                                    </label>
                                  </div>`;
                });
                inputHtml += `</div>`;
            } else {
                inputHtml = `<div class="d-flex align-items-center">
                                <input type="color" class="form-control form-control-color form-control-sm me-2" value="#ff0000" title="Örnek Renk">
                                <span class="small text-muted">Örnek</span>
                             </div>`;
            }
        }
        else if (uiType === 'toggle_switch') {
            inputHtml = `<div class="form-check form-switch mt-1">
                            <input class="form-check-input" type="checkbox" id="prev_ts">
                            <label class="form-check-label small text-muted" for="prev_ts">Evet / Açık</label>
                         </div>`;
        }
        else if (uiType === 'checkbox' || uiType === 'boolean') {
            inputHtml = `<div class="form-check mt-1">
                            <input class="form-check-input" type="checkbox" id="prev_chk">
                            <label class="form-check-label small text-muted" for="prev_chk">Evet / Doğru</label>
                         </div>`;
        }
        else if (uiType === 'masked_textbox') {
            inputHtml = `<input type="text" class="form-control form-control-sm" placeholder="Örn: XXXX-XXXX">`;
        }
        else {
            inputHtml = `<input type="text" class="form-control form-control-sm" placeholder="Serbest metin giriniz...">`;
        }
        return inputHtml;
    }
}

// Make it available globally if we are in browser
if (typeof window !== 'undefined') {
    window.DynamicUI = DynamicUI;
}
