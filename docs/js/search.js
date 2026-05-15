let searchWorker;
let isSearchReady = false;

window.addEventListener('dataLoaded', () => {
    // Initialize Web Worker
    searchWorker = new Worker('js/search-worker.js');

    const data = window.appState.allData;

    // Send data to worker for indexing
    searchWorker.postMessage({ 
        type: 'init', 
        data: data.map(d => ({ id: d.id, n: d.n, a: d.a })) 
    });

    searchWorker.onmessage = function(e) {
        if (e.data.type === 'ready') {
            isSearchReady = true;
            console.log('Search index ready');
        } else if (e.data.type === 'progress') {
            // Optional: update a search loading indicator
        }
    };

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

        if (!isSearchReady) {
            searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-meta">Indexing...</span></div>';
            searchResults.classList.remove('hidden');
            return;
        }

        // Send search request to worker
        searchWorker.postMessage({ type: 'search', query });

        // Listen for results for this specific query
        const onResults = (msg) => {
            if (msg.data.type === 'results' && msg.data.query === query) {
                renderResults(msg.data.ids);
                // We don't remove the listener here because we want to keep handling messages, 
                // but actually we should probably have a single listener for all search results.
            }
        };
        
        // Better: define the listener once in setupSearchUI or dataLoaded
    };

    const renderResults = (matchedIds) => {
        if (matchedIds.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-meta">No results found</span></div>';
            searchResults.classList.remove('hidden');
            return;
        }

        searchResults.innerHTML = '';
        
        const topIds = matchedIds.slice(0, 15);
        
        topIds.forEach(id => {
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
                if (window.flyToInstitution) window.flyToInstitution(doc.id);
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('open');
                }
            });

            searchResults.appendChild(item);
        });

        searchResults.classList.remove('hidden');
    };

    // Global listener for worker messages (replace the one in dataLoaded or extend it)
    searchWorker.addEventListener('message', (e) => {
        if (e.data.type === 'results') {
            const currentQuery = searchInput.value.trim();
            if (e.data.query === currentQuery) {
                renderResults(e.data.ids);
            }
        }
    });

    const debouncedSearch = debounce(handleSearch, 200);
    searchInput.addEventListener('input', debouncedSearch);

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}
