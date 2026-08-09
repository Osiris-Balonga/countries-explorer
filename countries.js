'use strict';

/* ============================================
   ATLAS - Country explorer
   Source: countries.dev public API
   ============================================ */

const API_BASE = 'https://countries.dev';

const CONTINENTS = ['Tous', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
const CONTINENT_LABELS = {
  Tous: 'Tous',
  Africa: 'Afrique',
  Americas: 'Amériques',
  Asia: 'Asie',
  Europe: 'Europe',
  Oceania: 'Océanie',
};

const els = {
  grid: document.getElementById('grid'),
  searchInput: document.getElementById('search-input'),
  chips: document.getElementById('continent-chips'),
  sortBtn: document.getElementById('sort-btn'),
  sortLabel: document.getElementById('sort-label'),
  viewBtn: document.getElementById('view-btn'),
  viewLabel: document.getElementById('view-label'),
  mapEl: document.getElementById('map'),
  resultsCount: document.getElementById('results-count'),
  emptyState: document.getElementById('empty-state'),
  errorState: document.getElementById('error-state'),
  retryBtn: document.getElementById('retry-btn'),
};

const state = {
  all: [],
  search: '',
  continent: 'Tous',
  sortDir: 'desc',
  view: 'grid',
};

let mapInstance = null;
let mapLoading = false;

/* ---------- Data loading ---------- */

async function loadCountries() {
  showSkeletons(12);
  hide(els.errorState);
  hide(els.emptyState);

  try {
    const res = await fetch(`${API_BASE}/countries`);
    if (!res.ok) throw new Error(`Réponse API ${res.status}`);
    const data = await res.json();

    state.all = data
      .filter((c) => CONTINENTS.includes(c.region))
      .sort((a, b) => b.population - a.population);

    buildChips();
    render();
  } catch (err) {
    console.error('Échec du chargement des pays :', err);
    els.grid.innerHTML = '';
    show(els.errorState);
  }
}

/* ---------- Filter controls ---------- */

function buildChips() {
  els.chips.innerHTML = '';
  CONTINENTS.forEach((region) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = CONTINENT_LABELS[region];
    btn.setAttribute('aria-pressed', region === state.continent ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.continent = region;
      [...els.chips.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      render();
    });
    els.chips.appendChild(btn);
  });
}

/* ---------- Data transformation ---------- */

function getVisibleCountries() {
  const query = state.search.trim().toLowerCase();

  let list = state.all;

  if (state.continent !== 'Tous') {
    list = list.filter((c) => c.region === state.continent);
  }

  if (query) {
    list = list.filter((c) => c.name.toLowerCase().includes(query));
  }

  list = [...list].sort((a, b) =>
    state.sortDir === 'desc'
      ? b.population - a.population
      : a.population - b.population
  );

  return list;
}

/* ---------- Rendering ---------- */

function render() {
  const list = getVisibleCountries();

  els.resultsCount.textContent = `${list.length} pays trouvé${list.length > 1 ? 's' : ''}`;

  if (list.length === 0) {
    els.grid.innerHTML = '';
    show(els.emptyState);
    hide(els.grid);
    hide(els.mapEl);
    return;
  }

  hide(els.emptyState);

  if (state.view === 'map') {
    hide(els.grid);
    show(els.mapEl);
    renderMap(list);
  } else {
    show(els.grid);
    hide(els.mapEl);
    els.grid.innerHTML = list.map(countryCardHTML).join('');
  }
}

