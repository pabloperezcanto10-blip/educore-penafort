import {
  educacoraSchoolBrand,
  penafortBrand,
  type BrandConfig
} from "@/lib/branding/brand-config";

export type PublicSchool = {
  slug: string;
  name: string;
  location: string | null;
  verified: boolean;
  brand: BrandConfig;
};

export const PUBLIC_SCHOOL_SELECTOR_PATH = "/acceso-centro";

export const PUBLIC_SCHOOLS: readonly PublicSchool[] = [
  {
    slug: "colegio-penafort",
    name: "Colegio Peñafort",
    location: "Alicante",
    verified: true,
    brand: penafortBrand
  },
  {
    slug: "educacora",
    name: "Colegio EducaCora",
    location: null,
    verified: true,
    brand: educacoraSchoolBrand
  }
];

export function getPublicSchoolBySlug(slug: string | null | undefined) {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (!normalizedSlug) return null;

  return PUBLIC_SCHOOLS.find((school) => school.slug === normalizedSlug) ?? null;
}

export function getPublicSchoolLoginPath(school: Pick<PublicSchool, "slug">) {
  return `/login?school=${encodeURIComponent(school.slug)}`;
}
