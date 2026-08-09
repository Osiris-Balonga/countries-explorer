const COUNTRIES_URL = 'https://countries.dev/countries';

export async function fetchCountries() {
  const response = await fetch(COUNTRIES_URL);
  if (!response.ok) throw new Error(`Country request failed: ${response.status}`);
  return response.json();
}
