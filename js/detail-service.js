export const WIKIPEDIA_TITLES = {
  CD: 'République démocratique du Congo',
  CG: 'République du Congo',
};

export const CUISINE_AREAS = {
  DZ: 'Algerian', CA: 'Canadian', CN: 'Chinese', HR: 'Croatian', NL: 'Dutch', EG: 'Egyptian',
  FR: 'French', GR: 'Greek', IN: 'Indian', IE: 'Irish', IT: 'Italian', JM: 'Jamaican', JP: 'Japanese',
  KE: 'Kenyan', MY: 'Malaysian', MX: 'Mexican', MA: 'Moroccan', PL: 'Polish', PT: 'Portuguese',
  RU: 'Russian', SK: 'Slovak', ES: 'Spanish', TH: 'Thai', TN: 'Tunisian', TR: 'Turkish',
  UA: 'Ukrainian', GB: 'British', US: 'American', VN: 'Vietnamese', KR: 'Korean', PH: 'Filipino', SY: 'Syrian',
};

export async function fetchWikipediaPage(title) {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'extracts|info|pageprops',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    redirects: '1',
    titles: title,
  });
  const response = await fetch(`https://fr.wikipedia.org/w/api.php?${query}`);
  if (!response.ok) throw new Error('Wikipedia request failed');
  const data = await response.json();
  return Object.values(data.query?.pages || {})[0] || null;
}

export async function queryWikidata(query) {
  const response = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json' },
  });
  if (!response.ok) throw new Error('Wikidata request failed');
  const data = await response.json();
  return data.results?.bindings || [];
}

export async function fetchMeals(area) {
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
  if (!response.ok) throw new Error('Meal request failed');
  const data = await response.json();
  return data.meals || [];
}

export async function fetchWeather(latitude, longitude) {
  const query = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
  if (!response.ok) throw new Error('Weather request failed');
  const data = await response.json();
  if (!data.current) throw new Error('Weather data unavailable');
  return data.current;
}

export async function fetchIndicator(countryCode, indicatorCode) {
  const response = await fetch(`https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?format=json&per_page=60`);
  if (!response.ok) throw new Error('Indicator request failed');
  const data = await response.json();
  const point = data[1]?.find((item) => item.value !== null);
  if (!point) throw new Error('Indicator unavailable');
  return point.value;
}

export async function fetchHolidays(year, countryCode) {
  const response = await fetch(`https://date.nager.at/api/v4/Holidays/${countryCode}/${year}`);
  if (!response.ok) throw new Error('Holiday request failed');
  return response.json();
}
