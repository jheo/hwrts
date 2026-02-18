export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text-active)]">404</h1>
        <p className="mt-2 text-[var(--text-body)]">Certificate not found</p>
        <a
          href="/"
          className="mt-4 inline-block text-sm text-[var(--text-active)] underline"
        >
          Go to HumanWrites
        </a>
      </div>
    </main>
  );
}
