export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'var(--surface-primary)' }}
    >
      {children}
    </div>
  );
}
