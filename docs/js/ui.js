(function() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapse-sidebar');
    const expandBtn = document.getElementById('expand-sidebar');
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewContainers = document.querySelectorAll('.view-container');

    // Sidebar Toggle
    collapseBtn.onclick = () => {
        sidebar.classList.add('collapsed');
        expandBtn.classList.remove('hidden');
        // Trigger map resize after transition
        setTimeout(() => window.appState.map.invalidateSize(), 300);
    };

    expandBtn.onclick = () => {
        sidebar.classList.remove('collapsed');
        expandBtn.classList.add('hidden');
        setTimeout(() => window.appState.map.invalidateSize(), 300);
    };

    // View Switching
    navTabs.forEach(tab => {
        tab.onclick = () => {
            const targetView = tab.dataset.view;
            
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            viewContainers.forEach(vc => {
                if (vc.id === `${targetView}-view`) {
                    vc.classList.remove('hidden');
                    vc.classList.add('active');
                } else {
                    vc.classList.add('hidden');
                    vc.classList.remove('active');
                }
            });

            if (targetView === 'map') {
                window.appState.map.invalidateSize();
            } else if (targetView === 'dashboard') {
                if (window.renderDashboard) window.renderDashboard();
            }
        };
    });

    // Heatmap Toggle
    const heatmapToggle = document.getElementById('heatmap-toggle');
    let heatmapLayer = null;

    heatmapToggle.onchange = (e) => {
        const active = e.target.checked;
        if (active) {
            window.appState.clusterGroup.remove();
            renderHeatmap();
        } else {
            if (heatmapLayer) heatmapLayer.remove();
            window.appState.map.addLayer(window.appState.clusterGroup);
        }
    };

    function renderHeatmap() {
        const data = window.appState.allData;
        const points = data
            .filter(d => d.lat && d.lng)
            .map(d => [d.lat, d.lng, Math.sqrt(d.w || 1) / 10]); // Weight by works

        heatmapLayer = L.heatLayer(points, {
            radius: 20,
            blur: 15,
            maxZoom: 10,
            max: 1.0
        }).addTo(window.appState.map);
    }

})();
