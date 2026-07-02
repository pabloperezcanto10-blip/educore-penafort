type EmptyDashboardProps = {
  title: string;
  description: string;
};

export function EmptyDashboard({ title, description }: EmptyDashboardProps) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-white p-8">
        <p className="text-sm text-muted-foreground">
          Este espacio está preparado para futuras funcionalidades del rol.
        </p>
      </div>
    </section>
  );
}
