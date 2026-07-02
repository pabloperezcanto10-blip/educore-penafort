type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
