import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Spinner className="h-8 w-8 text-emerald-600" />
    </div>
  );
}
