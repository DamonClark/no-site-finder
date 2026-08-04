// Detects when a search's location text is a whole state or the whole country
// rather than a specific city/town — the search API only ever covers a single
// city (see src/app/api/search/route.ts and search-radius/route.ts), so a
// state/country-level query silently returns a small, arbitrary result set.

export type LocationScope = 'city' | 'state' | 'country' | 'empty';

export const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};

const STATE_ABBREVIATIONS = new Set(Object.values(STATE_NAMES));

const COUNTRY_TERMS = new Set([
  'usa', 'u.s.a', 'us', 'u.s', 'united states', 'united states of america',
  'nationwide', 'all states', 'america', 'whole usa', 'the whole country',
]);

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Non-blocking heuristic — "New York" and "Washington" are also common
// shorthand for NYC/DC, so this can produce an occasional false positive.
// That's an acceptable tradeoff since the guardrail only nudges, it never
// blocks the search.
export function classifyLocation(raw: string): LocationScope {
  const input = normalize(raw);
  if (!input) return 'empty';
  if (COUNTRY_TERMS.has(input)) return 'country';
  if (input in STATE_NAMES) return 'state';
  if (STATE_ABBREVIATIONS.has(input.toUpperCase())) return 'state';
  return 'city';
}

export function getStateAbbreviation(raw: string): string | null {
  const input = normalize(raw);
  if (input in STATE_NAMES) return STATE_NAMES[input];
  if (STATE_ABBREVIATIONS.has(input.toUpperCase())) return input.toUpperCase();
  return null;
}

// 2-3 mid-size example cities per state (the product already steers users
// toward towns of ~50k-300k, where no-website leads are most common).
export const STATE_EXAMPLE_CITIES: Record<string, string[]> = {
  AL: ['Huntsville', 'Mobile', 'Tuscaloosa'],
  AK: ['Anchorage', 'Fairbanks'],
  AZ: ['Tucson', 'Mesa', 'Flagstaff'],
  AR: ['Fayetteville', 'Little Rock'],
  CA: ['Fresno', 'Bakersfield', 'Riverside'],
  CO: ['Fort Collins', 'Colorado Springs', 'Boulder'],
  CT: ['New Haven', 'Stamford'],
  DE: ['Newark', 'Dover'],
  FL: ['Tallahassee', 'Fort Myers', 'Sarasota'],
  GA: ['Savannah', 'Augusta', 'Athens'],
  HI: ['Hilo', 'Kailua'],
  ID: ['Boise', 'Idaho Falls'],
  IL: ['Peoria', 'Rockford', 'Naperville'],
  IN: ['Fort Wayne', 'Bloomington'],
  IA: ['Cedar Rapids', 'Iowa City'],
  KS: ['Wichita', 'Topeka'],
  KY: ['Lexington', 'Bowling Green'],
  LA: ['Baton Rouge', 'Lafayette'],
  ME: ['Portland', 'Bangor'],
  MD: ['Annapolis', 'Frederick'],
  MA: ['Worcester', 'Springfield'],
  MI: ['Grand Rapids', 'Ann Arbor', 'Lansing'],
  MN: ['Duluth', 'Rochester'],
  MS: ['Hattiesburg', 'Gulfport'],
  MO: ['Springfield', 'Columbia'],
  MT: ['Missoula', 'Bozeman'],
  NE: ['Lincoln', 'Grand Island'],
  NV: ['Reno', 'Henderson'],
  NH: ['Manchester', 'Nashua'],
  NJ: ['Trenton', 'Jersey City'],
  NM: ['Santa Fe', 'Las Cruces'],
  NY: ['Albany', 'Rochester', 'Syracuse'],
  NC: ['Asheville', 'Wilmington', 'Greensboro'],
  ND: ['Fargo', 'Bismarck'],
  OH: ['Dayton', 'Akron', 'Toledo'],
  OK: ['Tulsa', 'Norman'],
  OR: ['Eugene', 'Bend'],
  PA: ['Allentown', 'Erie', 'Scranton'],
  RI: ['Providence', 'Warwick'],
  SC: ['Charleston', 'Greenville'],
  SD: ['Sioux Falls', 'Rapid City'],
  TN: ['Chattanooga', 'Knoxville', 'Murfreesboro'],
  TX: ['Austin', 'Lubbock', 'Corpus Christi'],
  UT: ['Provo', 'Ogden'],
  VT: ['Burlington', 'Montpelier'],
  VA: ['Roanoke', 'Charlottesville'],
  WA: ['Spokane', 'Tacoma', 'Bellingham'],
  WV: ['Morgantown', 'Charleston'],
  WI: ['Madison', 'Green Bay'],
  WY: ['Casper', 'Cheyenne'],
  DC: ['Washington'],
};
