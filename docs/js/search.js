let searchIndex;

window.addEventListener('dataLoaded', () => {
    // Initialize FlexSearch Document index
    searchIndex = new FlexSearch.Document({
        document: {
            id: "id",
            index: ["n"], // only display_name
            store: true
        },
        tokenize: "forward",
        cache: true
    });

    const data = window.appState.allData;

    // Add documents to index
    data.forEach(doc => {
        searchIndex.add({
            id: doc.id,
            n: doc.n
        });
    });

    setupSearchUI();
});

function setupSearchUI() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        const results = searchIndex.search(query, 10, {
            enrich: true
        });

        const matchedIds = new Set();
        results.forEach(fieldResult => {
            fieldResult.result.forEach(r => matchedIds.add(r.id));
        });

        if (matchedIds.size === 0) {
            searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-meta">No results found</span></div>';
            searchResults.classList.remove('hidden');
            return;
        }

        searchResults.innerHTML = '';
        
        const topIds = Array.from(matchedIds).slice(0, 10);
        
        topIds.forEach(id => {
            // Find in global data
            const doc = window.appState.allData.find(d => d.id === id);
            if (!doc) return;

            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-name">${doc.n}</div>
                <div class="search-result-meta">${doc.t || 'Unknown'} • ${doc.c || 'Unknown'}</div>
            `;
            
            item.addEventListener('click', () => {
                searchInput.value = doc.n;
                searchResults.classList.add('hidden');
                
                if (window.flyToInstitution) {
                    window.flyToInstitution(doc.id);
                }
                
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });

            searchResults.appendChild(item);
        });

        searchResults.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}
