"use client";

import { unlinkAdminFamilyStudent } from "../actions";

export function UnlinkFamilyStudentForm({
  parentId,
  studentId
}: {
  parentId: string;
  studentId: string;
}) {
  return (
    <form
      action={unlinkAdminFamilyStudent}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Vas a eliminar esta relacion familiar. Esta accion puede afectar al acceso de la familia al alumno."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="parent_id" value={parentId} />
      <input type="hidden" name="student_id" value={studentId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
      >
        Desvincular
      </button>
    </form>
  );
}
