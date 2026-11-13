import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../utils/cn";
import { Spinner } from "./Spinner";

/** `gold` is for navy surfaces only (navy text on gold). */
export type ButtonVariant = "primary" | "secondary" | "tinted" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-[background-color,color,box-shadow,transform] duration-160 ease-apple motion-safe:active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-hover active:bg-navy-hover",
  secondary: "border border-hairline-strong bg-surface text-ink hover:bg-inset",
  tinted: "bg-navy-100 text-navy-900 hover:bg-navy-200/70",
  ghost: "text-ink-2 hover:bg-navy-900/5 hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90",
  gold: "bg-gold text-navy-900 hover:bg-gold-hover",
};

/** Heights 36 / 44 / 52. */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[0.875rem]",
  md: "h-11 px-5 text-callout",
  lg: "h-13 px-7 text-body",
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

/** While loading the label stays (transparent) so the button keeps its width; a spinner sits on top. */
function Content({ leftIcon, rightIcon, children, loading }: CommonProps & { loading?: boolean }) {
  return (
    <>
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="size-4" />
        </span>
      )}
    </>
  );
}

/** Pill button that can also render as a router Link (pass `to`). */
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