function countryCardHTML(country) {
  const flagSrc = country.flags?.png || country.flags?.svg || '';
  const langs = (country.languages || []).map((l) => l.name);
  const langLabel = langs.length > 2
    ? `${langs.slice(0, 2).join(', ')} +${langs.length - 2}`
    : langs.join(', ') || '-';

  const [lat, lng] = country.latlng || [];
  const coords = (lat !== undefined && lng !== undefined)
    ? `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'O'}`
    : '';

  return `
    <a class="card card--link" href="country-detail.html?code=${encodeURIComponent(country.alpha2Code)}" aria-label="Voir la fiche de ${escapeHTML(country.name)}">
      <div class="card__flag-wrap">
        <img class="card__flag" src="${flagSrc}" alt="Drapeau : ${escapeHTML(country.name)}" loading="lazy" width="260" height="173">
        ${coords ? `<span class="card__coords">${coords}</span>` : ''}
      </div>
      <div class="card__body">
        <h2 class="card__name">${escapeHTML(country.name)}</h2>
        <p class="card__meta">${escapeHTML(country.capital || 'Pas de capitale')} <span>·</span> ${CONTINENT_LABELS[country.region] || country.region}</p>
        <div class="card__stats">
          <div>
            <span class="card__population-label">Population</span>
            <span class="card__population">${country.population.toLocaleString('fr-FR')}</span>
          </div>
          <span class="card__languages">${escapeHTML(langLabel)}</span>
        </div>
      </div>
    </a>
  `;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------- Squelettes ---------- */

function showSkeletons(count) {
  els.resultsCount.textContent = '';
  els.grid.innerHTML = Array.from({ length: count }, () => `
    <article class="card skeleton">
      <div class="card__flag-wrap"></div>
      <div class="card__body">
        <div class="sk-line sk-line--title"></div>
        <div class="sk-line sk-line--short"></div>
        <div class="sk-line sk-line--third"></div>
      </div>
    </article>
  `).join('');
}

function showMapSkeleton() {
  els.mapEl.innerHTML = `
    <div class="map-skeleton" aria-label="Chargement de la carte">
      ${Array.from({ length: 18 }, () => '<span class="map-skeleton__block"></span>').join('')}
    </div>
  `;
}

/* ---------- Map view ---------- */

const FALLBACK_FILL = '#1f2531';
let flagDefs = null;
const paintedFlagIds = new Set();

function renderMap(list) {
  if (!mapInstance && !mapLoading) {
    mapLoading = true;
    showMapSkeleton();
    setTimeout(() => {
      els.mapEl.innerHTML = '';
    mapInstance = new jsVectorMap({
      selector: '#map',
      map: 'world',
      backgroundColor: 'transparent',
      zoomButtons: true,
      regionStyle: {
        initial: { fill: FALLBACK_FILL },
        hover: {},
        selected: {},
      },
      onRegionTooltipShow(event, tooltip, code) {
        const c = state.all.find((x) => x.alpha2Code === code);
        if (c) tooltip.text(`${c.name} - ${c.population.toLocaleString('fr-FR')} hab.`);
      },
      onRegionClick(event, code) {
        const c = state.all.find((x) => x.alpha2Code === code);
        if (!c) return;
        state.search = c.name;
        els.searchInput.value = c.name;
        state.view = 'grid';
        els.viewBtn.setAttribute('aria-pressed', 'false');
        els.viewLabel.textContent = 'Carte';
        render();
      },
    });
      mapLoading = false;
      paintFlags(getVisibleCountries());
    }, 550);
  }

  if (mapLoading) {
    return;
  }

  paintFlags(list);
}

function ensureFlagDefs() {
  if (flagDefs) return flagDefs;
  const svg = document.querySelector('#map svg');
  if (!svg) return null;
  flagDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.prepend(flagDefs);
  return flagDefs;
}

function getFlagPatternId(country) {
  const id = `flag-${country.alpha2Code}`;
  if (paintedFlagIds.has(id)) return id;

  const defs = ensureFlagDefs();
  if (!defs) return null;

  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', id);
  pattern.setAttribute('patternUnits', 'objectBoundingBox');
  pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
  pattern.setAttribute('width', '1');
  pattern.setAttribute('height', '1');

  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', country.flags?.png || country.flags?.svg || '');
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', '1');
  image.setAttribute('height', '1');
  image.setAttribute('preserveAspectRatio', 'none');

  pattern.appendChild(image);
  defs.appendChild(pattern);
  paintedFlagIds.add(id);
  return id;
}

function paintFlags(list) {
  if (!mapInstance?.regions) return;
  const visible = new Map(list.map((c) => [c.alpha2Code, c]));

  Object.entries(mapInstance.regions).forEach(([code, region]) => {
    const shape = region.element?.shape;
    if (!shape) return;

    const country = visible.get(code);
    if (country && (country.flags?.png || country.flags?.svg)) {
      const patternId = getFlagPatternId(country);
      shape.setStyle('fill', patternId ? `url(#${patternId})` : FALLBACK_FILL);
    } else {
      shape.setStyle('fill', FALLBACK_FILL);
    }
  });
}

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

/* ---------- Event listeners ---------- */

let searchTimer = null;
els.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value;
  searchTimer = setTimeout(() => {
    state.search = value;
    render();
  }, 300);
});

els.sortBtn.addEventListener('click', () => {
  state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
  els.sortBtn.dataset.dir = state.sortDir;
  document.getElementById('sort-icon').className = state.sortDir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
  render();
});

els.retryBtn.addEventListener('click', loadCountries);

els.viewBtn.addEventListener('click', () => {
  state.view = state.view === 'grid' ? 'map' : 'grid';
  els.viewBtn.setAttribute('aria-pressed', state.view === 'map' ? 'true' : 'false');
  els.viewLabel.textContent = state.view === 'map' ? 'Grille' : 'Carte';
  document.getElementById('view-icon').className = state.view === 'map' ? 'ri-layout-grid-line' : 'ri-map-2-line';
  render();
});

const mobileViewport = window.matchMedia('(max-width: 640px)');
mobileViewport.addEventListener('change', (event) => {
  if (!event.matches || state.view === 'grid') return;
  state.view = 'grid';
  els.viewBtn.setAttribute('aria-pressed', 'false');
  els.viewLabel.textContent = 'Carte';
  document.getElementById('view-icon').className = 'ri-map-2-line';
  render();
});

/* ---------- Start ---------- */

loadCountries();
