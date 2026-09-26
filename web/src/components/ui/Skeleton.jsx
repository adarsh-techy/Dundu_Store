export function Skeleton({ className = '', ...props }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" {...props} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="aspect-[3/4] rounded-2xl" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3.5 w-2/5" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function LineSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}
