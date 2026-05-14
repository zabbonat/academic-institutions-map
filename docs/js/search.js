let searchIndex;
let searchDocs = [];

async function initSearch() {
    try {
        const response = await fetch('data/search_docs.json');
        searchDocs = await response.json();

        // Initialize FlexSearch Document index
        searchIndex = new FlexSearch.Document({
            document: {
                id: "ror_id",
                index: [
                    "display_name",
                    "alternatives",
                    "acronyms"
                ],
                store: true
            },
            tokenize: "forward",
            cache: true
        });

        // Add documents to index
        searchDocs.forEach(doc => {
            // Join arrays into strings for searching
            const alternatives = (doc.alternatives || []).join(" ");
            const acronyms = (doc.acronyms || []).join(" ");
            
            searchIndex.add({
                ror_id: doc.ror_id,
                display_name: doc.display_name,
                alternatives: alternatives,
                acronyms: acronyms
            });
        });

        setupSearchUI();

    } catch (error) {
        console.error("Error initializing search:", error);
    }
}

function setupSearchUI() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    // Create a map for quick document retrieval by ror_id
    const docMap = new Map();
    searchDocs.forEach(d => docMap.set(d.ror_id, d));

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        // Perform search across fields
        const results = searchIndex.search(query, 10, {
            enrich: true
        });

        // Collect unique IDs from all matched fields
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
        
        // Take top 10
        const topIds = Array.from(matchedIds).slice(0, 10);
        
        topIds.forEach(id => {
            const doc = docMap.get(id);
            if (!doc) return;

            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-name">${doc.display_name}</div>
                <div class="search-result-meta">${doc.institution_type} • ${doc.country_code || 'Unknown'}</div>
            `;
            
            item.addEventListener('click', () => {
                searchInput.value = doc.display_name;
                searchResults.classList.add('hidden');
                
                // Fly to map marker and open details
                if (window.flyToInstitution) {
                    window.flyToInstitution(doc.ror_id);
                }
                
                // On mobile, close sidebar automatically
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });

            searchResults.appendChild(item);
        });

        searchResults.classList.remove('hidden');
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
});
