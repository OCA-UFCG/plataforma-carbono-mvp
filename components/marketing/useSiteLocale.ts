"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { localeCookie, readSiteLocale, type SiteLocale } from "@/lib/locale";

// The visitor's language, as the server read it from the NEXT_LOCALE cookie
// (i18n/request.ts), and the way to change it: write the cookie and render
// the page again on the server, which then reads the new one.
export function useSiteLocale(): [SiteLocale, (locale: SiteLocale) => void] {
  const router = useRouter();
  const locale = readSiteLocale(useLocale());

  const chooseLocale = useCallback(
    (next: SiteLocale) => {
      document.cookie = localeCookie(next);
      // Keeps the scroll and the client state, unlike a reload.
      router.refresh();
    },
    [router],
  );

  return [locale, chooseLocale];
}
