'use strict';

const COUNTRIES_API_URL = 'https://countries.dev/countries';
const UNSPLASH_ACCESS_KEY = window.ATLAS_UNSPLASH_ACCESS_KEY || '';
const CONTINENT_LABELS = {
  Africa: 'Afrique',
  Americas: 'Amériques',
  Asia: 'Asie',
  Europe: 'Europe',
  Oceania: 'Océanie',
};

const elements = {
  root: document.getElementById('detail-root'),
  loading: document.getElementById('detail-loading'),
  error: document.getElementById('detail-error'),
  breadcrumb: document.getElementById('breadcrumb'),
  region: document.getElementById('country-region'),
  name: document.getElementById('country-name'),
  nativeName: document.getElementById('country-native-name'),
  capital: document.getElementById('country-capital'),
  population: document.getElementById('country-population'),
  area: document.getElementById('country-area'),
  flag: document.getElementById('country-flag'),
  coordinates: document.getElementById('country-coordinates'),
  description: document.getElementById('country-description'),
  wikiLink: document.getElementById('wiki-link'),
  identityGrid: document.getElementById('identity-grid'),
  borderSection: document.getElementById('border-section'),
  borderList: document.getElementById('border-list'),
  holidaySection: document.getElementById('holiday-section'),
  holidayList: document.getElementById('holiday-list'),
  holidaysTitle: document.getElementById('holidays-title'),
  gallerySection: document.getElementById('gallery-section'),
  galleryGrid: document.getElementById('gallery-grid'),
  galleryCredit: document.getElementById('gallery-credit'),
  foodSection: document.getElementById('food-section'),
  foodGrid: document.getElementById('food-grid'),
  weatherCard: document.getElementById('weather-card'),
  weatherTemperature: document.getElementById('weather-temperature'),
  weatherDescription: document.getElementById('weather-description'),
  weatherIcon: document.getElementById('weather-icon'),
  weatherWind: document.getElementById('weather-wind'),
  indicatorGrid: document.getElementById('indicator-grid'),
};

function show(element) { element.hidden = false; }
function hide(element) { element.hidden = true; }
function formatNumber(value) { return typeof value === 'number' ? value.toLocaleString('fr-FR') : 'Non renseignée'; }
function formatList(items) { return items.filter(Boolean).join(', ') || 'Non renseigné'; }
function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

function getCoordinates(latlng) {
  const [latitude, longitude] = latlng || [];
  if (latitude === undefined || longitude === undefined) return 'Non renseignées';
  return `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'} ${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? 'E' : 'O'}`;
}

function renderCountry(country, countries) {
  const languages = (country.languages || []).map((language) => language.name);
  const currencies = (country.currencies || []).map((currency) => `${currency.name} (${currency.code})`);
  const timezones = country.timezones || [];
  const flagUrl = country.flags?.png || country.flags?.svg || '';

  document.title = `${country.name} | Atlas`;
  elements.breadcrumb.textContent = `${CONTINENT_LABELS[country.region] || country.region} / ${country.name}`;
  elements.region.textContent = CONTINENT_LABELS[country.region] || country.region || 'Monde';
  elements.name.textContent = country.name;
  elements.nativeName.textContent = country.nativeName && country.nativeName !== country.name ? country.nativeName : '';
  elements.capital.textContent = country.capital || 'Non renseignée';
  elements.population.textContent = `${formatNumber(country.population)} hab.`;
  elements.area.textContent = country.area ? `${formatNumber(country.area)} km²` : 'Non renseignée';
  elements.flag.src = flagUrl;
  elements.flag.alt = `Drapeau du pays : ${country.name}`;
  elements.coordinates.textContent = getCoordinates(country.latlng);

  const identityItems = [
    ['Langues', formatList(languages)],
    ['Monnaie', formatList(currencies)],
    ['Fuseaux horaires', formatList(timezones)],
    ['Domaine internet', formatList(country.topLevelDomain || [])],
  ];
  elements.identityGrid.innerHTML = identityItems.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');

  const countryByCode = new Map(countries.map((item) => [item.alpha3Code, item]));
  const borderCountries = (country.borders || []).map((code) => countryByCode.get(code)).filter(Boolean);
  if (borderCountries.length > 0) {
    elements.borderList.innerHTML = borderCountries.map((borderCountry) => {
      const borderFlag = borderCountry.flags?.png || borderCountry.flags?.svg || '';
      return `<a class="border-item" href="country-detail.html?code=${encodeURIComponent(borderCountry.alpha2Code)}"><img src="${borderFlag}" alt=""><span>${escapeHtml(borderCountry.name)}</span></a>`;
    }).join('');
    show(elements.borderSection);
  }
}

