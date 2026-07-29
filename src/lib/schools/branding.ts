import {
  educacoraExperienceBrand,
  penafortBrand,
  type BrandConfig
} from "@/lib/branding/brand-config";
import type { School, SchoolBranding } from "@/lib/schools/types";

export const legacyPenafortBranding: SchoolBranding = {
  name: penafortBrand.name,
  shortName: penafortBrand.name,
  productName: penafortBrand.productName,
  logoUrl: penafortBrand.assets.logo,
  iconUrl: penafortBrand.assets.icon,
  primaryColor: penafortBrand.colors.primary,
  secondaryColor: penafortBrand.colors.secondary,
  accentColor: penafortBrand.colors.accent,
  backgroundColor: penafortBrand.colors.background,
  foregroundColor: penafortBrand.colors.foreground,
  familyEmailDomain: "penafort.com",
  calendarId: null,
  poweredBy: penafortBrand.poweredBy ?? penafortBrand.productName
};

export const platformBranding: SchoolBranding = {
  name: "EducaCora",
  shortName: "EducaCora",
  productName: educacoraExperienceBrand.productName,
  logoUrl: educacoraExperienceBrand.assets.logo,
  iconUrl: educacoraExperienceBrand.assets.icon,
  primaryColor: educacoraExperienceBrand.colors.primary,
  secondaryColor: educacoraExperienceBrand.colors.secondary,
  accentColor: educacoraExperienceBrand.colors.accent,
  backgroundColor: educacoraExperienceBrand.colors.background,
  foregroundColor: educacoraExperienceBrand.colors.foreground,
  familyEmailDomain: null,
  calendarId: null,
  poweredBy: educacoraExperienceBrand.poweredBy ?? educacoraExperienceBrand.productName
};

export function getSchoolBranding(school: School | null): SchoolBranding {
  if (!school) {
    return platformBranding;
  }

  const fallback = school.slug.includes("penafort")
    ? legacyPenafortBranding
    : platformBranding;

  return {
    name: school.name,
    shortName: school.short_name,
    productName: fallback.productName,
    logoUrl: school.logo_url ?? fallback.logoUrl,
    iconUrl: school.logo_url ?? fallback.iconUrl,
    primaryColor: school.primary_color ?? fallback.primaryColor,
    secondaryColor: school.secondary_color ?? fallback.secondaryColor,
    accentColor: school.accent_color ?? fallback.accentColor,
    backgroundColor: fallback.backgroundColor,
    foregroundColor: fallback.foregroundColor,
    familyEmailDomain: school.family_email_domain,
    calendarId: school.calendar_id,
    poweredBy: fallback.poweredBy
  };
}

export function toBrandConfig(branding: SchoolBranding, id: string): BrandConfig {
  return {
    id,
    name: branding.name,
    productName: branding.productName,
    assets: {
      logo: branding.logoUrl,
      icon: branding.iconUrl
    },
    colors: {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor,
      background: branding.backgroundColor,
      foreground: branding.foregroundColor
    },
    poweredBy: branding.poweredBy
  };
}
