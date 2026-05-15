let activeFilters = {
    types: new Set(),
    ownerships: new Set(),
    countries: new Set(),
    discipline: '',
    minWorks: 0,
    lineageIds: null,
    lineageRootName: ''
};

let currentSort = {
    column: 'w',
    desc: true
};

window.addEventListener('dataLoaded', (e) => {
    const { types, countries, ownerships } = e.detail;
    
    // By default all types and ownerships are active
    activeFilters.types = new Set(types);
    activeFilters.ownerships = new Set(ownerships);
    
    buildTypeFilters(types);
    buildOwnershipFilters(ownerships);
    buildCountryFilters(countries);
    setupSlider();
    setupTableSorting();
    setupLineageControls();
    setupDarkMode();
    
    // Initial apply will happen after markers start loading
    // but we can schedule a debounced one
    debouncedApplyFilters();

    // Setup Top Institutions toggle
    const toggleTop = document.getElementById('toggle-top-institutions');
    const topContent = document.getElementById('top-institutions-content');
    const topIcon = document.getElementById('top-inst-icon');

    if (toggleTop) {
        toggleTop.addEventListener('click', () => {
            if (topContent.style.display === 'none') {
                topContent.style.display = 'block';
                topIcon.textContent = '▲';
            } else {
                topContent.style.display = 'none';
                topIcon.textContent = '▼';
            }
        });
    }
});

// Handle late fields update
window.addEventListener('fieldsUpdated', (e) => {
    buildDisciplineFilters(e.detail.fields);
});

function setupDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
        // Set initial icon
        toggle.textContent = document.body.classList.contains('dark-mode') ? '🌙' : '💡';
        
        toggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('dark-mode', isDark);
            toggle.textContent = isDark ? '🌙' : '💡';
            
            if (window.updateMapTheme) {
                window.updateMapTheme();
            }
        });
    }
}

function setupLineageControls() {
    const clearBtn = document.getElementById('clear-lineage-filter');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            activeFilters.lineageIds = null;
            activeFilters.lineageRootName = '';
            document.getElementById('lineage-active-banner').classList.add('hidden');
            applyFilters();
        });
    }
}

window.setLineageFilter = function(lineageIds, rootName) {
    activeFilters.lineageIds = lineageIds;
    activeFilters.lineageRootName = rootName;
    
    const banner = document.getElementById('lineage-active-banner');
    const info = document.getElementById('lineage-info');
    if (banner && info) {
        banner.classList.remove('hidden');
        info.innerHTML = `
            <div>Showing institutions related to: <strong>${rootName}</strong></div>
            <div style="margin-top: 8px; font-style: italic; color: rgba(255,255,255,0.8);">P.S. Zoom out to see the full global network!</div>
        `;
    }
    
    applyFilters();

    // Auto-zoom to fit the lineage
    if (window.appState.map) {
        const lineagePoints = [];
        window.appState.allData.forEach(inst => {
            if (inst.lat && inst.lng && inst.l && Array.isArray(inst.l)) {
                if (inst.l.some(id => lineageIds.includes(id))) {
                    lineagePoints.push([inst.lat, inst.lng]);
                }
            }
        });

        if (lineagePoints.length > 0) {
            const bounds = L.latLngBounds(lineagePoints);
            window.appState.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
        }
    }
};

function buildTypeFilters(types) {
    const container = document.getElementById('type-filters');
    container.innerHTML = '';
    types.forEach(type => {
        const label = document.createElement('label');
        const color = window.getColorForType ? window.getColorForType(type) : '#ccc';
        label.innerHTML = `
            <input type="checkbox" checked value="${type}">
            <span class="color-dot" style="background-color: ${color}"></span>
            ${type}
        `;
        
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) activeFilters.types.add(type);
            else activeFilters.types.delete(type);
            debouncedApplyFilters();
        });
        
        container.appendChild(label);
    });
}

function buildOwnershipFilters(ownerships) {
    const container = document.getElementById('ownership-filters');
    container.innerHTML = '';
    const sorted = Array.from(ownerships).sort();
    sorted.forEach(own => {
        const label = document.createElement('label');
        label.className = 'country-label';
        label.innerHTML = `
            <input type="checkbox" checked value="${own}">
            ${own}
        `;
        
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) activeFilters.ownerships.add(own);
            else activeFilters.ownerships.delete(own);
            debouncedApplyFilters();
        });
        
        container.appendChild(label);
    });
}

