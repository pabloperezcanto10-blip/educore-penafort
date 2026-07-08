import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCore",
  description: "Gestión educativa inteligente para centros educativos",
  applicationName: "EduCore",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/educore/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/educore/app-icon-dark.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/brand/educore/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }]
  },
  appleWebApp: {
    capable: true,
    title: "EduCore",
    statusBarStyle: "black-translucent"
  },
  other: {
    "apple-touch-startup-image": "/brand/educore/splash.svg"
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
