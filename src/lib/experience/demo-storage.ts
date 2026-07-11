import type { ExperienceProfile } from "@/lib/experience/mode";

const storagePrefix = "educacora-experience";

export function getExperienceStorageKey(profile: ExperienceProfile) {
  return `${storagePrefix}:${profile}`;
}

export function resetExperienceStorage(profile: ExperienceProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getExperienceStorageKey(profile));
}

export function writeExperienceStorage<T>(profile: ExperienceProfile, data: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getExperienceStorageKey(profile), JSON.stringify(data));
}
