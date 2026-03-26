// ─── Preset data ─────────────────────────────────────────────────────────────
// To add more industries: append a new group object or add items to an existing
// group. The `value` is passed directly to the Google Places search.

export interface IndustryPreset {
  label: string;
  /** Sent verbatim to the search API as the category / keyword. */
  value: string;
}

export interface IndustryGroup {
  group: string;
  items: IndustryPreset[];
}

export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    group: 'Home Services',
    items: [
      { label: 'Plumber', value: 'plumber' },
      { label: 'HVAC Contractor', value: 'HVAC contractor' },
      { label: 'Roofer', value: 'roofer' },
      { label: 'Electrician', value: 'electrician' },
      { label: 'Landscaper', value: 'landscaper' },
      { label: 'Pest Control', value: 'pest control' },
      { label: 'General Contractor', value: 'general contractor' },
      { label: 'House Painter', value: 'house painter' },
      { label: 'Gutters / Gutter Cleaning', value: 'gutter cleaning' },
      { label: 'Pool Service', value: 'pool service' },
    ],
  },
  {
    group: 'Automotive',
    items: [
      { label: 'Auto Repair Shop', value: 'auto repair shop' },
      { label: 'Auto Body Shop', value: 'auto body shop' },
      { label: 'Tire Shop', value: 'tire shop' },
      { label: 'Transmission Repair', value: 'transmission repair' },
      { label: 'Auto Detailing', value: 'auto detailing' },
      { label: 'Towing Service', value: 'towing service' },
    ],
  },
  {
    group: 'Professional Services',
    items: [
      { label: 'Dentist', value: 'dentist' },
      { label: 'Lawyer', value: 'lawyer' },
      { label: 'Accountant', value: 'accountant' },
      { label: 'Chiropractor', value: 'chiropractor' },
      { label: 'Insurance Agency', value: 'insurance agency' },
      { label: 'Financial Advisor', value: 'financial advisor' },
      { label: 'Real Estate Agent', value: 'real estate agent' },
      { label: 'Tax Preparation', value: 'tax preparation' },
    ],
  },
  {
    group: 'Beauty & Wellness',
    items: [
      { label: 'Med Spa', value: 'med spa' },
      { label: 'Hair Salon', value: 'hair salon' },
      { label: 'Nail Salon', value: 'nail salon' },
      { label: 'Massage Therapist', value: 'massage therapist' },
      { label: 'Barber Shop', value: 'barber shop' },
      { label: 'Tattoo Shop', value: 'tattoo shop' },
      { label: 'Tanning Salon', value: 'tanning salon' },
    ],
  },
  {
    group: 'Health & Medical',
    items: [
      { label: 'Veterinarian', value: 'veterinarian' },
      { label: 'Physical Therapist', value: 'physical therapist' },
      { label: 'Optometrist', value: 'optometrist' },
      { label: 'Urgent Care', value: 'urgent care' },
      { label: 'Podiatrist', value: 'podiatrist' },
    ],
  },
  {
    group: 'Food & Dining',
    items: [
      { label: 'Restaurant', value: 'restaurant' },
      { label: 'Food Truck', value: 'food truck' },
      { label: 'Catering', value: 'catering' },
      { label: 'Bakery', value: 'bakery' },
      { label: 'Food Delivery', value: 'food delivery' },
    ],
  },
  {
    group: 'Trades & Specialty',
    items: [
      { label: 'Locksmith', value: 'locksmith' },
      { label: 'Flooring Installer', value: 'flooring installer' },
      { label: 'Fence Company', value: 'fence company' },
      { label: 'Concrete Contractor', value: 'concrete contractor' },
      { label: 'Drywall Contractor', value: 'drywall contractor' },
      { label: 'Septic Service', value: 'septic service' },
    ],
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────
// Two separate lists so single-search queries ("plumber in Boston") and
// radius-search categories ("plumber") don't mix.

const QUERY_KEY = 'nosf_recent_queries';
const CATEGORY_KEY = 'nosf_recent_categories';
const MAX_RECENT = 6;

function getRecent(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(key: string, value: string): string[] {
  if (!value.trim()) return getRecent(key);
  const updated = [value, ...getRecent(key).filter((v) => v !== value)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
  return updated;
}

export const recentSearches = {
  getQueries: () => getRecent(QUERY_KEY),
  saveQuery: (v: string) => pushRecent(QUERY_KEY, v),
  getCategories: () => getRecent(CATEGORY_KEY),
  saveCategory: (v: string) => pushRecent(CATEGORY_KEY, v),
};
