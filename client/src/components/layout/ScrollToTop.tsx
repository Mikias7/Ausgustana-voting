import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to the top when the path changes (query-only changes such as tabs keep position). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
