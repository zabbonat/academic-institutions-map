let activeFilters = {
    types: new Set(),
    countries: new Set(),
    minWorks: 0
};

let currentSort = {
    column: 'w',
    desc: true
};

window.addEventListener('dataLoaded', (e) => {
    const { types, countries } = e.detail;
    
    // By default all types are active
    activeFilters.types = new Set(types);

    buildTypeFilters(types);
    buildCountryFilters(countries);
    setupSlider();
    
    // Initial render of table
    updateTable(window.appState.allData);
    setupTableSorting();

    // Setup Top Institutions toggle
    const toggleTop = document.getElementById('toggle-top-institutions');
    const topContent = document.getElementById('top-institutions-content');
    const topIcon = document.getElementById('top-inst-icon');

    toggleTop.addEventListener('click', () => {
        if (topContent.style.display === 'none') {
            topContent.style.display = 'block';
            topIcon.textContent = '▲';
        } else {
            topContent.style.display = 'none';
            topIcon.textContent = '▼';
        }
    });
});

function buildTypeFilters(types) {
    const container = document.getElementById('type-filters');
    container.innerHTML = '';

    types.forEach(type => {
        const color = window.appState.colors[type];
        const label = document.createElement('label');
        
        label.innerHTML = `
            <input type="checkbox" value="${type}" checked>
            <span class="color-dot" style="background-color: ${color}"></span>
            ${type}
        `;

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                activeFilters.types.add(type);
            } else {
                activeFilters.types.delete(type);
            }
            applyFilters();
        });

        container.appendChild(label);
    });
}

function buildCountryFilters(countries) {
    const container = document.getElementById('country-filters');
    container.innerHTML = '';
    
    // Sort countries alphabetically
    const sortedCountries = countries.filter(c => c).sort();

    sortedCountries.forEach(country => {
        const label = document.createElement('label');
        label.className = 'country-label';
        
        label.innerHTML = `
            <input type="checkbox" value="${country}">
            ${country}
        `;

        const checkbox = label.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                activeFilters.countries.add(country);
            } else {
                activeFilters.countries.delete(country);
            }
            applyFilters();
        });

        container.appendChild(label);
    });

    // Country Search
    const searchInput = document.getElementById('country-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const labels = container.querySelectorAll('.country-label');
        labels.forEach(label => {
            const country = label.textContent.trim().toLowerCase();
            if (country.includes(query)) {
                label.style.display = 'flex';
            } else {
                label.style.display = 'none';
            }
        });
    });

    // Clear All
    const clearBtn = document.getElementById('clear-country-filter');
    clearBtn.addEventListener('click', () => {
        activeFilters.countries.clear();
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        searchInput.value = '';
        
        // Reset display
        const labels = container.querySelectorAll('.country-label');
        labels.forEach(label => label.style.display = 'flex');

        applyFilters();
    });
}

function setupSlider() {
    const slider = document.getElementById('works-slider');
    const display = document.getElementById('works-slider-val');

    slider.addEventListener('input', (e) => {
        display.textContent = parseInt(e.target.value, 10).toLocaleString();
    });

    slider.addEventListener('change', (e) => {
        activeFilters.minWorks = parseInt(e.target.value, 10);
        applyFilters();
    });
}

function applyFilters() {
    const visibleMarkers = [];
    const filteredData = [];

    window.appState.allData.forEach(inst => {
        const matchType = activeFilters.types.has(inst.t || 'Unknown');
        const matchCountry = activeFilters.countries.size === 0 || activeFilters.countries.has(inst.c);
        const matchWorks = (inst.w || 0) >= activeFilters.minWorks;

        if (matchType && matchCountry && matchWorks) {
            filteredData.push(inst);
            const marker = window.appState.markersById[inst.id];
            if (marker) visibleMarkers.push(marker);
        }
    });

    // Update map
    window.appState.clusterGroup.clearLayers();
    window.appState.clusterGroup.addLayers(visibleMarkers);

    // Update table
    updateTable(filteredData);
}

function updateTable(data) {
    const tbody = document.querySelector('#top-institutions-table tbody');
    tbody.innerHTML = '';

    // Update subtitle
    const subtitle = document.getElementById('top-inst-subtitle');
    subtitle.textContent = `Showing top 50 of ${data.length.toLocaleString()} filtered institutions`;

    // Sort data
    const sorted = [...data].sort((a, b) => {
        const valA = a[currentSort.column] || 0;
        const valB = b[currentSort.column] || 0;
        
        if (typeof valA === 'string') {
            return currentSort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        
        return currentSort.desc ? valB - valA : valA - valB;
    });

    // Take top 50 for performance
    const top50 = sorted.slice(0, 50);

    top50.forEach(inst => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500">${inst.n}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted)">${inst.c || ''}</div>
            </td>
            <td>${(inst.w || 0).toLocaleString()}</td>
            <td>${(inst.cb || 0).toLocaleString()}</td>
        `;
        
        tr.addEventListener('click', () => {
            if (window.flyToInstitution) {
                window.flyToInstitution(inst.id);
            }
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
        
        tbody.appendChild(tr);
    });
}

function setupTableSorting() {
    const headers = document.querySelectorAll('#top-institutions-table th[data-sort]');
    
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            
            if (currentSort.column === column) {
                currentSort.desc = !currentSort.desc;
            } else {
                currentSort.column = column;
                currentSort.desc = true;
            }

            // Update UI
            headers.forEach(h => {
                h.classList.remove('active-sort', 'desc', 'asc');
            });
            th.classList.add('active-sort', currentSort.desc ? 'desc' : 'asc');

            // Re-apply filters which will re-sort and render
            applyFilters();
        });
    });
}
