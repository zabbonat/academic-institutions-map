let sparklineChart = null;

window.showDetail = async function(ror_id) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    // Show panel with loader
    panel.classList.remove('hidden');
    content.innerHTML = '<div class="detail-loader">Loading...</div>';

    try {
        const response = await fetch(`data/institutions/${ror_id}.json`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        renderDetailContent(data);
    } catch (error) {
        console.error("Error loading institution details:", error);
        content.innerHTML = `<div class="detail-loader">Error loading details.</div>`;
    }
};

document.getElementById('close-detail').addEventListener('click', () => {
    document.getElementById('detail-panel').classList.add('hidden');
});

function renderDetailContent(data) {
    const content = document.getElementById('detail-content');
    
    // Destroy previous chart if exists
    if (sparklineChart) {
        sparklineChart.destroy();
        sparklineChart = null;
    }

    let html = '';

    // Header
    html += '<div class="inst-header">';
    if (data.image_thumbnail_url) {
        html += `<img src="${data.image_thumbnail_url}" alt="Logo" class="inst-logo">`;
    }
    html += `<h2 class="inst-name">${data.display_name}</h2>`;
    html += `<div class="inst-meta">${data.institution_type} • ${data.country_code || 'Unknown'}</div>`;
    html += '</div>';

    // Stats
    const hIndex = data.summary_stats?.h_index || 0;
    html += `
        <div class="stat-grid">
            <div class="stat-box">
                <div class="stat-value">${(data.works_count || 0).toLocaleString()}</div>
                <div class="stat-label">Works</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${(data.cited_by_count || 0).toLocaleString()}</div>
                <div class="stat-label">Citations</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${hIndex}</div>
                <div class="stat-label">h-index</div>
            </div>
        </div>
    `;

    // Chart
    if (data.counts_by_year && data.counts_by_year.length > 0) {
        html += `<h3 class="section-title">Works by Year</h3>`;
        html += `<div class="chart-container"><canvas id="sparkline-canvas"></canvas></div>`;
    }

    // Topics
    if (data.topics && data.topics.length > 0) {
        html += `<h3 class="section-title">Top Topics</h3>`;
        html += '<div class="tag-list">';
        data.topics.forEach(t => {
            html += `<span class="tag" title="${t.count} works">${t.display_name || t.id}</span>`;
        });
        html += '</div>';
    }

    // Concepts
    if (data.x_concepts && data.x_concepts.length > 0) {
        html += `<h3 class="section-title">Top Concepts</h3>`;
        html += '<div class="tag-list">';
        data.x_concepts.forEach(c => {
            html += `<span class="tag" title="Score: ${parseFloat(c.score).toFixed(2)}">${c.display_name || c.id}</span>`;
        });
        html += '</div>';
    }

    // Associated Institutions
    if (data.associated_institutions && data.associated_institutions.length > 0) {
        html += `<h3 class="section-title">Associated Institutions</h3>`;
        html += '<ul class="associated-insts">';
        data.associated_institutions.forEach(inst => {
            if (inst.ror_id) {
                // If it has a ROR, make it clickable
                const cleanId = inst.ror_id.split('/').pop();
                html += `<li><a onclick="window.flyToInstitution('${cleanId}')">${inst.display_name} (${inst.relationship})</a></li>`;
            } else {
                html += `<li>${inst.display_name} (${inst.relationship})</li>`;
            }
        });
        html += '</ul>';
    }

    // Links
    html += `<h3 class="section-title">Links</h3>`;
    html += '<ul class="links-list">';
    if (data.homepage_url) {
        html += `<li><a href="${data.homepage_url}" target="_blank">Homepage</a></li>`;
    }
    if (data.wikipedia_url) {
        html += `<li><a href="${data.wikipedia_url}" target="_blank">Wikipedia</a></li>`;
    }
    if (data.ror) {
        html += `<li><a href="${data.ror}" target="_blank">ROR</a></li>`;
    }
    if (data.id) {
        html += `<li><a href="${data.id}" target="_blank">OpenAlex</a></li>`;
    }
    html += '</ul>';

    content.innerHTML = html;

    // Render Chart
    if (data.counts_by_year && data.counts_by_year.length > 0) {
        renderChart(data.counts_by_year);
    }
}

function renderChart(counts_by_year) {
    const canvas = document.getElementById('sparkline-canvas');
    if (!canvas) return;

    // Sort ascending by year
    const sorted = [...counts_by_year].sort((a, b) => a.year - b.year);
    
    const labels = sorted.map(d => d.year);
    const data = sorted.map(d => d.works_count);

    const ctx = canvas.getContext('2d');
    
    sparklineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Works',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' works';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 5
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f3f4f6'
                    },
                    ticks: {
                        maxTicksLimit: 4
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}
