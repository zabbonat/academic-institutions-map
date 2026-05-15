window.showDetail = function(ror_id) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    // Use O(1) lookup
    const data = window.appState.dataById[ror_id];
    
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
    
    if (data.a && Array.isArray(data.a) && data.a.length > 0) {
        html += `<div class="inst-alt-names">Also known as: ${data.a.join(', ')}</div>`;
    }
    
    html += `<div class="inst-meta">${data.t || 'Unknown'} • ${data.o || 'Unknown'} • ${data.c || 'Unknown'}</div>`;
    html += '</div>';

    // Lineage Button (Only show if there are actual other institutions in the network)
    const counts = window.appState.lineageCounts || {};
    const hasPeers = data.l && Array.isArray(data.l) && data.l.some(lid => (counts[lid] || 0) > 1);

    if (hasPeers) {
        html += `
            <button id="show-lineage-btn" class="detail-btn">
                <span>🔗</span> Show Related Institutions
            </button>
        `;
    }

    const isInCompare = window.appState.compareList.includes(data.id);
    html += `
        <button id="compare-btn" class="detail-btn ${isInCompare ? 'active' : ''}" style="margin-top: ${hasPeers ? '0' : '0'};">
            <span>⚖️</span> ${isInCompare ? 'Remove from Compare' : 'Add to Compare'}
        </button>
    `;

    // Stats
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
    if (data.u) html += `<li><a href="${data.u}" target="_blank">Homepage</a></li>`;
    if (data.wiki) html += `<li><a href="${data.wiki}" target="_blank">Wikipedia</a></li>`;
    html += `<li><a href="https://ror.org/${data.id}" target="_blank">ROR</a></li>`;
    html += `<li><a href="https://openalex.org/institutions/ror:${data.id}" target="_blank">OpenAlex</a></li>`;
    html += '</ul>';

    content.innerHTML = html;

    // Attach event listener to lineage button
    const lineageBtn = document.getElementById('show-lineage-btn');
    if (lineageBtn) {
        lineageBtn.onclick = () => {
            if (window.setLineageFilter) {
                window.setLineageFilter(data.l, data.n);
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            }
        };
    }

    // Attach event listener to compare button
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.onclick = () => {
            const list = window.appState.compareList;
            const idx = list.indexOf(data.id);
            if (idx > -1) {
                list.splice(idx, 1);
            } else {
                if (list.length >= 2) {
                    alert('You can compare up to 2 institutions. Please remove one first.');
                    return;
                }
                list.push(data.id);
            }
            // Re-render button state
            renderDetailContent(data);
            // Notify comparison system
            window.dispatchEvent(new CustomEvent('compareListUpdated'));
        };
    }
}
