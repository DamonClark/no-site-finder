import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { BRAND_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_URL } from "@/lib/site-content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${BRAND_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: BRAND_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: BRAND_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: BRAND_NAME,
    description: SITE_DESCRIPTION,
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND_NAME,
  url: SITE_URL,
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BRAND_NAME,
  url: SITE_URL,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const isLocalHostname =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test") ||
    hostname.includes("lvh.me") ||
    hostname.startsWith("192.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.");
  const shouldUseClerk = process.env.NODE_ENV !== "development" || !isLocalHostname;

  const shell = (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );

  if (!shouldUseClerk) {
    return shell;
  }

  return <ClerkProvider>{shell}</ClerkProvider>;
}
