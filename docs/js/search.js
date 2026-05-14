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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupSearchUI() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults) return;

    const handleSearch = (e) => {
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
            // Use O(1) lookup
            const doc = window.appState.dataById[id];
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
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('open');
                }
            });

            searchResults.appendChild(item);
        });

        searchResults.classList.remove('hidden');
    };

    const debouncedSearch = debounce(handleSearch, 200);
    searchInput.addEventListener('input', debouncedSearch);

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}
