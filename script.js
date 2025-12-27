let map, geoLayer;
let currentOpacity = 0.7;
const softColors = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];

function init() {
    const sulbarBounds = L.latLngBounds(L.latLng(-3.9, 118.4), L.latLng(-0.8, 119.9));

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
    });
    
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps'
    });

    map = L.map('map', {
        center: [-2.45, 119.3],
        zoom: 8,
        minZoom: 7,
        maxBounds: sulbarBounds,
        layers: [googleHybrid] 
    });

    L.control.layers({ "Satelit": googleHybrid, "Jalan": googleStreets }, null, { position: 'topright' }).addTo(map);

    setupEventListeners();
    loadData();
}

async function loadData() {
    const loader = document.getElementById('loadingIndicator');
    loader.style.display = 'flex';

    try {
        const res = await fetch('desa.json');
        const topoData = await res.json();
        
        // Deteksi layer TopoJSON secara dinamis
        const key = Object.keys(topoData.objects)[0];
        const geoJSONData = topojson.feature(topoData, topoData.objects[key]);

        renderMap(geoJSONData);
        loader.style.display = 'none';
    } catch (err) {
        console.error(err);
        loader.style.display = 'none';
    }
}

function setupEventListeners() {
    const slider = document.getElementById('opacitySlider');
    const txt = document.getElementById('opacityVal');

    slider.addEventListener('input', (e) => {
        currentOpacity = parseFloat(e.target.value);
        txt.innerText = Math.round(currentOpacity * 100) + "%";
        if (geoLayer) geoLayer.setStyle({ fillOpacity: currentOpacity });
    });

    document.getElementById('resetView').addEventListener('click', () => {
        if (geoLayer) map.fitBounds(geoLayer.getBounds());
    });

    document.getElementById('toggleBorders').addEventListener('click', () => {
        if (!geoLayer) return;
        geoLayer.eachLayer(l => {
            const w = l.options.weight;
            l.setStyle({ weight: w === 0 ? 1.2 : 0 });
        });
    });
}

function renderMap(data) {
    geoLayer = L.geoJSON(data, {
        style: () => ({
            fillColor: softColors[Math.floor(Math.random() * softColors.length)],
            weight: 1.2, color: '#ffffff', fillOpacity: currentOpacity
        }),
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => e.target.setStyle({ weight: 4, color: '#ffff00' }),
                mouseout: (e) => e.target.setStyle({ weight: 1.2, color: '#ffffff' }),
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    updateInfo(feature.properties);
                }
            });
            layer.bindTooltip(feature.properties.NAMOBJ || "Desa", { sticky: true });
        }
    }).addTo(map);

    map.fitBounds(geoLayer.getBounds());
    updateStats(data);
}

function updateInfo(p) {
    const container = document.getElementById('propertyRow');
    const fields = [
        { l: 'Desa/Kel', v: p.NAMOBJ },
        { l: 'Kecamatan', v: p.WADMKC },
        { l: 'Kabupaten', v: p.WADMKK },
        { l: 'Luas', v: (p.LUASWH || p.ShapeArea) ? `${parseFloat(p.LUASWH || p.ShapeArea).toLocaleString('id-ID')} km²` : '-' }
    ];
    container.innerHTML = fields.map(f => `
        <div class="info-item">
            <div class="info-label">${f.l}</div>
            <div class="info-value">${f.v || '-'}</div>
        </div>
    `).join('');
}

function updateStats(data) {
    const container = document.getElementById('statsContainer');
    let area = 0;
    data.features.forEach(f => area += parseFloat(f.properties.LUASWH || f.properties.ShapeArea || 0));
    container.innerHTML = `
        <div class="stat-box"><div class="info-label">Total Desa</div><div class="info-value">${data.features.length}</div></div>
        <div class="stat-box"><div class="info-label">Luas Total</div><div class="info-value" style="font-size:0.9rem">${area.toLocaleString('id-ID', {maximumFractionDigits:1})} km²</div></div>
    `;
}

window.onload = init;