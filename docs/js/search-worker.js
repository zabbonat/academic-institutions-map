importScripts('https://cdn.jsdelivr.net/gh/nextapps-de/flexsearch@0.7.31/dist/flexsearch.bundle.js');

let searchIndex;

self.onmessage = function(e) {
    const { type, data, query } = e.data;

    if (type === 'init') {
        searchIndex = new FlexSearch.Document({
            document: {
                id: "id",
                index: ["n", "a"],
                store: true
            },
            tokenize: "forward",
            cache: true
        });

        // Add documents in chunks to avoid blocking worker too much
        const chunkSize = 5000;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            chunk.forEach(doc => {
                searchIndex.add({
                    id: doc.id,
                    n: doc.n,
                    a: doc.a ? doc.a.join(' ') : ''
                });
            });
            // Report progress back if needed
            self.postMessage({ type: 'progress', percent: Math.round((i + chunk.length) / data.length * 100) });
        }
        self.postMessage({ type: 'ready' });
    }

    if (type === 'search') {
        if (!searchIndex) return;
        
        const results = searchIndex.search(query, 10, {
            enrich: true
        });

        const matchedIds = new Set();
        results.forEach(fieldResult => {
            fieldResult.result.forEach(r => matchedIds.add(r.id));
        });

        self.postMessage({ type: 'results', query, ids: Array.from(matchedIds) });
    }
};
