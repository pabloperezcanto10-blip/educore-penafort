import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE, SITE_URL } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: {
      es: "/"
    }
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "EducaCora | El corazón de tu centro educativo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/brand/educore/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/educore/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/educore/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/educore/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/educore/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/educore/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/brand/educore/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/educore/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/educore/app-icon-dark.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/brand/educore/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "EducaCora",
    statusBarStyle: "black-translucent",
    startupImage: ["/brand/educore/splash.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#0F1B2E"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <AppProviders />
      </body>
    </html>
  );
}
