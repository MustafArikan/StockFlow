// data-view-engine.js
// Tüm sayfalarda tekrar eden "filtrele + sırala + sayfala + çiz" mantığının tek merkezi hali.
// Bağımlılıklar: security-utils.js (escapeHtml), table-utils.js (renderEmptyRow, sortData),
// config.js (buildPagination), partials/pagination.partial.js (buildPaginationHtml)

function createDataView(cfg) {
    const state = {
        allItems: [],
        filtered: [],
        search: '',
        sortKey: cfg.defaultSortKey || null,
        sortDir: cfg.defaultSortDir || 'asc',
        page: 1,
        pageSize: cfg.pageSize || (cfg.mode === 'grid' ? 8 : 10),
        totalItemsServer: 0 // fetchPage modunda sunucudan gelen toplam kayıt
    };

    const container = () => document.getElementById(cfg.containerId);

    function applyClientFilterSort() {
        const q = state.search.trim().toLocaleLowerCase('tr-TR');
        state.filtered = state.allItems.filter(item => {
            if (!q) return true;
            if (!cfg.searchFields || !cfg.searchFields.length) return true;
            return cfg.searchFields.some(field => {
                const v = item[field];
                return v !== null && v !== undefined && v.toString().toLocaleLowerCase('tr-TR').includes(q);
            });
        });

        if (state.sortKey) {
            window.TableUtils.sortData(state.filtered, state.sortKey, state.sortDir === 'asc');
        }
    }

    function renderEmpty() {
        if (cfg.mode === 'table') {
            container().innerHTML = window.TableUtils.renderEmptyRow(cfg.emptyColspan || 1, cfg.emptyMessage);
        } else {
            container().innerHTML = `<div class="col-12 text-center text-muted py-4">${window.escapeHtml(cfg.emptyMessage || 'Kayıt bulunamadı.')}</div>`;
        }
        const pc = document.getElementById(cfg.paginationContainerId);
        if (pc) pc.innerHTML = '';
    }

    function renderItems(items) {
        if (!items.length) { renderEmpty(); return; }
        const html = cfg.mode === 'table'
            ? items.map(cfg.renderRow).join('')
            : items.map(cfg.renderCard).join('');
        container().innerHTML = html;
    }

    function drawPagination(totalItems, onPageChange, onPageSizeChange) {
        if (typeof buildPagination !== 'function') return;
        buildPagination(
            cfg.paginationContainerId,
            totalItems,
            state.page,
            state.pageSize,
            onPageChange,
            onPageSizeChange,
            cfg.mode === 'grid'
        );
    }

    // ---- CLIENT-SIDE MOD (cfg.fetchPage tanımlı DEĞİLSE) ----
    function refreshClientSide() {
        applyClientFilterSort();

        const totalItems = state.filtered.length;
        const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
        if (state.page > totalPages) state.page = totalPages;

        const start = (state.page - 1) * state.pageSize;
        const pageItems = state.filtered.slice(start, start + state.pageSize);

        renderItems(pageItems);
        drawPagination(
            totalItems,
            (newPage) => { state.page = newPage; refreshClientSide(); },
            (newSize) => { state.pageSize = newSize; state.page = 1; refreshClientSide(); }
        );
    }

    // ---- SERVER-SIDE MOD (cfg.fetchPage tanımlıysa) ----
    async function refreshServerSide() {
        container().innerHTML = cfg.mode === 'table'
            ? `<tr><td colspan="${cfg.emptyColspan || 1}" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm"></div> Yükleniyor...</td></tr>`
            : `<div class="col-12 text-center text-muted py-4"><div class="spinner-border text-primary"></div><br>Yükleniyor...</div>`;

        try {
            const { items, totalItems } = await cfg.fetchPage(state.page, state.pageSize, state.sortKey, state.sortDir);
            state.totalItemsServer = totalItems;

            if (!items || !items.length) { renderEmpty(); return; }

            renderItems(items);
            drawPagination(
                totalItems,
                (newPage) => { state.page = newPage; refreshServerSide(); },
                (newSize) => { state.pageSize = newSize; state.page = 1; refreshServerSide(); }
            );
        } catch (err) {
            container().innerHTML = cfg.mode === 'table'
                ? `<tr><td colspan="${cfg.emptyColspan || 1}" class="text-center text-danger py-4">Yüklenirken hata oluştu: ${window.escapeHtml(err.message)}</td></tr>`
                : `<div class="col-12 text-center text-danger py-4">Yüklenirken hata oluştu: ${window.escapeHtml(err.message)}</div>`;
        }
    }

    return {
        // Client-side veri kaynağı için: API'den gelen TÜM listeyi motora ver
        setItems(items) {
            state.allItems = items || [];
            state.page = 1;
            refreshClientSide();
        },
        setSearch(text) {
            state.search = text || '';
            state.page = 1;
            refreshClientSide();
        },
        setSort(key) {
            if (state.sortKey === key) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortKey = key;
                state.sortDir = 'asc';
            }
            cfg.fetchPage ? refreshServerSide() : refreshClientSide();
        },
        setSortState(key, dir) {
            state.sortKey = key;
            state.sortDir = dir || 'asc';
            cfg.fetchPage ? refreshServerSide() : refreshClientSide();
        },
        refresh() {
            cfg.fetchPage ? refreshServerSide() : refreshClientSide();
        },
        // Server-side veri kaynağı için: ilk sayfayı çek
        load(page = 1) {
            state.page = page;
            refreshServerSide();
        },
        getState() { return { ...state }; },
        getFilteredItems() {
            return state.filtered.slice(); // kopya döndür, dışarıdan mutasyon riskini engelle
        }
    };
}

window.createDataView = createDataView;
