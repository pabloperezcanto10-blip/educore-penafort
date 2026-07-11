import type { ExecutionMode, ExperienceProfile } from "@/lib/experience/mode";

export type DataSourceKind = "supabase" | "fixture";

export type DataRequestContext = {
  mode: ExecutionMode;
  profile?: ExperienceProfile;
};

export type DataAdapterResult<T> = {
  data: T;
  source: DataSourceKind;
  errorMessage?: string | null;
};

export type DataAdapter<TParams, TResult> = (params: TParams, context: DataRequestContext) => Promise<DataAdapterResult<TResult>>;

export type DemoFixture<T> = {
  id: string;
  description: string;
  data: T;
};
