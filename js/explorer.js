import { fetchCountries } from './country-service.js';
import { createMapRenderer } from './explorer-map.js';

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

async function loadCountries() {
  showSkeletons(12);
  hide(els.errorState);
  hide(els.emptyState);

  try {
    const data = await fetchCountries();

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
    mapRenderer.render(list);
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

const mapRenderer = createMapRenderer({
  mapElement: els.mapEl,
  getCountry(code) {
    return code
      ? state.all.find((country) => country.alpha2Code === code)
      : getVisibleCountries();
  },
  onCountrySelect(country) {
    state.search = country.name;
    els.searchInput.value = country.name;
    state.view = 'grid';
    els.viewBtn.setAttribute('aria-pressed', 'false');
    els.viewLabel.textContent = 'Carte';
    document.getElementById('view-icon').className = 'ri-map-2-line';
    render();
  },
  showLoading: showMapSkeleton,
});

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

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

loadCountries();
