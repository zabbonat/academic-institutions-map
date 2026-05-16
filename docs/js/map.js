// Global State
window.appState = {
    map: null,
    clusterGroup: null,
    allData: [],
    markersById: {},
    dataById: {}, // Quick lookup for detail panel and search
    typeMap: {},
    ownMap: {},
    colors: {},
    colorPalette: [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', 
        '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', 
        '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', 
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'
    ],
    compareList: [] // Stores IDs of institutions to compare
};

// Initialize Map
function initMap() {
    window.appState.map = L.map('map', {
        zoomControl: false,
        maxBounds: [
            [-90, -180],
            [90, 180]
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 2
    }).setView([20, 0], 2);

    L.control.zoom({
        position: 'topright'
    }).addTo(window.appState.map);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    window.appState.tileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        noWrap: true
    }).addTo(window.appState.map);

    window.updateMapTheme = function() {
        const isDark = document.body.classList.contains('dark-mode');
        const newUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        
        if (window.appState.tileLayer) {
            window.appState.tileLayer.setUrl(newUrl);
        }
    };

    // Initialize MarkerClusterGroup
    window.appState.clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        disableClusteringAtZoom: 14
    });
    window.appState.map.addLayer(window.appState.clusterGroup);

    // Mobile overlay toggle
    if (window.innerWidth <= 768) {
        const toggleBtn = L.DomUtil.create('div', 'mobile-overlay');
        toggleBtn.innerHTML = '☰ Menu';
        toggleBtn.onclick = () => {
            document.getElementById('sidebar').classList.add('open');
        };
        document.getElementById('map-wrapper').appendChild(toggleBtn);
        
        document.getElementById('toggle-sidebar-mobile').onclick = () => {
            document.getElementById('sidebar').classList.remove('open');
        };
    }
}

// Generate color for type
function getColorForType(type) {
    if (!window.appState.colors[type]) {
        const index = Object.keys(window.appState.colors).length;
        window.appState.colors[type] = window.appState.colorPalette[index % window.appState.colorPalette.length];
    }
    return window.appState.colors[type];
}

// Create custom SVG marker
function createMarkerIcon(color) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24px" height="24px">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#fff" stroke-width="1"/>
        </svg>`;
    
    return L.divIcon({
        className: 'custom-div-icon',
        html: svg,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
}

// Load Data
async function loadData() {
    try {
        const response = await fetch('data/index.json');
        const json = await response.json();
        
        const data = json.data;
        const typeMap = json.types;
        const ownMap = json.ownerships;
        const countryMap = json.countries;
        
        window.appState.allData = data;
        window.appState.typeMap = typeMap;
        window.appState.ownMap = ownMap;
        window.appState.countryMap = countryMap;
        
        const uniqueTypes = Array.from(new Set(Object.values(typeMap)));
        const uniqueCountries = Array.from(new Set(Object.values(countryMap)));
        const uniqueOwnerships = Array.from(new Set(Object.values(ownMap)));
        const fieldsSet = new Set();
        const lineageCounts = {};

        // 1. Dispatch initial metadata so filters can build immediately
        // We'll calculate fields and lineage counts during the chunked processing
        window.dispatchEvent(new CustomEvent('dataLoaded', { 
            detail: { 
                types: uniqueTypes,
                countries: uniqueCountries,
                ownerships: uniqueOwnerships,
                fields: [] // Will be updated later or we can do a quick pass if small
            }
        }));

        // 2. Chunked processing
        let index = 0;
        const chunkSize = 2000;
        const total = data.length;
        const seenCoords = new Map(); // Track overlaps for jittering

        function processChunk() {
            const end = Math.min(index + chunkSize, total);
            const batchMarkers = [];

            for (; index < end; index++) {
                const inst = data[index];
                
                // Remap IDs
                inst.t = typeMap[inst.t] || 'Unknown';
                inst.o = ownMap[inst.o] || 'Unknown';
                inst.c = countryMap[inst.c] || 'Unknown';
                
                window.appState.dataById[inst.id] = inst;

                if (inst.f && Array.isArray(inst.f)) {
                    inst.f.forEach(k => fieldsSet.add(k));
                }

                if (inst.l && Array.isArray(inst.l)) {
                    inst.l.forEach(lid => {
                        lineageCounts[lid] = (lineageCounts[lid] || 0) + 1;
                    });
                }
                
                if (inst.lat && inst.lng) {
                    const coordKey = `${inst.lat},${inst.lng}`;
                    const count = seenCoords.get(coordKey) || 0;
                    seenCoords.set(coordKey, count + 1);

                    let displayLat = inst.lat;
                    let displayLng = inst.lng;

                    if (count > 0) {
                        // Apply a tiny jitter (random walk) to make overlapping markers selectable
                        // We use a deterministic-ish offset based on count to avoid huge displacements
                        const angle = count * (Math.PI * 2 / 8); // Spread in a circle
                        const radius = 0.0001 * Math.sqrt(count);
                        displayLat += Math.cos(angle) * radius;
                        displayLng += Math.sin(angle) * radius;
                    }

                    const color = getColorForType(inst.t);
                    const marker = L.marker([displayLat, displayLng], {
                        icon: createMarkerIcon(color)
                    });

                    marker.ror_id = inst.id;
                    marker.inst_data = inst;
                    
                    marker.on('click', () => {
                        if (window.showDetail) window.showDetail(inst.id);
                    });

                    batchMarkers.push(marker);
                    window.appState.markersById[inst.id] = marker;
                }
            }

            if (batchMarkers.length > 0) {
                window.appState.clusterGroup.addLayers(batchMarkers);
            }

            if (index < total) {
                // Schedule next chunk
                requestAnimationFrame(processChunk);
            } else {
                // Finished
                window.appState.lineageCounts = lineageCounts;
                // Update filters with fields
                window.dispatchEvent(new CustomEvent('fieldsUpdated', { 
                    detail: { fields: Array.from(fieldsSet) }
                }));
                console.log('All markers loaded');
            }
        }

        // Start processing
        requestAnimationFrame(processChunk);

    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

// Fly to specific marker
window.flyToInstitution = function(ror_id) {
    const marker = window.appState.markersById[ror_id];
    if (marker) {
        window.appState.clusterGroup.zoomToShowLayer(marker, () => {
            window.appState.map.flyTo(marker.getLatLng(), 15, { duration: 1.5 });
        });
        if (window.showDetail) window.showDetail(ror_id);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
});
