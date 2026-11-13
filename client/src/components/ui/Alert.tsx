import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../utils/cn";

export type AlertTone = "info" | "success" | "warning" | "error";

const styles: Record<AlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "bg-navy-50", icon: "text-navy-900", Icon: Info },
  success: { box: "bg-success/8", icon: "text-success", Icon: CircleCheck },
  warning: { box: "bg-inset", icon: "text-warning", Icon: TriangleAlert },
  error: { box: "bg-danger/8", icon: "text-danger", Icon: CircleAlert },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Quiet inline callout. Errors are announced assertively (role="alert"); others use role="status". */
export function Alert({ tone = "info", title, children, icon, className }: AlertProps) {
  const { box, icon: iconClass, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-row px-4 py-3.5 text-callout", box, className)}
    >
      <span className={cn("mt-[3px] shrink-0 [&_svg]:size-[18px]", iconClass)}>
        {icon ?? <Icon aria-hidden="true" />}
      </span>
      <div className="min-w-0 text-ink-2">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className={cn(Boolean(title) && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
