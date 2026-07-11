import type { ExperienceProfile } from "@/lib/experience/mode";

const storagePrefix = "educacora-experience";
const storageScopes = ["demo", "guide"] as const;

type ExperienceStorageScope = (typeof storageScopes)[number];

export function getExperienceStorageKey(profile: ExperienceProfile, scope: ExperienceStorageScope = "demo") {
  return `${storagePrefix}:${profile}:${scope}`;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function readExperienceStorage<T>(profile: ExperienceProfile, scope: ExperienceStorageScope = "demo"): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(getExperienceStorageKey(profile, scope));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.removeItem(getExperienceStorageKey(profile, scope));
    return null;
  }
}

export function resetExperienceStorage(profile: ExperienceProfile, scope?: ExperienceStorageScope) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (scope) {
    storage.removeItem(getExperienceStorageKey(profile, scope));
    return;
  }

  storageScopes.forEach((item) => storage.removeItem(getExperienceStorageKey(profile, item)));
}

export function writeExperienceStorage<T>(profile: ExperienceProfile, data: T, scope: ExperienceStorageScope = "demo") {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(getExperienceStorageKey(profile, scope), JSON.stringify(data));
}
