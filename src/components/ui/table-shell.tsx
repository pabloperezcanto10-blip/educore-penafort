type TableShellProps = {
  children: React.ReactNode;
};

export function TableShell({ children }: TableShellProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
