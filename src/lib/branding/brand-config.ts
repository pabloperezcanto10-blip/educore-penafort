export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

export type BrandAssets = {
  logo: string;
  icon: string;
  favicon?: string;
};

export type BrandConfig = {
  id: string;
  name: string;
  productName: string;
  tagline?: string;
  assets: BrandAssets;
  colors: BrandPalette;
  poweredBy?: string;
};

export const penafortBrand: BrandConfig = {
  id: "colegio-penafort",
  name: "Colegio Peñafort",
  productName: "EducaCora",
  tagline: "Acceso a la plataforma del centro",
  assets: {
    logo: "/branding/penafort-logo.jpg",
    icon: "/branding/penafort-logo.jpg"
  },
  colors: {
    primary: "#075985",
    secondary: "#0F172A",
    accent: "#0EA5E9",
    background: "#F8FAFC",
    foreground: "#0F172A"
  },
  poweredBy: "EducaCora"
};

export const educacoraExperienceBrand: BrandConfig = {
  id: "educacora-experience",
  name: "Centro Demo EducaCora",
  productName: "EducaCora",
  tagline: "El corazón de tu centro educativo.",
  assets: {
    logo: "/brand/educore/logo.svg",
    icon: "/brand/educore/icon.svg",
    favicon: "/favicon.ico"
  },
  colors: {
    primary: "#2E7D5A",
    secondary: "#0F172A",
    accent: "#D4A64F",
    background: "#F6F3EC",
    foreground: "#0F172A"
  },
  poweredBy: "EducaCora"
};
