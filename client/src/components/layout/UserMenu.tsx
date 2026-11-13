import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CurrentUser } from "@asa/shared";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { canAccessAdmin } from "../../utils/auth";
import { classStandingLabel } from "../../utils/labels";
import { fullName } from "../../utils/text";

interface UserMenuProps {
  user: CurrentUser;
  onSignOut: () => void;
}

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-callout text-ink transition-colors duration-160 hover:bg-inset focus-visible:bg-inset focus-visible:outline-offset-0";

/** Avatar button + account popover (disclosure pattern): Esc and outside-click close it. */
export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = fullName(user);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center rounded-full transition-transform duration-160 ease-apple motion-safe:active:scale-[0.96]"
      >
        <Avatar name={name} size="sm" />
        <span className="sr-only">Account menu for {name}</span>
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 z-50 mt-2 w-72 origin-top-right animate-scale-in rounded-row border border-hairline bg-surface p-1.5 shadow-float"
      >
        <div className="flex items-center gap-3 px-3 pt-2.5 pb-3">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-callout font-semibold text-ink">{name}</p>
            <p className="truncate text-footnote font-normal text-ink-2">
              {user.classStanding ? classStandingLabel(user.classStanding) : user.email}
            </p>
          </div>
        </div>
        <div className="mx-3 border-t border-hairline" />
        <ul className="pt-1.5">
          <li>
            <Link to="/profile" className={itemClass} onClick={close}>
              <UserRound className="size-[18px] text-ink-2" aria-hidden="true" /> Profile
            </Link>
          </li>
          {canAccessAdmin(user) && (
            <li>
              <Link to="/admin" className={itemClass} onClick={close}>
                <ShieldCheck className="size-[18px] text-ink-2" aria-hidden="true" /> Admin
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close();
                onSignOut();
              }}
            >
              <LogOut className="size-[18px] text-ink-2" aria-hidden="true" /> Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
