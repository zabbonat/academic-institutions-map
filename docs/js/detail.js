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
    
    // Get current discipline filter (if any)
    const disciplineSelect = document.getElementById('discipline-filter');
    const activeDiscipline = disciplineSelect ? disciplineSelect.value : '';

    let html = '';

    // Header
    html += '<div class="inst-header">';
    html += `<h2 class="inst-name">${data.n}</h2>`;
    html += `<div class="inst-meta">${data.t || 'Unknown'} • ${data.o || 'Unknown'} • ${data.c || 'Unknown'}</div>`;
    html += '</div>';

    // Stats — discipline-aware
    const hIndex = data.h || 0;
    const totalWorks = data.w || 0;
    const totalCitations = data.cb || 0;

    let worksDisplay = totalWorks.toLocaleString();
    let worksLabel = 'Works';

    if (activeDiscipline && data.f && data.f[activeDiscipline]) {
        const discWorks = data.f[activeDiscipline];
        worksDisplay = discWorks.toLocaleString();
        worksLabel = `Works in ${activeDiscipline}`;
    }

    html += `
        <div class="stat-grid">
            <div class="stat-box">
                <div class="stat-value">${worksDisplay}</div>
                <div class="stat-label">${worksLabel}</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${totalCitations.toLocaleString()}</div>
                <div class="stat-label">Citations</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${hIndex}</div>
                <div class="stat-label">h-index</div>
            </div>
        </div>
    `;

    // If discipline is active, also show total works for context
    if (activeDiscipline && data.f && data.f[activeDiscipline]) {
        html += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Total works (all fields): ${totalWorks.toLocaleString()}</div>`;
    }

    // Discipline Breakdown
    if (data.f && Object.keys(data.f).length > 0) {
        html += `<h3 class="section-title">Disciplines</h3>`;
        
        // Sort by count descending
        const sortedFields = Object.entries(data.f).sort((a, b) => b[1] - a[1]);
        
        html += '<div style="max-height: 200px; overflow-y: auto;">';
        sortedFields.forEach(([field, count]) => {
            const isActive = field === activeDiscipline;
            const barWidth = Math.round((count / sortedFields[0][1]) * 100);
            html += `
                <div style="margin-bottom: 6px; ${isActive ? 'font-weight: 600;' : ''}">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 2px;">
                        <span>${field}</span>
                        <span>${count.toLocaleString()}</span>
                    </div>
                    <div style="background: var(--border-color); border-radius: 4px; height: 6px;">
                        <div style="background: ${isActive ? 'var(--primary-color)' : '#94a3b8'}; width: ${barWidth}%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
            `;
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
    
    // Construct URLs
    html += `<li><a href="https://ror.org/${data.id}" target="_blank">ROR</a></li>`;
    html += `<li><a href="https://openalex.org/institutions/ror:${data.id}" target="_blank">OpenAlex</a></li>`;
    
    html += '</ul>';

    content.innerHTML = html;
}
