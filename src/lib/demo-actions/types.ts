import type { ExecutionMode, ExperienceProfile } from "@/lib/experience/mode";

export type ActionRuntimeContext = {
  mode: ExecutionMode;
  profile?: ExperienceProfile;
};

export type ActionResult<TPayload = unknown> = {
  success: boolean;
  message: string;
  payload?: TPayload;
};

export type ActionAdapter<TInput, TPayload = unknown> = (
  input: TInput,
  context: ActionRuntimeContext
) => Promise<ActionResult<TPayload>>;

export function createDemoActionResult<TPayload = unknown>(message: string, payload?: TPayload): ActionResult<TPayload> {
  return {
    success: true,
    message,
    payload
  };
}
