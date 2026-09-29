// Shown instantly while a page's data loads (Next.js loading.tsx), so navigation never feels stuck.
export default function PageSkeleton() {
  const bar = "animate-pulse rounded-lg bg-foreground/[0.07]";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className={`${bar} mb-2 h-8 w-48`} />
      <div className={`${bar} mb-6 h-4 w-72`} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} h-24`} />
        ))}
      </div>
      <div className={`${bar} h-64`} />
    </div>
  );
}
