'use strict';

const COUNTRIES_API_URL = 'https://countries.dev/countries';
const WIKIPEDIA_TITLES = {
  CD: 'République démocratique du Congo',
  CG: 'République du Congo',
};
const CUISINE_AREAS = {
  DZ: 'Algerian', CA: 'Canadian', CN: 'Chinese', HR: 'Croatian', NL: 'Dutch', EG: 'Egyptian',
  FR: 'French', GR: 'Greek', IN: 'Indian', IE: 'Irish', IT: 'Italian', JM: 'Jamaican', JP: 'Japanese',
  KE: 'Kenyan', MY: 'Malaysian', MX: 'Mexican', MA: 'Moroccan', PL: 'Polish', PT: 'Portuguese',
  RU: 'Russian', SK: 'Slovak', ES: 'Spanish', TH: 'Thai', TN: 'Tunisian', TR: 'Turkish',
  UA: 'Ukrainian', GB: 'British', US: 'American', VN: 'Vietnamese', KR: 'Korean', PH: 'Filipino', SY: 'Syrian',
};
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
  foodSection: document.getElementById('food-section'),
  foodGrid: document.getElementById('food-grid'),
  citySection: document.getElementById('city-section'),
  cityGrid: document.getElementById('city-grid'),
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

function shortenDescription(value, maxLength = 440) {
  const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  let result = '';
  for (const sentence of sentences.slice(0, 3)) {
    const candidate = `${result}${result ? ' ' : ''}${sentence.trim()}`;
    if (candidate.length > maxLength) break;
    result = candidate;
  }
  return result || value.slice(0, maxLength).trim();
}

function getWikipediaTitle(country) {
  return WIKIPEDIA_TITLES[country.alpha2Code] || country.translations?.fr || country.name;
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
    prop: 'extracts|info|pageprops',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    redirects: '1',
    titles: getWikipediaTitle(country),
  });

  try {
    const response = await fetch(`https://fr.wikipedia.org/w/api.php?${query}`);
    if (!response.ok) throw new Error('Wikipedia request failed');
    const data = await response.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (!page?.extract) throw new Error('Wikipedia summary unavailable');
    elements.description.textContent = shortenDescription(page.extract);
    elements.wikiLink.href = page.fullurl;
    show(elements.wikiLink);
    return page;
  } catch (error) {
    elements.description.textContent = 'Aucun résumé encyclopédique n’est disponible pour le moment.';
    return null;
  }
}

async function queryWikidata(query) {
  const response = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json' },
  });
  if (!response.ok) throw new Error('Wikidata request failed');
  const data = await response.json();
  return data.results?.bindings || [];
}

async function loadCities(country, wikidataPage) {
  const countryId = wikidataPage?.pageprops?.wikibase_item;
  if (!/^Q\d+$/.test(countryId || '')) return;
  const query = `
    SELECT ?city ?cityLabel ?population WHERE {
      ?city wdt:P31 wd:Q515;
            wdt:P17 wd:${countryId};
            wdt:P1082 ?population.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    }
    ORDER BY DESC(?population)
    LIMIT 6
  `;
  try {
    const rows = await queryWikidata(query);
    const displayedCities = rows.filter((row) => row.cityLabel?.value).slice(0, 5)
      .map((row) => ({ name: row.cityLabel.value, population: Number(row.population?.value) || null }));
    if (displayedCities.length === 0) return;
    elements.cityGrid.innerHTML = displayedCities.map((city) => `
      <article class="city-item"><i class="ri-building-2-line" aria-hidden="true"></i><div><strong>${escapeHtml(city.name)}</strong><small>${formatNumber(city.population)} hab.</small></div></article>
    `).join('');
    show(elements.citySection);
  } catch (error) {
    hide(elements.citySection);
  }
}

async function loadFood(country) {
  const cuisineArea = CUISINE_AREAS[country.alpha2Code];
  if (!cuisineArea) return;
  try {
    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisineArea)}`);
    if (!response.ok) throw new Error('Meal request failed');
    const data = await response.json();
    const meals = (data.meals || []).filter((meal) => meal.strMeal && meal.strMealThumb).slice(0, 6);
    if (meals.length === 0) return;
    elements.foodGrid.innerHTML = meals.map((meal) => `
      <article class="food-item"><img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" loading="lazy"><span>${escapeHtml(meal.strMeal)}</span></article>
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

function getHolidayKey(name) {
  return name.toLocaleLowerCase('fr-FR')
    .replace(/[’']s\b/g, '')
    .replace(/\b(day|holiday|public|national|observance)\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function groupHolidays(holidays) {
  return holidays.reduce((groups, holiday) => {
    const previous = groups.at(-1);
    const isNextDay = previous && (Date.parse(`${holiday.date}T00:00:00Z`) - Date.parse(`${previous.endDate}T00:00:00Z`)) === 86400000;
    if (previous && isNextDay && previous.key === getHolidayKey(holiday.name)) {
      previous.endDate = holiday.date;
      previous.names.push(holiday.name);
      return groups;
    }
    groups.push({ key: getHolidayKey(holiday.name), startDate: holiday.date, endDate: holiday.date, names: [holiday.name] });
    return groups;
  }, []);
}

function getHolidayName(names) {
  const counts = names.reduce((result, name) => result.set(name, (result.get(name) || 0) + 1), new Map());
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0][0];
}

function formatHolidayRange(startDate, endDate) {
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
  if (startDate === endDate) return formatter.format(new Date(`${startDate}T00:00:00`));
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start);
  const endMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(end);
  return startMonth === endMonth
    ? `${String(start.getDate()).padStart(2, '0')} - ${String(end.getDate()).padStart(2, '0')} ${endMonth}`
    : `${formatter.format(start)} - ${formatter.format(end)}`;
}

async function loadHolidays(country) {
  if (!country.alpha2Code) return;
  try {
    const year = new Date().getFullYear();
    const holidays = await fetchHolidays(year, country.alpha2Code);
    const groups = groupHolidays(holidays);
    if (groups.length === 0) return;
    elements.holidaysTitle.textContent = `Fêtes nationales de ${year}`;
    elements.holidayList.innerHTML = groups.slice(0, 8).map((group) => `
      <li><time datetime="${group.startDate}">${formatHolidayRange(group.startDate, group.endDate)}</time><span>${escapeHtml(getHolidayName(group.names))}</span></li>
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
    await Promise.allSettled([loadCities(country, wikipediaPage), loadFood(country), loadWeather(country), loadIndicators(country), loadHolidays(country)]);
  } catch (error) {
    hide(elements.loading);
    show(elements.error);
  }
}

init();
