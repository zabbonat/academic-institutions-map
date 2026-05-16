(function() {
    let countryChart = null;
    let typeChart = null;
    let ownershipChart = null;

    window.renderDashboard = function() {
        const data = window.appState.allData;
        if (!data || data.length === 0) return;

        // 1. Country Distribution
        const countryCounts = {};
        data.forEach(d => {
            countryCounts[d.c] = (countryCounts[d.c] || 0) + 1;
        });
        const topCountries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        renderBarChart('country-chart', countryChart, 
            topCountries.map(c => c[0]), 
            topCountries.map(c => c[1]), 
            'Institutions per Country', 
            (chart) => countryChart = chart
        );

        // 2. Type Distribution
        const typeCounts = {};
        data.forEach(d => {
            typeCounts[d.t] = (typeCounts[d.t] || 0) + 1;
        });
        renderPieChart('type-chart', typeChart, 
            Object.keys(typeCounts), 
            Object.values(typeCounts), 
            (chart) => typeChart = chart
        );

        // 3. Ownership Structure
        const ownCounts = {};
        data.forEach(d => {
            ownCounts[d.o] = (ownCounts[d.o] || 0) + 1;
        });
        renderPieChart('ownership-chart', ownershipChart, 
            Object.keys(ownCounts), 
            Object.values(ownCounts), 
            (chart) => ownershipChart = chart
        );
    };

    function renderBarChart(id, chartObj, labels, data, label, callback) {
        const ctx = document.getElementById(id).getContext('2d');
        if (chartObj) chartObj.destroy();
        
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e5e7eb' : '#374151';

        const newChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { ticks: { color: textColor }, grid: { display: false } },
                    y: { ticks: { color: textColor }, grid: { display: false } }
                }
            }
        });
        callback(newChart);
    }

    function renderPieChart(id, chartObj, labels, data, callback) {
        const ctx = document.getElementById(id).getContext('2d');
        if (chartObj) chartObj.destroy();

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e5e7eb' : '#374151';

        const newChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: window.appState.colorPalette,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { color: textColor, boxWidth: 12, font: { size: 10 } }
                    }
                }
            }
        });
        callback(newChart);
    }
})();
