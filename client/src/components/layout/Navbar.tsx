import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdmin, loginPath } from "../../utils/auth";
import { cn } from "../../utils/cn";
import { fullName } from "../../utils/text";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";
import { BRAND } from "./brand";
import { UserMenu } from "./UserMenu";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/elections", label: "Elections", end: false },
  { to: "/about", label: "About", end: false },
  { to: "/contact", label: "Contact", end: false },
] as const;

function desktopLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "after:absolute after:inset-x-3 after:-bottom-[1px] after:h-0.5 after:rounded-full after:transition-colors",
    isActive ? "text-white after:bg-augie-gold" : "text-augie-blue-100 hover:text-white after:bg-transparent",
  );
}

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium",
    isActive ? "bg-white/10 text-white" : "text-augie-blue-100 hover:bg-white/5 hover:text-white",
  );
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile menu on navigation.
  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  async function handleSignOut() {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  }

  const signInTo = location.pathname === "/login" ? "/login" : loginPath(location.pathname + location.search);

  return (
    <header className="on-dark sticky top-0 z-30 bg-augie-blue text-white shadow-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md">
            <img src={BRAND.logoLight} alt="" className="size-10 shrink-0 sm:size-12" width={48} height={48} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-serif text-lg font-semibold tracking-tight text-white sm:text-xl">
                {BRAND.appName}
              </span>
              <span className="truncate text-[0.7rem] font-medium tracking-wide text-augie-gold-200 sm:text-xs">
                {BRAND.orgName}
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className={desktopLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden min-w-[7rem] justify-end md:flex">
            {loading ? null : user ? (
              <UserMenu user={user} onSignOut={handleSignOut} />
            ) : (
              <Button to={signInTo} variant="gold" size="sm" leftIcon={<LogIn className="size-4" aria-hidden="true" />}>
                Sign in
              </Button>
            )}
          </div>

          <button
            type="button"
            className="-mr-2 inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </Container>

      <div className="h-[3px] bg-linear-to-r from-augie-gold via-augie-gold-300 to-augie-gold" aria-hidden="true" />

      <div id="mobile-nav" hidden={!mobileOpen} className="border-t border-white/10 bg-augie-blue-800 md:hidden">
        <Container className="py-3">
          <nav aria-label="Main mobile">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className={mobileLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 border-t border-white/10 pt-3">
            {user ? (
              <ul className="flex flex-col gap-1">
                <li className="px-3 pb-2 text-sm text-augie-blue-100">
                  Signed in as <span className="font-semibold text-white">{fullName(user)}</span>
                </li>
                <li>
                  <NavLink to="/profile" className={mobileLinkClass}>
                    <UserRound className="size-5" aria-hidden="true" /> My profile
                  </NavLink>
                </li>
                {canAccessAdmin(user) && (
                  <li>
                    <NavLink to="/admin" className={mobileLinkClass}>
                      <ShieldCheck className="size-5" aria-hidden="true" /> Admin
                    </NavLink>
                  </li>
                )}
                <li>
                  <button type="button" onClick={handleSignOut} className={cn(mobileLinkClass({ isActive: false }), "w-full")}>
                    <LogOut className="size-5" aria-hidden="true" /> Sign out
                  </button>
                </li>
              </ul>
            ) : (
              !loading && (
                <Button to={signInTo} variant="gold" fullWidth leftIcon={<LogIn className="size-4" aria-hidden="true" />}>
                  Sign in
                </Button>
              )
            )}
          </div>
        </Container>
      </div>
    </header>
  );
}
