import { penafortBrand, type BrandConfig } from "@/lib/branding/brand-config";
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

export function getSchoolBranding(school: School | null): SchoolBranding {
  if (!school) {
    return legacyPenafortBranding;
  }

  return {
    name: school.name,
    shortName: school.short_name,
    productName: penafortBrand.productName,
    logoUrl: school.logo_url ?? penafortBrand.assets.logo,
    iconUrl: school.logo_url ?? penafortBrand.assets.icon,
    primaryColor: school.primary_color ?? penafortBrand.colors.primary,
    secondaryColor: school.secondary_color ?? penafortBrand.colors.secondary,
    accentColor: school.accent_color ?? penafortBrand.colors.accent,
    backgroundColor: penafortBrand.colors.background,
    foregroundColor: penafortBrand.colors.foreground,
    familyEmailDomain: school.family_email_domain,
    calendarId: school.calendar_id,
    poweredBy: penafortBrand.poweredBy ?? penafortBrand.productName
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
