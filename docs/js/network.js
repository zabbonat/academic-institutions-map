(function() {
    let network = null;
    const container = document.getElementById('network-graph');
    const placeholder = document.querySelector('.network-placeholder');
    const searchInput = document.getElementById('network-search-input');
    const searchResults = document.getElementById('network-search-results');

    window.renderNetwork = function(seedId) {
        const allData = window.appState.dataById;
        const seed = allData[seedId];
        if (!seed) return;

        placeholder.style.display = 'none';
        container.style.display = 'block';

        const nodes = [];
        const edges = [];
        const processed = new Set();
        
        // Find all related institutions (up to 2 levels deep)
        function traverse(instId, level) {
            if (level > 2 || processed.has(instId)) return;
            processed.add(instId);

            const inst = allData[instId];
            if (!inst) return;

            nodes.push({
                id: inst.id,
                label: inst.n.length > 30 ? inst.n.substring(0, 27) + '...' : inst.n,
                title: inst.n,
                color: {
                    background: window.appState.colors[inst.t] || '#97C2FC',
                    border: '#2B7CE9'
                },
                value: Math.sqrt(inst.w || 1),
                group: inst.t
            });

            if (inst.l && Array.isArray(inst.l)) {
                // Find others that share these lineage IDs
                // This is expensive if we do it for everyone.
                // Instead, let's just use the 'l' array as a grouping mechanism.
                // Or better: connect institutions that share at least one common lineage ID.
                
                // For simplicity in the first version, let's connect institutions
                // that are explicitly linked via common lineage IDs in a star-like pattern
                // or just show the immediate "network" of the seed.
            }
        }

        // Simpler approach for now: find all institutions that share ANY lineage ID with the seed
        if (seed.l && Array.isArray(seed.l)) {
            traverse(seed.id, 0);
            
            const seedLineages = new Set(seed.l);
            Object.values(allData).forEach(other => {
                if (other.id === seed.id) return;
                if (other.l && Array.isArray(other.l)) {
                    if (other.l.some(lid => seedLineages.has(lid))) {
                        nodes.push({
                            id: other.id,
                            label: other.n.length > 20 ? other.n.substring(0, 17) + '...' : other.n,
                            title: other.n,
                            color: window.appState.colors[other.t] || '#97C2FC',
                            value: Math.sqrt(other.w || 1)
                        });
                        edges.push({ from: seed.id, to: other.id });
                    }
                }
            });
        }

        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        const options = {
            nodes: {
                shape: 'dot',
                scaling: { label: { min: 8, max: 20 } },
                font: { size: 12, face: 'Inter' }
            },
            edges: {
                color: { inherit: 'from' },
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: false,
                barnesHut: { gravitationalConstant: -2000, springLength: 200 }
            },
            interaction: { hover: true, tooltipDelay: 200 }
        };

        if (network) network.destroy();
        network = new vis.Network(container, data, options);
        
        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (window.showDetail) window.showDetail(nodeId);
            }
        });
    };

    // Integrate with search for seed selection
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }

            // We can use the existing search system if accessible, or just a simple filter
            const matches = Object.values(window.appState.dataById)
                .filter(inst => inst.n.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 10);

            if (matches.length > 0) {
                searchResults.innerHTML = matches.map(m => `
                    <div class="search-result-item" data-id="${m.id}">
                        <div class="search-result-name">${m.n}</div>
                        <div class="search-result-meta">${m.t} • ${m.c}</div>
                    </div>
                `).join('');
                searchResults.classList.remove('hidden');
                
                searchResults.querySelectorAll('.search-result-item').forEach(item => {
                    item.onclick = () => {
                        const id = item.dataset.id;
                        searchInput.value = matches.find(m => m.id === id).n;
                        searchResults.classList.add('hidden');
                        renderNetwork(id);
                    };
                });
            } else {
                searchResults.innerHTML = '<div class="search-result-item">No matches found</div>';
                searchResults.classList.remove('hidden');
            }
        });
    }

    // Global listener to trigger from detail panel
    window.showNetwork = function(id) {
        // Switch to network view
        const networkTab = document.querySelector('.nav-tab[data-view="network"]');
        if (networkTab) networkTab.click();
        renderNetwork(id);
    };

})();
