type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}
