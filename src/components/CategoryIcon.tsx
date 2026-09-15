import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CategoryIconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({ name, color, size = 18, className = '' }: CategoryIconProps) {
  const Icon = ((Icons as unknown) as Record<string, LucideIcon>)[name] ?? Icons.Wallet;
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{
        backgroundColor: color ? `${color}20` : '#6b728020',
        width: size + 16,
        height: size + 16,
      }}
    >
      <Icon size={size} style={{ color: color ?? '#6b7280' }} className={className} />
    </div>
  );
}
