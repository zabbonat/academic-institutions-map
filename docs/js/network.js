(function() {
    let network = null;
    const container = document.getElementById('network-graph');
    const placeholder = document.querySelector('.network-placeholder');
    const searchInput = document.getElementById('network-search-input');
    const searchResults = document.getElementById('network-search-results');
    const clearBtn = document.getElementById('clear-network');

    window.renderNetwork = function(seedId) {
        console.log('Rendering network for:', seedId);
        const allData = window.appState.dataById;
        const seed = allData[seedId];
        if (!seed) {
            console.error('Seed institution not found:', seedId);
            return;
        }

        try {
            placeholder.querySelector('p').style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'block';
            container.style.display = 'block';
            container.style.height = '100%'; // Force height

            const nodes = [];
            const edges = [];
            const processed = new Set();
            
            // 1. Add Seed Node
            const seedColor = window.getColorForType ? window.getColorForType(seed.t) : '#97C2FC';
            nodes.push({
                id: seed.id,
                label: seed.n.length > 30 ? seed.n.substring(0, 27) + '...' : seed.n,
                title: seed.n,
                color: { background: seedColor, border: '#2B7CE9' },
                font: { color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000' },
                value: Math.sqrt(seed.w || 1) * 2,
                size: 30,
                borderWidth: 3
            });
            processed.add(seed.id);

            // 2. Find Related Institutions (One-pass optimization)
            if (seed.l && Array.isArray(seed.l)) {
                const seedLineages = new Set(seed.l);
                const allInsts = window.appState.allData; // Use the array directly for faster iteration
                
                for (let i = 0; i < allInsts.length; i++) {
                    const other = allInsts[i];
                    if (other.id === seed.id) continue;
                    
                    if (other.l && Array.isArray(other.l)) {
                        let shared = false;
                        for (let j = 0; j < other.l.length; j++) {
                            if (seedLineages.has(other.l[j])) {
                                shared = true;
                                break;
                            }
                        }
                        
                        if (shared) {
                            const otherColor = window.getColorForType ? window.getColorForType(other.t) : '#97C2FC';
                            nodes.push({
                                id: other.id,
                                label: other.n.length > 20 ? other.n.substring(0, 17) + '...' : other.n,
                                title: other.n,
                                color: { background: otherColor, border: '#2B7CE9' },
                                font: { color: document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000' },
                                value: Math.sqrt(other.w || 1)
                            });
                            edges.push({ from: seed.id, to: other.id });
                        }
                    }
                }
            }

            console.log(`Found ${nodes.length} nodes and ${edges.length} edges`);

            const data = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges)
            };

            const options = {
                nodes: {
                    shape: 'dot',
                    scaling: { label: { min: 8, max: 20 } },
                    font: { face: 'Inter' }
                },
                edges: {
                    color: { inherit: 'from', opacity: 0.5 },
                    smooth: { type: 'continuous' }
                },
                physics: {
                    enabled: true,
                    stabilization: { iterations: 150 },
                    barnesHut: { gravitationalConstant: -2000, springLength: 150 }
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
        } catch (err) {
            console.error('Error rendering network:', err);
            placeholder.style.display = 'block';
            placeholder.innerHTML = `<p style="color:red">Error rendering network: ${err.message}</p>`;
        }
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

    function clearNetwork() {
        if (network) {
            network.destroy();
            network = null;
        }
        container.style.display = 'none';
        placeholder.querySelector('p').style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'none';
        searchInput.value = '';
    }

    if (clearBtn) {
        clearBtn.onclick = clearNetwork;
    }

})();
