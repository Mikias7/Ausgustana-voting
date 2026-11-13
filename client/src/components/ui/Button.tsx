import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../utils/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "outline-light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-augie-blue text-white shadow-sm hover:bg-augie-blue-800 active:bg-augie-blue-900",
  secondary:
    "border border-slate-300 bg-white text-augie-blue-800 shadow-sm hover:border-augie-blue-300 hover:bg-augie-blue-50",
  ghost: "text-augie-blue-700 hover:bg-augie-blue-50",
  danger: "bg-red-700 text-white shadow-sm hover:bg-red-800",
  gold: "bg-augie-gold text-augie-blue-950 shadow-sm hover:bg-augie-gold-300",
  "outline-light": "border border-white/40 text-white hover:border-white hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    to?: undefined;
    loading?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

export type ButtonLinkProps = CommonProps &
  Omit<LinkProps, "className" | "children"> & {
    ref?: Ref<HTMLAnchorElement>;
  };

function Content({ leftIcon, rightIcon, children, loading }: CommonProps & { loading?: boolean }) {
  return (
    <>
      {loading ? <Spinner className="size-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );
}

/** Button that can also render as a router Link (pass `to`). */
export function Button(props: ButtonProps | ButtonLinkProps) {
  if (props.to !== undefined) {
    const { variant, size, fullWidth, leftIcon, rightIcon, className, children, ...linkProps } =
      props as ButtonLinkProps;
    return (
      <Link className={buttonClasses(variant, size, fullWidth, className)} {...linkProps}>
        <Content leftIcon={leftIcon} rightIcon={rightIcon}>
          {children}
        </Content>
      </Link>
    );
  }

  const {
    variant,
    size,
    fullWidth,
    leftIcon,
    rightIcon,
    className,
    children,
    loading = false,
    disabled,
    type = "button",
    ...buttonProps
  } = props as ButtonProps;

  return (
    <button
      type={type}
      className={buttonClasses(variant, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      <Content leftIcon={leftIcon} rightIcon={rightIcon} loading={loading}>
        {children}
      </Content>
    </button>
  );
}
