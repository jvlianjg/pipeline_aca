import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'neutral' | 'error' | 'info';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#1E7A5F]/10 text-[#1E7A5F]',
  warning: 'bg-[#D4953A]/10 text-[#D4953A]',
  neutral: 'bg-[#F0F1F4] text-[#5C6370] border border-[#E5E7EB]',
  error: 'bg-[#C4523A]/10 text-[#C4523A]',
  info: 'bg-[#2E4A62]/10 text-[#2E4A62]',
};

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium uppercase tracking-[0.12px]',
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function AdopcionBadge({ level }: { level: string }) {
  const map: Record<string, BadgeVariant> = {
    'TOTAL': 'success',
    'PARCIAL': 'warning',
    'SUPERFICIAL': 'neutral',
    'NULA': 'error',
  };
  return <Badge variant={map[level] || 'neutral'}>{level}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    'Completado': 'success',
    'En progreso': 'warning',
    'Pendiente': 'neutral',
  };
  return <Badge variant={map[status] || 'neutral'}>{status}</Badge>;
}
