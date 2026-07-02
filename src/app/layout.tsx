import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCore",
  description: "Gesti\u00f3n educativa inteligente para Colegio Pe\u00f1afort"
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
