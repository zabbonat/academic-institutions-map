window.showDetail = function(ror_id) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    // Find the data locally
    const data = window.appState.allData.find(d => d.id === ror_id);
    
    if (!data) {
        panel.classList.remove('hidden');
        content.innerHTML = `<div class="detail-loader">Error: Institution not found.</div>`;
        return;
    }

    panel.classList.remove('hidden');
    renderDetailContent(data);
};

document.getElementById('close-detail').addEventListener('click', () => {
    document.getElementById('detail-panel').classList.add('hidden');
});

function renderDetailContent(data) {
    const content = document.getElementById('detail-content');

    let html = '';

    // Header
    html += '<div class="inst-header">';
    html += `<h2 class="inst-name">${data.n}</h2>`;
    html += `<div class="inst-meta">${data.t || 'Unknown'} • ${data.o || 'Unknown'} • ${data.c || 'Unknown'}</div>`;
    html += '</div>';

    // Stats — always total
    html += `
        <div class="stat-grid">
            <div class="stat-box">
                <div class="stat-value">${(data.w || 0).toLocaleString()}</div>
                <div class="stat-label">Works</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${(data.cb || 0).toLocaleString()}</div>
                <div class="stat-label">Citations</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.h || 0}</div>
                <div class="stat-label">h-index</div>
            </div>
        </div>
    `;

    // Disciplines
    if (data.f && Array.isArray(data.f) && data.f.length > 0) {
        html += `<h3 class="section-title">Disciplines</h3>`;
        html += '<div class="tag-list">';
        data.f.forEach(field => {
            html += `<span class="tag">${field}</span>`;
        });
        html += '</div>';
    }

    // Links
    html += `<h3 class="section-title">Links</h3>`;
    html += '<ul class="links-list">';
    if (data.u) {
        html += `<li><a href="${data.u}" target="_blank">Homepage</a></li>`;
    }
    if (data.wiki) {
        html += `<li><a href="${data.wiki}" target="_blank">Wikipedia</a></li>`;
    }
    html += `<li><a href="https://ror.org/${data.id}" target="_blank">ROR</a></li>`;
    html += `<li><a href="https://openalex.org/institutions/ror:${data.id}" target="_blank">OpenAlex</a></li>`;
    html += '</ul>';

    content.innerHTML = html;
}
