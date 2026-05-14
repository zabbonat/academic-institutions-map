let activeFilters = {
    types: new Set(),
    countries: new Set(),
    minWorks: 0
};

let currentSort = {
    column: 'works_count',
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
    const select = document.getElementById('country-filter');
    select.innerHTML = '';

    countries.forEach(country => {
        if (!country) return;
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        activeFilters.countries.clear();
        Array.from(e.target.selectedOptions).forEach(opt => {
            activeFilters.countries.add(opt.value);
        });
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
        const matchType = activeFilters.types.has(inst.institution_type);
        const matchCountry = activeFilters.countries.size === 0 || activeFilters.countries.has(inst.country_code);
        const matchWorks = (inst.works_count || 0) >= activeFilters.minWorks;

        if (matchType && matchCountry && matchWorks) {
            filteredData.push(inst);
            const marker = window.appState.markersById[inst.ror_id];
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
                <div style="font-weight: 500">${inst.display_name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted)">${inst.country_code || ''}</div>
            </td>
            <td>${(inst.works_count || 0).toLocaleString()}</td>
            <td>${(inst.cited_by_count || 0).toLocaleString()}</td>
        `;
        
        tr.addEventListener('click', () => {
            if (window.flyToInstitution) {
                window.flyToInstitution(inst.ror_id);
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
