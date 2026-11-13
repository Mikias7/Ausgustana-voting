import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../utils/cn";

export type AlertTone = "info" | "success" | "warning" | "error";

const styles: Record<AlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "border-augie-blue-200 bg-augie-blue-50 text-augie-blue-900", icon: "text-augie-blue-600", Icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "text-emerald-600", Icon: CircleCheck },
  warning: { box: "border-augie-gold-300 bg-augie-gold-50 text-augie-gold-900", icon: "text-augie-gold-700", Icon: TriangleAlert },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: "text-red-600", Icon: CircleAlert },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Inline message. Errors are announced assertively (role="alert"); others use role="status". */
export function Alert({ tone = "info", title, children, icon, className }: AlertProps) {
  const { box, icon: iconClass, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-4 text-sm", box, className)}
    >
      <span className={cn("mt-0.5 shrink-0", iconClass)}>{icon ?? <Icon className="size-5" aria-hidden="true" />}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title ? "mt-1" : null, "leading-relaxed")}>{children}</div>}
      </div>
    </div>
  );
}
