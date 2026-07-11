export type ExecutionMode = "production" | "experience";

export type ExperienceProfile = "director" | "docente" | "familia";

export type RuntimeModeConfig = {
  mode: ExecutionMode;
  profile?: ExperienceProfile;
};

export const productionMode: RuntimeModeConfig = {
  mode: "production"
};

export function createExperienceMode(profile: ExperienceProfile): RuntimeModeConfig {
  return {
    mode: "experience",
    profile
  };
}

export function isExperienceMode(config: RuntimeModeConfig): config is RuntimeModeConfig & { mode: "experience"; profile: ExperienceProfile } {
  return config.mode === "experience";
}

export function isProductionMode(config: RuntimeModeConfig) {
  return config.mode === "production";
}