async function loadWikipediaSummary(country) {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'extracts|info|pageimages',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    redirects: '1',
    pithumbsize: '1200',
    titles: country.translations?.fr || country.name,
  });

  try {
    const response = await fetch(`https://fr.wikipedia.org/w/api.php?${query}`);
    if (!response.ok) throw new Error('Wikipedia request failed');
    const data = await response.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (!page?.extract) throw new Error('Wikipedia summary unavailable');
    elements.description.textContent = page.extract;
    elements.wikiLink.href = page.fullurl;
    show(elements.wikiLink);
    return page;
  } catch (error) {
    elements.description.textContent = 'Aucun résumé encyclopédique n’est disponible pour le moment.';
    return null;
  }
}

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

function renderGallery(photos, fallbackPage) {
  const galleryPhotos = photos.length > 0
    ? photos.map((photo) => ({
      url: photo.urls.regular,
      alt: photo.alt_description || 'Paysage du pays',
      author: photo.user.name,
      authorUrl: photo.user.links.html,
    }))
    : fallbackPage?.thumbnail?.source
      ? [{ url: fallbackPage.thumbnail.source, alt: fallbackPage.title || 'Image du pays' }]
      : [];

  if (galleryPhotos.length === 0) return;
  elements.galleryGrid.innerHTML = galleryPhotos.map((photo) => `
    <figure class="country-gallery__figure"><img src="${photo.url}" alt="${escapeHtml(photo.alt)}" loading="lazy"></figure>
  `).join('');
  if (photos.length > 0) {
    const firstPhoto = galleryPhotos[0];
    elements.galleryCredit.innerHTML = `Photo principale par <a href="${firstPhoto.authorUrl}" target="_blank" rel="noopener">${escapeHtml(firstPhoto.author)}</a> sur <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>.`;
    show(elements.galleryCredit);
  }
  show(elements.gallerySection);
}

async function loadGallery(country, fallbackPage) {
  if (!UNSPLASH_ACCESS_KEY) {
    renderGallery([], fallbackPage);
    return;
  }
  try {
    const query = new URLSearchParams({
      query: `${country.translations?.fr || country.name} landscape`,
      per_page: '4',
      orientation: 'landscape',
      content_filter: 'high',
      client_id: UNSPLASH_ACCESS_KEY,
    });
    const response = await fetch(`https://api.unsplash.com/search/photos?${query}`, { headers: { 'Accept-Version': 'v1' } });
    if (!response.ok) throw new Error('Unsplash request failed');
    const data = await response.json();
    renderGallery(data.results || [], fallbackPage);
  } catch (error) {
    renderGallery([], fallbackPage);
  }
}

