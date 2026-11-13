import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { FloatingNav } from "./FloatingNav";
import { Footer } from "./Footer";
import { MobileHeader } from "./MobileHeader";
import { ScrollToTop } from "./ScrollToTop";

/**
 * Site shell. Desktop: floating glass pill nav. Mobile: slim header + floating bottom tab bar,
 * The footer carries the bottom padding that clears the tab bar (and the safe area).
 */
export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-navy-900 px-5 py-3 text-callout font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <MobileHeader />
      <FloatingNav />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col pt-6 pb-16 md:pt-14 md:pb-24">
        <Outlet />
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
