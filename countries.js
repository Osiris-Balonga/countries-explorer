'use strict';

const API_BASE_URL = 'https://countries.dev';

const CONTINENTS = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
const CONTINENT_LABELS = {
  All: 'Tous',
  Africa: 'Afrique',
  Americas: 'Amériques',
  Asia: 'Asie',
  Europe: 'Europe',
  Oceania: 'Océanie',
};

const elements = {
  grid: document.getElementById('country-grid'),
  searchInput: document.getElementById('search-input'),
  continentChips: document.getElementById('continent-chips'),
  sortButton: document.getElementById('sort-button'),
  viewButton: document.getElementById('view-button'),
  viewLabel: document.getElementById('view-label'),
  map: document.getElementById('map'),
  resultsCount: document.getElementById('results-count'),
  emptyState: document.getElementById('empty-state'),
  errorState: document.getElementById('error-state'),
  retryButton: document.getElementById('retry-button'),
};

const state = {
  countries: [],
  query: '',
  continent: 'All',
  populationOrder: 'descending',
  view: 'grid',
};

let searchTimerId;
let mapInstance;
let flagDefinitions;
const paintedFlagIds = new Set();

function show(element) {
  element.hidden = false;
}

function hide(element) {
  element.hidden = true;
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

function formatPopulation(population) {
  return typeof population === 'number' ? population.toLocaleString('fr-FR') : 'Non renseignée';
}

function getLanguageLabel(languages) {
  const names = (languages ?? []).map((language) => language.name).filter(Boolean);
  if (names.length === 0) return 'Langue non renseignée';
  if (names.length < 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function getCoordinateLabel(latlng) {
  const [latitude, longitude] = latlng ?? [];
  if (latitude === undefined || longitude === undefined) return '';
  const latitudeDirection = latitude >= 0 ? 'N' : 'S';
  const longitudeDirection = longitude >= 0 ? 'E' : 'O';
  return `${Math.abs(latitude).toFixed(1)}°${latitudeDirection} ${Math.abs(longitude).toFixed(1)}°${longitudeDirection}`;
}

function buildContinentChips() {
  elements.continentChips.innerHTML = '';

  CONTINENTS.forEach((continent) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = CONTINENT_LABELS[continent];
    button.setAttribute('aria-pressed', String(continent === state.continent));
    button.addEventListener('click', () => {
      state.continent = continent;
      buildContinentChips();
      render();
    });
    elements.continentChips.appendChild(button);
  });
}

function getVisibleCountries() {
  const normalizedQuery = state.query.trim().toLocaleLowerCase('fr-FR');
  let countries = state.countries;

  if (state.continent !== 'All') {
    countries = countries.filter((country) => country.region === state.continent);
  }

  if (normalizedQuery) {
    countries = countries.filter((country) => country.name.toLocaleLowerCase('fr-FR').includes(normalizedQuery));
  }

  return [...countries].sort((firstCountry, secondCountry) => {
    const firstPopulation = firstCountry.population ?? 0;
    const secondPopulation = secondCountry.population ?? 0;
    return state.populationOrder === 'descending'
      ? secondPopulation - firstPopulation
      : firstPopulation - secondPopulation;
  });
}

function countryCardMarkup(country) {
  const flagUrl = country.flags?.png || country.flags?.svg || '';
  const coordinateLabel = getCoordinateLabel(country.latlng);
  const location = [country.capital || 'Capitale non renseignée', CONTINENT_LABELS[country.region] || country.region]
    .filter(Boolean)
    .join(' · ');

  return `
    <article class="country-card">
      <div class="country-card__flag-wrap">
        <img class="country-card__flag" src="${flagUrl}" alt="Drapeau du pays : ${escapeHtml(country.name)}" loading="lazy" width="360" height="240">
        ${coordinateLabel ? `<span class="country-card__coordinates">${coordinateLabel}</span>` : ''}
      </div>
      <div class="country-card__body">
        <h2 class="country-card__name">${escapeHtml(country.name)}</h2>
        <p class="country-card__location">${escapeHtml(location)}</p>
        <div class="country-card__details">
          <div>
            <span class="country-card__label">Population</span>
            <span class="country-card__population">${formatPopulation(country.population)}</span>
          </div>
          <span class="country-card__languages">${escapeHtml(getLanguageLabel(country.languages))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSkeletons(count) {
  elements.resultsCount.textContent = 'Chargement des pays...';
  elements.grid.innerHTML = Array.from({ length: count }, () => `
    <article class="country-card skeleton" aria-hidden="true">
      <div class="skeleton__flag"></div>
      <div class="skeleton__body">
        <div class="skeleton__line skeleton__line--title"></div>
        <div class="skeleton__line"></div>
        <div class="skeleton__line skeleton__line--short"></div>
      </div>
    </article>
  `).join('');
}

function renderGrid(countries) {
  elements.grid.innerHTML = countries.map(countryCardMarkup).join('');
  show(elements.grid);
  hide(elements.map);
}

function getFlagDefinitions() {
  if (flagDefinitions) return flagDefinitions;

  const svg = elements.map.querySelector('svg');
  if (!svg) return null;

  flagDefinitions = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.prepend(flagDefinitions);
  return flagDefinitions;
}

function getFlagPatternId(country) {
  const patternId = `flag-${country.alpha2Code}`;
  if (paintedFlagIds.has(patternId)) return patternId;

  const definitions = getFlagDefinitions();
  const flagUrl = country.flags?.png || country.flags?.svg;
  if (!definitions || !flagUrl) return null;

  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', patternId);
  pattern.setAttribute('patternUnits', 'objectBoundingBox');
  pattern.setAttribute('width', '1');
  pattern.setAttribute('height', '1');

  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', flagUrl);
  image.setAttribute('width', '1');
  image.setAttribute('height', '1');
  image.setAttribute('preserveAspectRatio', 'none');
  pattern.appendChild(image);
  definitions.appendChild(pattern);
  paintedFlagIds.add(patternId);

  return patternId;
}

function paintMap(countries) {
  if (!mapInstance?.regions) return;
  const visibleCountries = new Map(countries.map((country) => [country.alpha2Code, country]));

  Object.entries(mapInstance.regions).forEach(([countryCode, region]) => {
    const country = visibleCountries.get(countryCode);
    const patternId = country ? getFlagPatternId(country) : null;
    region.element?.shape?.setStyle('fill', patternId ? `url(#${patternId})` : '#2c5550');
  });
}

function renderMap(countries) {
  hide(elements.grid);
  show(elements.map);

  if (!mapInstance) {
    mapInstance = new jsVectorMap({
      selector: '#map',
      map: 'world',
      backgroundColor: 'transparent',
      zoomButtons: true,
      regionStyle: {
        initial: { fill: '#2c5550' },
        hover: { fill: '#d6ad54' },
      },
      onRegionTooltipShow(event, tooltip, countryCode) {
        const country = state.countries.find((item) => item.alpha2Code === countryCode);
        if (!country) return;
        tooltip.text(`${country.name} · ${formatPopulation(country.population)} habitants`);
      },
    });
  }

  paintMap(countries);
}

function render() {
  const countries = getVisibleCountries();
  const label = countries.length > 1 ? 'pays trouvés' : 'pays trouvé';
  elements.resultsCount.textContent = `${countries.length} ${label}`;

  if (countries.length === 0) {
    elements.grid.innerHTML = '';
    hide(elements.grid);
    hide(elements.map);
    show(elements.emptyState);
    return;
  }

  hide(elements.emptyState);
  if (state.view === 'map') renderMap(countries);
  else renderGrid(countries);
}

async function loadCountries() {
  renderSkeletons(12);
  hide(elements.errorState);
  hide(elements.emptyState);
  hide(elements.map);
  show(elements.grid);

  try {
    const response = await fetch(`${API_BASE_URL}/countries`);
    if (!response.ok) throw new Error(`Unexpected response status: ${response.status}`);

    const data = await response.json();
    state.countries = data.filter((country) => CONTINENTS.includes(country.region));
    buildContinentChips();
    render();
  } catch (error) {
    console.error('Unable to load countries:', error);
    elements.grid.innerHTML = '';
    hide(elements.grid);
    show(elements.errorState);
  }
}

elements.searchInput.addEventListener('input', (event) => {
  clearTimeout(searchTimerId);
  searchTimerId = window.setTimeout(() => {
    state.query = event.target.value;
    render();
  }, 250);
});

elements.sortButton.addEventListener('click', () => {
  state.populationOrder = state.populationOrder === 'descending' ? 'ascending' : 'descending';
  elements.sortButton.dataset.direction = state.populationOrder === 'ascending' ? 'asc' : 'desc';
  render();
});

elements.viewButton.addEventListener('click', () => {
  state.view = state.view === 'grid' ? 'map' : 'grid';
  const isMapView = state.view === 'map';
  elements.viewButton.setAttribute('aria-pressed', String(isMapView));
  elements.viewLabel.textContent = isMapView ? 'Voir la grille' : 'Voir la carte';
  render();
});

elements.retryButton.addEventListener('click', loadCountries);

loadCountries();
