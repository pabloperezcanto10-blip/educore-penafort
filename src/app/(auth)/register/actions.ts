"use server";

export type RegisterState = {
  message?: string;
  success?: boolean;
};

export async function register(): Promise<RegisterState> {
  return {
    success: false,
    message:
      "El registro público está desactivado. Solicita acceso a la administración de tu centro."
  };
}
