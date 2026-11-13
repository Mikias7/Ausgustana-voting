import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CurrentUser } from "@asa/shared";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { canAccessAdmin } from "../../utils/auth";
import { classStandingLabel } from "../../utils/labels";
import { cn } from "../../utils/cn";
import { fullName } from "../../utils/text";

interface UserMenuProps {
  user: CurrentUser;
  onSignOut: () => void;
}

const itemClass =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-augie-blue-50 hover:text-augie-blue-800 focus-visible:bg-augie-blue-50";

/** Account dropdown (disclosure pattern): Esc and outside-click close it. */
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
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        <Avatar name={name} size="sm" className="ring-0" />
        <span className="max-w-[10rem] truncate">{user.firstName}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 z-40 mt-2 w-64 origin-top-right animate-scale-in rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      >
        <div className="border-b border-slate-100 px-3 pt-1 pb-3">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          {user.classStanding && (
            <p className="mt-1 text-xs font-medium text-augie-gold-700">{classStandingLabel(user.classStanding)}</p>
          )}
        </div>
        <ul className="pt-2">
          <li>
            <Link to="/profile" className={itemClass} onClick={close}>
              <UserRound className="size-4" aria-hidden="true" /> My profile
            </Link>
          </li>
          {canAccessAdmin(user) && (
            <li>
              <Link to="/admin" className={itemClass} onClick={close}>
                <ShieldCheck className="size-4" aria-hidden="true" /> Admin
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
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
