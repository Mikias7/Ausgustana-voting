import { useEffect } from "react";

export const SITE_TITLE = "ASA Elections · Augustana University";

/** Sets document.title to "<title> · ASA Elections" (or the site title when omitted). */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ASA Elections` : SITE_TITLE;
  }, [title]);
}
