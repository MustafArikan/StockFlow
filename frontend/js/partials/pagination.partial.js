// isGrid = false varsayılan parametresi eklendi
function buildPaginationHtml(totalItems, currentPage, pageSize, totalPages, startItem, endItem, isGrid = false) {
    let html = `
    <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="text-muted small">
            ${startItem}-${endItem} / ${totalItems} kayıt
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center">`;

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;

    // DİNAMİK SEÇENEK MOTORU: Grid ise 8'in katları, değilse 10'un katları
    const options = isGrid ? [8, 24, 48, 96] : [10, 25, 50, 100];

    // Map ve join ile daha temiz HTML üretimi
    const optionsHtml = options.map(opt =>
        `<option value="${opt}" ${pageSize === opt ? 'selected' : ''}>${opt} Kayıt</option>`
    ).join('');

    html += ` 
            </ul>
        </nav>
        <div>
            <select class="form-select form-select-sm shadow-sm page-size-action w-auto">
                ${optionsHtml}
            </select>
        </div>
    </div>`;

    return html;
}