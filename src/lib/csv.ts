import type { Business } from '@/types';

const CSV_HEADERS = [
  'Name', 'Address', 'Phone', 'Rating', 'Reviews', 'Lead Score', 'Category',
  'Has Website', 'Website', 'Website Status', 'Business Status', 'Maps URL', 'Profile URL',
  'Email', 'Email Source', 'Owner Name',
];

export function businessesToCsv(businesses: Business[]): string {
  const rows = businesses.map((b) => [
    b.name, b.address, b.phone,
    b.rating ?? '', b.reviewCount ?? '', b.leadScore, b.category,
    b.hasWebsite ? 'Yes' : 'No', b.website ?? '', b.websiteStatus,
    b.businessStatus, b.mapsUrl, b.profileUrl,
    b.email ?? '', b.emailSource ?? '', b.ownerName ?? '',
  ]);
  return [CSV_HEADERS, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