function buildDisciplineFilters(fields) {
    const select = document.getElementById('discipline-filter');
    const clearBtn = document.getElementById('clear-discipline-filter');
    if (!select) return;

    const sortedFields = fields.filter(f => f).sort();
    sortedFields.forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        activeFilters.discipline = e.target.value;
        clearBtn.style.display = activeFilters.discipline ? 'inline-block' : 'none';
        applyFilters();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            activeFilters.discipline = '';
            select.value = '';
            clearBtn.style.display = 'none';
            applyFilters();
        });
    }
}

function buildCountryFilters(countries) {
    const container = document.getElementById('country-filters');
    if (!container) return;
    container.innerHTML = '';
    const sortedCountries = countries.filter(c => c).sort();

    sortedCountries.forEach(country => {
        const label = document.createElement('label');
        label.className = 'country-label';
        label.innerHTML = `
            <input type="checkbox" value="${country}">
            ${country}
        `;
        
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) activeFilters.countries.add(country);
            else activeFilters.countries.delete(country);
            debouncedApplyFilters();
        });
        
        container.appendChild(label);
    });

    const searchInput = document.getElementById('country-search');
    if (searchInput) {
        const handleCountrySearch = (e) => {
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
        };
        searchInput.addEventListener('input', debounce(handleCountrySearch, 100));
    }

    const clearBtn = document.getElementById('clear-country-filter');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            activeFilters.countries.clear();
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            if (searchInput) searchInput.value = '';
            const labels = container.querySelectorAll('.country-label');
            labels.forEach(label => label.style.display = 'flex');
            applyFilters();
        });
    }
}

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

const debouncedApplyFilters = debounce(applyFilters, 150);

function setupSlider() {
    const slider = document.getElementById('works-slider');
    const display = document.getElementById('works-slider-val');
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (display) display.textContent = val.toLocaleString();
        activeFilters.minWorks = val;
        debouncedApplyFilters();
    });
}

function applyFilters() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.opacity = '0.6';
    
    // Use a small delay to allow the loading opacity to show
    setTimeout(() => {
        const allData = window.appState.allData;
        const total = allData.length;
        if (total === 0) {
             if (sidebar) sidebar.style.opacity = '1';
             return;
        }

        const visibleMarkers = [];
        const filteredData = [];
        
        // Cache active filters for fast access
        const activeTypes = activeFilters.types;
        const activeOwnerships = activeFilters.ownerships;
        const activeCountries = activeFilters.countries;
        const hasCountryFilter = activeCountries.size > 0;
        const activeDiscipline = activeFilters.discipline;
        const minWorks = activeFilters.minWorks;
        const lineageIds = activeFilters.lineageIds;
        const hasLineageFilter = !!lineageIds;

        // One tight loop
        for (let i = 0; i < total; i++) {
            const inst = allData[i];
            
            // Fast skip logic
            if (!activeTypes.has(inst.t)) continue;
            if (!activeOwnerships.has(inst.o)) continue;
            if (hasCountryFilter && !activeCountries.has(inst.c)) continue;
            if (activeDiscipline && (!inst.f || !inst.f.includes(activeDiscipline))) continue;
            if ((inst.w || 0) < minWorks) continue;
            if (hasLineageFilter && (!inst.l || !inst.l.some(id => lineageIds.includes(id)))) continue;

            filteredData.push(inst);
            const marker = window.appState.markersById[inst.id];
            if (marker) visibleMarkers.push(marker);
        }

        if (window.appState.clusterGroup) {
            window.appState.clusterGroup.clearLayers();
            // addLayers is optimized for large batches
            window.appState.clusterGroup.addLayers(visibleMarkers);
        }

        updateTable(filteredData);
        
        if (sidebar) sidebar.style.opacity = '1';
    }, 50);
}

function updateTable(data) {
    const tbody = document.querySelector('#top-institutions-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const subtitle = document.getElementById('top-inst-subtitle');
    if (subtitle) subtitle.textContent = `Showing top 50 of ${data.length.toLocaleString()} filtered institutions`;

    const sorted = [...data].sort((a, b) => {
        const valA = a[currentSort.column] || 0;
        const valB = b[currentSort.column] || 0;
        if (typeof valA === 'string') {
            return currentSort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return currentSort.desc ? valB - valA : valA - valB;
    });

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
            if (window.flyToInstitution) window.flyToInstitution(inst.id);
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('open');
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
            document.querySelectorAll('#top-institutions-table th').forEach(h => h.classList.remove('active-sort', 'asc', 'desc'));
            th.classList.add('active-sort', currentSort.desc ? 'desc' : 'asc');
            applyFilters();
        });
    });
}
