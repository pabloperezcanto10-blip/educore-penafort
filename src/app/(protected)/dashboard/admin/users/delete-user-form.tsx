"use client";

import { deleteAdminUser } from "../actions";

export function DeleteUserForm({
  id,
  role
}: {
  id: string;
  role: string;
}) {
  return (
    <form
      action={deleteAdminUser}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Se eliminara completamente el usuario y su acceso. Esta accion no se puede deshacer."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="role" value={role} />
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md border border-red-300 bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Eliminar
      </button>
    </form>
  );
}
