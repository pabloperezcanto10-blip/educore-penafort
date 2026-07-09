import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const siteUrl = "https://educacora.es";
const siteTitle = "EducaCora | El corazón de tu centro educativo";
const siteDescription =
  "EducaCora es una plataforma inteligente para centros educativos que conecta dirección, docentes, familias y alumnado en un único entorno digital.";
const ogImage = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "EducaCora",
  authors: [{ name: "EducaCora", url: siteUrl }],
  creator: "EducaCora",
  publisher: "EducaCora",
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
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "EducaCora",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "EducaCora | El corazón de tu centro educativo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage]
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
