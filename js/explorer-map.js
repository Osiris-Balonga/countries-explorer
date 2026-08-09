const FALLBACK_FILL = '#1f2531';

export function createMapRenderer({ mapElement, getCountry, onCountrySelect, showLoading }) {
  let mapInstance = null;
  let isLoading = false;
  let flagDefinitions = null;
  const paintedFlags = new Set();

  function getFlagDefinitions() {
    if (flagDefinitions) return flagDefinitions;
    const svg = mapElement.querySelector('svg');
    if (!svg) return null;
    flagDefinitions = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(flagDefinitions);
    return flagDefinitions;
  }

  function getFlagPatternId(country) {
    const id = `flag-${country.alpha2Code}`;
    if (paintedFlags.has(id)) return id;
    const definitions = getFlagDefinitions();
    const flagUrl = country.flags?.png || country.flags?.svg || '';
    if (!definitions || !flagUrl) return null;

    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', id);
    pattern.setAttribute('patternUnits', 'objectBoundingBox');
    pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
    pattern.setAttribute('width', '1');
    pattern.setAttribute('height', '1');

    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', flagUrl);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', '1');
    image.setAttribute('height', '1');
    image.setAttribute('preserveAspectRatio', 'none');
    pattern.appendChild(image);
    definitions.appendChild(pattern);
    paintedFlags.add(id);
    return id;
  }

  function paint(countries) {
    if (!mapInstance?.regions) return;
    const visibleCountries = new Map(countries.map((country) => [country.alpha2Code, country]));
    Object.entries(mapInstance.regions).forEach(([code, region]) => {
      const country = visibleCountries.get(code);
      const patternId = country ? getFlagPatternId(country) : null;
      region.element?.shape?.setStyle('fill', patternId ? `url(#${patternId})` : FALLBACK_FILL);
    });
  }

  function initialize() {
    mapElement.innerHTML = '';
    mapInstance = new jsVectorMap({
      selector: '#map',
      map: 'world',
      backgroundColor: 'transparent',
      zoomButtons: true,
      regionStyle: { initial: { fill: FALLBACK_FILL }, hover: {}, selected: {} },
      onRegionTooltipShow(event, tooltip, code) {
        const country = getCountry(code);
        if (country) tooltip.text(`${country.name} - ${country.population.toLocaleString('fr-FR')} hab.`);
      },
      onRegionClick(event, code) {
        const country = getCountry(code);
        if (country) onCountrySelect(country);
      },
    });
    isLoading = false;
    paint(getCountry());
  }

  function render(countries) {
    if (!mapInstance && !isLoading) {
      isLoading = true;
      showLoading();
      window.setTimeout(initialize, 550);
    }
    if (mapInstance) paint(countries);
  }

  return { render };
}
