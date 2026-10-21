export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-9 w-56 rounded-lg bg-line" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-line/70" />
      <div className="mt-8 h-64 rounded-xl border border-line bg-paper" />
    </div>
  );
}