async function loadFood(country) {
  try {
    const countryTag = slugify(country.name);
    const query = new URLSearchParams({
      countries_tags_en: countryTag,
      fields: 'product_name,image_front_small_url',
      page_size: '6',
    });
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/search?${query}`);
    if (!response.ok) throw new Error('Food request failed');
    const data = await response.json();
    const products = (data.products || []).filter((product) => product.product_name && product.image_front_small_url).slice(0, 6);
    if (products.length === 0) return;
    elements.foodGrid.innerHTML = products.map((product) => `
      <article class="food-item"><img src="${product.image_front_small_url}" alt="${escapeHtml(product.product_name)}" loading="lazy"><span>${escapeHtml(product.product_name)}</span></article>
    `).join('');
    show(elements.foodSection);
  } catch (error) {
    hide(elements.foodSection);
  }
}

function getWeatherPresentation(code) {
  if (code === 0) return ['Ciel dégagé', 'ri-sun-line'];
  if ([1, 2, 3].includes(code)) return ['Partiellement nuageux', 'ri-cloudy-line'];
  if ([45, 48].includes(code)) return ['Brouillard', 'ri-mist-line'];
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['Pluie', 'ri-rainy-line'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ['Neige', 'ri-snowy-line'];
  if ([95, 96, 99].includes(code)) return ['Orage', 'ri-thunderstorms-line'];
  return ['Conditions variables', 'ri-cloud-line'];
}

async function loadWeather(country) {
  const [latitude, longitude] = country.latlng || [];
  if (latitude === undefined || longitude === undefined) {
    hide(elements.weatherCard);
    return;
  }

  try {
    const query = new URLSearchParams({
      latitude,
      longitude,
      current: 'temperature_2m,weather_code,wind_speed_10m',
      timezone: 'auto',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!response.ok) throw new Error('Weather request failed');
    const data = await response.json();
    const current = data.current;
    if (!current) throw new Error('Weather data unavailable');
    const [description, icon] = getWeatherPresentation(current.weather_code);
    elements.weatherTemperature.textContent = `${Math.round(current.temperature_2m)}°C`;
    elements.weatherDescription.textContent = `${country.capital || country.name} · ${description}`;
    elements.weatherIcon.className = `${icon} weather-card__icon`;
    elements.weatherWind.textContent = `Vent : ${Math.round(current.wind_speed_10m)} km/h`;
  } catch (error) {
    hide(elements.weatherCard);
  }
}

async function fetchIndicator(countryCode, indicatorCode) {
  const response = await fetch(`https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?format=json&per_page=60`);
  if (!response.ok) throw new Error('Indicator request failed');
  const data = await response.json();
  const point = data[1]?.find((item) => item.value !== null);
  if (!point) throw new Error('Indicator unavailable');
  return point.value;
}

async function loadIndicators(country) {
  const countryCode = country.alpha3Code;
  if (!countryCode) {
    elements.indicatorGrid.innerHTML = '<p class="sidebar-card__note">Données indisponibles.</p>';
    return;
  }

  const [lifeResult, gdpResult] = await Promise.allSettled([
    fetchIndicator(countryCode, 'SP.DYN.LE00.IN'),
    fetchIndicator(countryCode, 'NY.GDP.PCAP.CD'),
  ]);
  const lifeValue = lifeResult.status === 'fulfilled' ? `${lifeResult.value.toFixed(1)} ans` : 'Indisponible';
  const gdpValue = gdpResult.status === 'fulfilled' ? `${Math.round(gdpResult.value).toLocaleString('fr-FR')} $` : 'Indisponible';
  elements.indicatorGrid.innerHTML = `
    <div><dt>Espérance de vie</dt><dd>${lifeValue}</dd></div>
    <div><dt>PIB par habitant</dt><dd>${gdpValue}</dd></div>
  `;
}

async function fetchHolidays(year, countryCode) {
  const response = await fetch(`https://date.nager.at/api/v4/Holidays/${countryCode}/${year}`);
  if (!response.ok) throw new Error('Holiday request failed');
  return response.json();
}

async function loadHolidays(country) {
  if (!country.alpha2Code) return;
  try {
    const year = new Date().getFullYear();
    const holidays = await fetchHolidays(year, country.alpha2Code);
    if (holidays.length === 0) return;
    elements.holidaysTitle.textContent = `Fêtes nationales de ${year}`;
    elements.holidayList.innerHTML = holidays.slice(0, 8).map((holiday) => `
      <li><time datetime="${holiday.date}">${new Date(holiday.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</time><span>${escapeHtml(holiday.name)}</span></li>
    `).join('');
    show(elements.holidaySection);
  } catch (error) {
    hide(elements.holidaySection);
  }
}

async function init() {
  const countryCode = new URLSearchParams(window.location.search).get('code');
  if (!countryCode) {
    hide(elements.loading);
    show(elements.error);
    return;
  }

  try {
    const response = await fetch(COUNTRIES_API_URL);
    if (!response.ok) throw new Error('Country request failed');
    const countries = await response.json();
    const country = countries.find((item) => item.alpha2Code?.toLowerCase() === countryCode.toLowerCase());
    if (!country) throw new Error('Country unavailable');
    renderCountry(country, countries);
    hide(elements.loading);
    show(elements.root);
    const wikipediaPage = await loadWikipediaSummary(country);
    await Promise.allSettled([loadGallery(country, wikipediaPage), loadFood(country), loadWeather(country), loadIndicators(country), loadHolidays(country)]);
  } catch (error) {
    hide(elements.loading);
    show(elements.error);
  }
}

init();
