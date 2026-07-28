function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

class DynamicUI {
    // --- YENİ ÜRÜN / DÜZENLEME FORMU İÇİN (PIM) ---
    static renderFormInput(rule, options, escapeHtml) {
        let inputHtml = '';
        let requiredAttr = rule.isRequired ? 'required' : '';
        let uiType = rule.uiComponent || rule.dataType;

        if (uiType === 'searchable_dropdown') {
            let optionsStr = escapeHtml(JSON.stringify(options));
            inputHtml = `<div class="position-relative dynamic-rule-input-group" data-rule-id="${rule.id}">
                            <input type="text" id="search_${rule.id}" autocomplete="off" placeholder="Arayın veya seçin..." class="form-control dynamic-searchable-form-input" data-rule-id="${rule.id}" ${requiredAttr}>
                            <ul class="list-group position-absolute w-100 shadow-sm dynamic-ui-dropdown" id="results_${rule.id}"></ul>
                         </div>`;
            // Add options as dataset string to prevent parsing errors inside HTML attributes
            inputHtml = inputHtml.replace('<div', `<div data-options='${optionsStr}'`);
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
                                <input type="range" class="form-range flex-grow-1 dynamic-discrete-slider-form" data-rule-id="${rule.id}" min="${rMin}" max="${rMax}" step="${rStep}" value="${rMin}" id="rule_${rule.id}">
                                <input type="text" class="form-control form-control-sm ms-2 text-center w-100px" id="val_${rule.id}" value="${escapeHtml(options[0])}" readonly>
                                <input type="hidden" id="hidden_${rule.id}" value="${escapeHtml(options[0])}">
                             </div>`;
            } else {
                let rMin = parseFloat(rule.minValue);
                if (isNaN(rMin)) rMin = 0;
                let rMax = parseFloat(rule.maxValue);
                if (isNaN(rMax)) rMax = 100;
                if (rMin >= rMax) rMax = rMin + 100;
                let decimals = (rule.dataType === 'decimal' || uiType === 'range_slider_decimal') ? 1 : 0;
                let rStep = decimals > 0 ? 1 / Math.pow(10, decimals) : 1;
                inputHtml = `<div class="d-flex align-items-center dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="range_slider" data-min="${rMin}" data-max="${rMax}">
                                <input type="range" class="form-range flex-grow-1 dynamic-decimal-slider-form" data-rule-id="${rule.id}" data-decimals="${decimals}" min="${rMin}" max="${rMax}" step="${rStep}" value="${rMin}" id="rule_${rule.id}">
                                <input type="number" class="form-control form-control-sm ms-2 text-center w-75px dynamic-decimal-box-form" data-rule-id="${rule.id}" data-decimals="${decimals}" id="val_${rule.id}" value="${rMin.toFixed(decimals)}" min="${rMin}" max="${rMax}" step="${rStep}">
                             </div>`;
            }
        }
        else if (uiType === 'color_picker') {
            if (options && options.length > 0) {
                inputHtml = `<div class="d-flex flex-wrap mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker">`;
                options.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline m-0 me-2 mb-2 p-0">
                                    <label class="form-check-label d-flex align-items-center p-1 border rounded cursor-pointer" for="color_${rule.id}_${idx}">
                                        <input class="form-check-input color-radio-item ms-1 me-2" type="radio" name="rule_${rule.id}" id="color_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                        <span class="d-inline-block rounded-circle shadow-sm color-swatch-span" title="${escapeHtml(opt)}" data-bg-color="${escapeHtml(opt)}"></span>
                                    </label>
                                  </div>`;
                });
                inputHtml += `</div>`;
            } else {
                inputHtml = `<div class="input-group mb-3 mt-2 dynamic-rule-input-group">
                                <input type="color" class="form-control form-control-color dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker" id="color_${rule.id}" value="#0d6efd" title="Renk seçin">
                                <input type="text" class="form-control dynamic-color-box-form" data-rule-id="${rule.id}" id="colorLabel_${rule.id}" placeholder="Renk hex kodu (#000000)" ${requiredAttr}>
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
            inputHtml = `<input type="number" step="0.1" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="decimal" ${requiredAttr}>`;
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

        if (uiType === 'searchable_dropdown') {
            // Çoklu seçim: sadece listeden seçilebilir, chip (etiket) olarak gösterilir
            let optionsStr = escapeHtml(JSON.stringify(options));
            inputHtml = `<div class="position-relative" data-options='${optionsStr}'>
                            <div class="d-flex flex-wrap gap-1 mb-1" id="chips_filter_${rule.id}"></div>
                            <input type="text" class="form-control form-control-sm dynamic-multi-search-filter-input" placeholder="Ara ve seçiniz..." data-rule-id="${rule.id}">
                            <ul id="results_filter_${rule.id}" class="list-group position-absolute w-100 shadow-sm dynamic-ui-dropdown-top"></ul>
                            <input type="hidden" id="filter_hidden_${rule.id}" class="kural-filtresi" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="multi_select" value="[]">
                         </div>`;
        }
        else if (uiType === 'autocomplete') {
            // Serbest metin: listeden öneri gösterir ama yazılan her şeyi kabul eder (tek değer)
            let optionsStr = escapeHtml(JSON.stringify(options));
            inputHtml = `<div class="position-relative" data-options='${optionsStr}'>
                            <input type="text" class="form-control form-control-sm" placeholder="Ara veya Seç..."
                                   class="form-control form-control-sm dynamic-search-filter-input" data-rule-id="${rule.id}">
                            <ul id="results_filter_${rule.id}" class="list-group position-absolute w-100 shadow-sm dynamic-ui-dropdown-top"></ul>
                            <input type="hidden" id="filter_hidden_${rule.id}" class="kural-filtresi" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="text">
                         </div>`;
        }
        else if (uiType === 'dropdown' || uiType === 'icon_dropdown' || uiType === 'radio' || uiType === 'segmented_button' || uiType === 'color_picker') {
            let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
            inputHtml = `<select class="form-select form-select-sm kural-filtresi" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}">
                            <option value="">Tümü</option>
                            ${optionsHtml}
                         </select>`;
        } 
        else if (uiType === 'toggle_switch' || uiType === 'checkbox' || uiType === 'boolean') {
            inputHtml = `<select class="form-select form-select-sm kural-filtresi" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}">
                            <option value="">Tümü</option>
                            <option value="true">Evet/Açık</option>
                            <option value="false">Hayır/Kapalı</option>
                         </select>`;
        }
        else if (uiType === 'slider' || uiType === 'range_slider_integer' || uiType === 'range_slider_decimal' || rule.dataType === 'number' || rule.dataType === 'decimal') {
            if (options && options.length > 1) {
                // Özel dizi değerli slider (Örn: 128GB, 256GB, 512GB)
                let rMin = 0;
                let rMax = options.length - 1;
                let rStep = 1;
                let encodedOptions = escapeHtml(JSON.stringify(options));
                inputHtml = `<div class="px-2 pb-3 pt-1">
                                <div class="d-flex justify-content-between mb-2 small text-muted fw-bold">
                                    <span id="filter_min_lbl_${rule.id}">${escapeHtml(options[0])}</span>
                                    <span id="filter_max_lbl_${rule.id}">${escapeHtml(options[options.length - 1])}</span>
                                </div>
                                <div id="slider_${rule.id}" class="double-slider mb-2 mt-1" data-options='${encodedOptions}'></div>
                                <input type="hidden" class="kural-filtresi" id="filter_hidden_${rule.id}" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="discrete_range">
                             </div>`;
            } else {
                // Sayısal aralıklı slider
                let rMin = parseFloat(rule.minValue);
                if (isNaN(rMin)) rMin = 0;
                let rMax = parseFloat(rule.maxValue);
                if (isNaN(rMax)) rMax = 1000;
                if (rMin >= rMax) rMax = rMin + 1000;
                let decimals = (rule.dataType === 'decimal' || uiType === 'range_slider_decimal') ? 1 : 0;
                let rStep = decimals > 0 ? 1 / Math.pow(10, decimals) : 1;

                inputHtml = `<div class="px-2 pb-3 pt-1">
                                <div class="d-flex justify-content-between mb-3">
                                    <input type="number" id="filter_min_${rule.id}" class="form-control form-control-sm text-center fw-bold w-45" value="${rMin.toFixed(decimals)}" step="${rStep}" min="${rMin}" max="${rMax}">
                                    <span class="text-muted align-self-center">-</span>
                                    <input type="number" id="filter_max_${rule.id}" class="form-control form-control-sm text-center fw-bold w-45" value="${rMax.toFixed(decimals)}" step="${rStep}" min="${rMin}" max="${rMax}">
                                </div>
                                <div id="slider_${rule.id}" class="double-slider mb-2 mt-1" data-min="${rMin}" data-max="${rMax}" data-step="${rStep}"></div>
                                <input type="hidden" class="kural-filtresi" id="filter_hidden_${rule.id}" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-filter-type="range">
                             </div>`;
            }
        }
        else { 
            inputHtml = `<input type="text" class="form-control form-control-sm kural-filtresi" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" placeholder="Ara...">`;
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
                                <input type="range" class="form-range flex-grow-1 dynamic-preview-discrete-slider" min="${rMin}" max="${rMax}" step="1" value="${rMin}">
                                <input type="text" class="form-control form-control-sm text-center ms-2 w-100px" id="prev_num" value="${escapeHTML(secenekler[0])}" readonly>
                             </div>`;
            } else {
                let step = (uiType === 'range_slider_decimal') ? 0.1 : 1;
                inputHtml = `<div class="d-flex align-items-center w-100">
                                <span class="small text-muted me-2">${minVal}</span>
                                <input type="range" class="form-range flex-grow-1 dynamic-preview-decimal-slider" min="${minVal}" max="${maxVal}" step="${step}" value="${minVal}">
                                <span class="small text-muted ms-2 me-2">${maxVal}</span>
                                <input type="number" class="form-control form-control-sm text-center w-75px dynamic-preview-decimal-box" id="prev_num" value="${minVal}" min="${minVal}" max="${maxVal}" step="${step}">
                             </div>`;
            }
        }
        else if (uiType === 'color_picker') {
            if (secenekler && secenekler.length > 0) {
                inputHtml = `<div class="d-flex flex-wrap">`;
                secenekler.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline m-0 me-2 p-0">
                                    <label class="form-check-label d-flex align-items-center p-1 border rounded cursor-pointer" for="prev_color_${idx}">
                                        <input class="form-check-input ms-1 me-2" type="radio" name="prev_color" id="prev_color_${idx}">
                                        <span class="d-inline-block rounded-circle shadow-sm color-swatch-span-sm" title="${escapeHTML(opt)}" data-bg-color="${escapeHTML(opt)}"></span>
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

    // --- HELPER METHODS FOR NEW MD RULES ---
    static syncDecimal(sourceEl, targetId, decimals) {
        let val = Number(sourceEl.value);
        if(isNaN(val)) return;
        const factor = 10 ** decimals;
        const rounded = Math.round(val * factor) / factor;
        document.getElementById(targetId).value = rounded.toFixed(decimals);
        if(sourceEl.type === 'number') sourceEl.value = rounded.toFixed(decimals);
    }

    static syncDual(sourceEl, type, ruleId, step, decimals) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);

        let lo = Number(minEl.value);
        let hi = Number(maxEl.value);

        if (lo > hi - step) {
            if (type === 'min') { lo = hi - step; minEl.value = lo; }
            else { hi = lo + step; maxEl.value = hi; }
        }
        
        let factor = 10 ** decimals;
        lo = Math.round(lo * factor) / factor;
        hi = Math.round(hi * factor) / factor;

        if (minBox) minBox.value = lo.toFixed(decimals);
        if (maxBox) maxBox.value = hi.toFixed(decimals);
        
        if (hiddenEl) {
            hiddenEl.value = lo + "-" + hi;
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static syncDualBox(sourceEl, type, ruleId, step, decimals) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);

        let lo = Number(minBox.value);
        let hi = Number(maxBox.value);

        if (lo > hi - step) {
            if (type === 'min') { lo = hi - step; minBox.value = lo.toFixed(decimals); }
            else { hi = lo + step; maxBox.value = hi.toFixed(decimals); }
        }

        if (minEl) minEl.value = lo;
        if (maxEl) maxEl.value = hi;
        
        if (minEl && maxEl) {
            lo = Number(minEl.value);
            hi = Number(maxEl.value);
        }

        if (hiddenEl) {
            hiddenEl.value = lo + "-" + hi;
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static syncDiscreteDual(sourceEl, type, ruleId) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);
        
        let wrapper = minEl.closest('[data-options]');
        if(!wrapper) return;
        let arr = JSON.parse(wrapper.dataset.options);

        let lo = Number(minEl.value);
        let hi = Number(maxEl.value);

        if (lo > hi) {
            if (type === 'min') { lo = hi; minEl.value = lo; }
            else { hi = lo; maxEl.value = hi; }
        }

        if (minBox) minBox.value = arr[lo];
        if (maxBox) maxBox.value = arr[hi];
        
        if (hiddenEl) {
            let validSubset = arr.slice(lo, hi + 1).map(x => String(x).toLowerCase());
            hiddenEl.value = JSON.stringify(validSubset);
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static searchableInput(inputEl, ruleId, optionsStr) {
        let hiddenId = document.getElementById('rule_' + ruleId);
        let resultsUl = document.getElementById('results_' + ruleId);
        hiddenId.value = ''; // invalidate selection
        
        let q = inputEl.value.toLocaleLowerCase("tr-TR").trim();
        let options = [];
        try { options = JSON.parse(optionsStr); } catch(e){}
        
        resultsUl.innerHTML = '';
        if(!q) {
            resultsUl.style.display = 'none';
            return;
        }
        
        let matches = options.filter(opt => String(opt).toLocaleLowerCase("tr-TR").includes(q));
        if(matches.length === 0) {
            resultsUl.style.display = 'none';
            return;
        }
        
        matches.forEach(m => {
            let li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            li.textContent = m;
            li.onmousedown = function() { // onmousedown fires before input blur
                inputEl.value = m;
                hiddenId.value = m;
                resultsUl.style.display = 'none';
                inputEl.classList.remove('is-invalid');
            };
            resultsUl.appendChild(li);
        });
        resultsUl.style.display = 'block';
    }

    static searchableBlur(inputEl, ruleId) {
        let hiddenId = document.getElementById('rule_' + ruleId);
        let resultsUl = document.getElementById('results_' + ruleId);
        setTimeout(() => {
            if (!hiddenId.value) {
                inputEl.value = '';
                inputEl.classList.add('is-invalid');
            } else {
                inputEl.classList.remove('is-invalid');
            }
            if(resultsUl) resultsUl.style.display = 'none';
        }, 150);
    }

    // --- HELPER METHODS FOR NEW MD RULES ---
    static syncDecimal(sourceEl, targetId, decimals) {
        let val = Number(sourceEl.value);
        if(isNaN(val)) return;
        const factor = 10 ** decimals;
        const rounded = Math.round(val * factor) / factor;
        document.getElementById(targetId).value = rounded.toFixed(decimals);
        if(sourceEl.type === 'number') sourceEl.value = rounded.toFixed(decimals);
    }

    static syncDual(sourceEl, type, ruleId, step, decimals) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);

        let lo = Number(minEl.value);
        let hi = Number(maxEl.value);

        if (lo > hi - step) {
            if (type === 'min') { lo = hi - step; minEl.value = lo; }
            else { hi = lo + step; maxEl.value = hi; }
        }
        
        let factor = 10 ** decimals;
        lo = Math.round(lo * factor) / factor;
        hi = Math.round(hi * factor) / factor;

        if (minBox) minBox.value = lo.toFixed(decimals);
        if (maxBox) maxBox.value = hi.toFixed(decimals);
        
        if (hiddenEl) {
            hiddenEl.value = lo + "-" + hi;
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static syncDualBox(sourceEl, type, ruleId, step, decimals) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);

        let lo = Number(minBox.value);
        let hi = Number(maxBox.value);

        if (lo > hi - step) {
            if (type === 'min') { lo = hi - step; minBox.value = lo.toFixed(decimals); }
            else { hi = lo + step; maxBox.value = hi.toFixed(decimals); }
        }

        if (minEl) minEl.value = lo;
        if (maxEl) maxEl.value = hi;
        
        if (minEl && maxEl) {
            lo = Number(minEl.value);
            hi = Number(maxEl.value);
        }

        if (hiddenEl) {
            hiddenEl.value = lo + "-" + hi;
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static syncDiscreteDual(sourceEl, type, ruleId) {
        let minEl = document.getElementById('filter_min_' + ruleId);
        let maxEl = document.getElementById('filter_max_' + ruleId);
        let minBox = document.getElementById('filter_min_box_' + ruleId);
        let maxBox = document.getElementById('filter_max_box_' + ruleId);
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);
        
        let wrapper = minEl.closest('[data-options]');
        if(!wrapper) return;
        let arr = JSON.parse(wrapper.dataset.options);

        let lo = Number(minEl.value);
        let hi = Number(maxEl.value);

        if (lo > hi) {
            if (type === 'min') { lo = hi; minEl.value = lo; }
            else { hi = lo; maxEl.value = hi; }
        }

        if (minBox) minBox.value = arr[lo];
        if (maxBox) maxBox.value = arr[hi];
        
        if (hiddenEl) {
            let validSubset = arr.slice(lo, hi + 1).map(x => String(x).toLowerCase());
            hiddenEl.value = JSON.stringify(validSubset);
            hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static searchableInput(inputEl, ruleId, optionsStr) {
        let hiddenId = document.getElementById('rule_' + ruleId);
        let resultsUl = document.getElementById('results_' + ruleId);
        hiddenId.value = ''; // invalidate selection
        
        let q = inputEl.value.toLocaleLowerCase("tr-TR").trim();
        let options = [];
        try { options = JSON.parse(optionsStr); } catch(e){}
        
        resultsUl.innerHTML = '';
        if(!q) {
            resultsUl.style.display = 'none';
            return;
        }
        
        let matches = options.filter(opt => String(opt).toLocaleLowerCase("tr-TR").includes(q));
        if(matches.length === 0) {
            resultsUl.style.display = 'none';
            return;
        }
        
        matches.forEach(m => {
            let li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            li.textContent = m;
            li.onmousedown = function() { // onmousedown fires before input blur
                inputEl.value = m;
                hiddenId.value = m;
                resultsUl.style.display = 'none';
                inputEl.classList.remove('is-invalid');
            };
            resultsUl.appendChild(li);
        });
        resultsUl.style.display = 'block';
    }

    static searchableBlur(inputEl, ruleId) {
        let hiddenId = document.getElementById('rule_' + ruleId);
        let resultsUl = document.getElementById('results_' + ruleId);
        setTimeout(() => {
            if (!hiddenId.value) {
                inputEl.value = '';
                inputEl.classList.add('is-invalid');
            } else {
                inputEl.classList.remove('is-invalid');
            }
            if(resultsUl) resultsUl.style.display = 'none';
        }, 150);
    }

    // --- FİLTRE: ÇOKLU SEÇİM (SADECE LİSTEDEN, CHIP'Lİ) ---
    static multiSearchFilterInput(inputEl, ruleId) {
        try {
            let resultsUl = document.getElementById('results_filter_' + ruleId);
            let hiddenEl = document.getElementById('filter_hidden_' + ruleId);
            if (!resultsUl || !hiddenEl) {
                return;
            }

            let parent = inputEl.closest('.position-relative');
            let optionsStr = parent ? parent.dataset.options : '[]';

            let q = (inputEl.value || "").toLocaleLowerCase("tr-TR").trim();
            let options = [];
            try { options = JSON.parse(optionsStr || '[]'); } catch (e) { }

            let selected = [];
            try { selected = JSON.parse(hiddenEl.value || '[]'); } catch (e) { }

            resultsUl.innerHTML = '';

            if (!options || !Array.isArray(options)) options = [];

            let matches = options.filter(opt =>
                String(opt).toLocaleLowerCase("tr-TR").includes(q) && !selected.includes(String(opt))
            );

            if (matches.length === 0) {
                resultsUl.style.display = 'none';
                return;
            }

            matches.forEach(m => {
                let li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action py-1 small';
                li.style.cursor = 'pointer';
                li.textContent = String(m);
                li.onmousedown = function (e) {
                    e.preventDefault(); // blur olmasını önlemek için çok kritik!
                    DynamicUI.addMultiFilterChip(ruleId, String(m));
                    inputEl.value = '';
                    resultsUl.innerHTML = '';
                    resultsUl.style.display = 'none';
                    inputEl.focus();
                };
                resultsUl.appendChild(li);
            });
            resultsUl.style.display = 'block';
        } catch (err) {}
    }

        static multiSearchFilterBlur(inputEl, ruleId) {
        setTimeout(() => {
            let resultsUl = document.getElementById('results_filter_' + ruleId);
            if (resultsUl) { resultsUl.innerHTML = ''; resultsUl.style.display = 'none'; }
            
            if (inputEl.value.trim() !== '') {
                inputEl.classList.add('is-invalid');
                setTimeout(() => {
                    inputEl.value = '';
                    inputEl.classList.remove('is-invalid');
                }, 1500);
            }
        }, 150);
    }

    static addMultiFilterChip(ruleId, value) {
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);
        let selected = [];
        try { selected = JSON.parse(hiddenEl.value || '[]'); } catch (e) { selected = []; }

        if (selected.includes(value)) return;
        selected.push(value);
        hiddenEl.value = JSON.stringify(selected);

        DynamicUI.renderMultiFilterChips(ruleId, selected);
        hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    static removeMultiFilterChip(ruleId, value) {
        let hiddenEl = document.getElementById('filter_hidden_' + ruleId);
        let selected = [];
        try { selected = JSON.parse(hiddenEl.value || '[]'); } catch (e) { selected = []; }

        selected = selected.filter(v => v !== value);
        hiddenEl.value = JSON.stringify(selected);

        DynamicUI.renderMultiFilterChips(ruleId, selected);
        hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    static renderMultiFilterChips(ruleId, selectedArr) {
        let container = document.getElementById('chips_filter_' + ruleId);
        if (!container) return;
        container.innerHTML = '';
        selectedArr.forEach(val => {
            let badge = document.createElement('span');
            badge.className = 'badge bg-primary d-flex align-items-center me-1 mb-1';
            badge.innerHTML = `${escapeHTML(val)} <i class="bi bi-x-circle ms-2 dynamic-remove-chip cursor-pointer" data-rule-id="${ruleId}" data-value="${escapeHTML(val)}"></i>`;
            container.appendChild(badge);
        });
    }

    static searchableFilterInput(inputEl, ruleId) {
        try {
            let hiddenId = document.getElementById('filter_hidden_' + ruleId);
            let resultsUl = document.getElementById('results_filter_' + ruleId);
            if (!hiddenId || !resultsUl) return;

            let parent = inputEl.closest('.position-relative');
            let optionsStr = parent ? parent.dataset.options : '[]';
            
            hiddenId.value = inputEl.value;
            hiddenId.dispatchEvent(new Event('input', { bubbles: true }));

            let q = (inputEl.value || "").toLocaleLowerCase("tr-TR").trim();
            let options = [];
            try { options = JSON.parse(optionsStr || '[]'); } catch(e){ }
            
            resultsUl.innerHTML = '';
            if (!options || !Array.isArray(options)) options = [];

            let matches = options.filter(opt => String(opt).toLocaleLowerCase("tr-TR").includes(q));

            matches.forEach(m => {
                let li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action py-1 small';
                li.style.cursor = 'pointer';
                li.textContent = String(m);
                li.onmousedown = function(e) {
                    e.preventDefault();
                    inputEl.value = m;
                    hiddenId.value = m;
                    resultsUl.style.display = 'none';
                    hiddenId.dispatchEvent(new Event('change', { bubbles: true }));
                };
                resultsUl.appendChild(li);
            });
            resultsUl.style.display = 'block';
        } catch (err) {
            console.error("searchableFilterInput ERROR:", err);
        }
    }

    static searchableFilterBlur(inputEl, ruleId) {
        let resultsUl = document.getElementById('results_filter_' + ruleId);
        setTimeout(() => {
            if(resultsUl) resultsUl.style.display = 'none';
        }, 150);
    }
}

// Make it available globally if we are in browser
if (typeof window !== 'undefined') {
    window.DynamicUI = DynamicUI;
}
if (typeof document !== 'undefined') {
    document.addEventListener('input', function(e) {
        if (e.target.matches('.dynamic-searchable-form-input')) {
            DynamicUI.searchableInput(e.target, e.target.getAttribute('data-rule-id'), e.target.parentElement.dataset.options);
        }
        else if (e.target.matches('.dynamic-discrete-slider-form')) {
            const arr=JSON.parse(e.target.parentElement.dataset.options);
            let ruleId = e.target.getAttribute('data-rule-id');
            document.getElementById('val_'+ruleId).value=arr[e.target.value];
            document.getElementById('hidden_'+ruleId).value=arr[e.target.value];
        }
        else if (e.target.matches('.dynamic-decimal-slider-form')) {
            DynamicUI.syncDecimal(e.target, 'val_'+e.target.getAttribute('data-rule-id'), parseInt(e.target.getAttribute('data-decimals')));
        }
        else if (e.target.matches('.dynamic-decimal-box-form')) {
            DynamicUI.syncDecimal(e.target, 'rule_'+e.target.getAttribute('data-rule-id'), parseInt(e.target.getAttribute('data-decimals')));
        }
        else if (e.target.matches('.dynamic-color-box-form')) {
            document.getElementById('color_'+e.target.getAttribute('data-rule-id')).value=e.target.value;
        }
        else if (e.target.matches('.dynamic-multi-search-filter-input')) {
            DynamicUI.multiSearchFilterInput(e.target, e.target.getAttribute('data-rule-id'));
        }
        else if (e.target.matches('.dynamic-search-filter-input')) {
            DynamicUI.searchableFilterInput(e.target, e.target.getAttribute('data-rule-id'));
        }
        else if (e.target.matches('.dynamic-preview-discrete-slider')) {
            const arr=JSON.parse(e.target.parentElement.dataset.options); 
            document.getElementById('prev_num').value=arr[e.target.value];
        }
        else if (e.target.matches('.dynamic-preview-decimal-slider')) {
            document.getElementById('prev_num').value=e.target.value;
        }
        else if (e.target.matches('.dynamic-preview-decimal-box')) {
            e.target.previousElementSibling.previousElementSibling.value=e.target.value;
        }
    });

    document.addEventListener('focusin', function(e) {
        if (e.target.matches('.dynamic-multi-search-filter-input')) {
            DynamicUI.multiSearchFilterInput(e.target, e.target.getAttribute('data-rule-id'));
        }
        else if (e.target.matches('.dynamic-search-filter-input')) {
            DynamicUI.searchableFilterInput(e.target, e.target.getAttribute('data-rule-id'));
        }
    });

    document.addEventListener('focusout', function(e) {
        if (e.target.matches('.dynamic-searchable-form-input')) {
            DynamicUI.searchableBlur(e.target, e.target.getAttribute('data-rule-id'));
        }
        else if (e.target.matches('.dynamic-multi-search-filter-input')) {
            DynamicUI.multiSearchFilterBlur(e.target, e.target.getAttribute('data-rule-id'));
        }
        else if (e.target.matches('.dynamic-search-filter-input')) {
            DynamicUI.searchableFilterBlur(e.target, e.target.getAttribute('data-rule-id'));
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target.matches('.dynamic-remove-chip')) {
            DynamicUI.removeMultiFilterChip(e.target.getAttribute('data-rule-id'), e.target.getAttribute('data-value'));
        }
    });
}





// CSP Uyumlu CSSOM uygulayici (Renkler icin)
const dynamicStyleObserver = new MutationObserver((mutations) => {
    let hasChanges = false;
    for (let m of mutations) {
        if (m.addedNodes.length > 0) {
            hasChanges = true;
            break;
        }
    }
    if (hasChanges) {
        document.querySelectorAll('[data-bg-color]').forEach(el => {
            if (!el.style.backgroundColor) {
                el.style.setProperty('background-color', el.getAttribute('data-bg-color'));
            }
        });
    }
});
// Sayfa tam yuklendikten sonra observer'i baslat
document.addEventListener('DOMContentLoaded', () => {
    dynamicStyleObserver.observe(document.body, { childList: true, subtree: true });
    // Ayrica mevcut elementler icin ilk calistirma:
    document.querySelectorAll('[data-bg-color]').forEach(el => {
        el.style.setProperty('background-color', el.getAttribute('data-bg-color'));
    });
});
