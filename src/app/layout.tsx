import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://educacora.es"),
  title: "EducaCora | El corazón de tu centro educativo",
  description: "Plataforma escolar inteligente para conectar dirección, docentes, familias y alumnos desde un único lugar.",
  applicationName: "EducaCora",
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://educacora.es"
  },
  openGraph: {
    title: "EducaCora | El corazón de tu centro educativo",
    description: "Plataforma escolar inteligente para conectar dirección, docentes, familias y alumnos desde un único lugar.",
    url: "https://educacora.es",
    siteName: "EducaCora",
    type: "website"
  },
  icons: {
    icon: [
      { url: "/brand/educore/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/educore/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/educore/app-icon-dark.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/brand/educore/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "EducaCora",
    statusBarStyle: "black-translucent"
  },
  other: {
    "apple-touch-startup-image": "/brand/educore/splash.png"
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
