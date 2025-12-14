import { LucideIcon } from "lucide-react";

type KpiVariant = "default" | "primary" | "danger" | "warning";

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode; // Changé en ReactNode pour plus de flexibilité
  icon?: LucideIcon;
  variant?: KpiVariant;
}) {
  // Configuration des styles selon la variante
  const styles = {
    default: {
      value: "text-zinc-900",
      iconBox: "bg-zinc-100 text-zinc-500",
      border: "border-zinc-200 hover:border-zinc-300",
    },
    primary: {
      value: "text-zinc-900",
      iconBox: "bg-sky-50 text-sky-600",
      border: "border-sky-100 hover:border-sky-200 shadow-sky-100/50",
    },
    danger: {
      value: "text-rose-600",
      iconBox: "bg-rose-50 text-rose-600",
      border: "border-rose-100 hover:border-rose-200 shadow-rose-100/50",
    },
    warning: {
      value: "text-amber-600",
      iconBox: "bg-amber-50 text-amber-600",
      border: "border-amber-100 hover:border-amber-200",
    },
  };

  const s = styles[variant];

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${s.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className={`text-2xl font-bold tracking-tight ${s.value}`}>
              {value}
            </h3>
          </div>
        </div>
        
        {Icon && (
          <div className={`rounded-xl p-2.5 transition-colors ${s.iconBox}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
      
      {subtitle && (
        <div className="mt-3 text-xs text-zinc-500 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  );
}