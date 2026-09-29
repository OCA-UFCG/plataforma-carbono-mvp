"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { shouldStepBack } from "@/lib/marketing/backNavigation";
import styles from "./ConteudoHeader.module.css";

// "Voltar", Figma node 19015:13061. A link to the listing, so it works before
// hydration and without JavaScript. When the visitor came from another page of
// this site, the click steps back through history instead and returns them
// where they were; arriving from outside, or through the login redirect,
// history.back() would leave the site, so the link stands (shouldStepBack).
// window.history rather than useRouter(): router.back() does the same, and a
// hook would tie this to a mounted App Router, which the markup tests lack.
export default function BackButton() {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click (new tab, new window) keeps the link's own behaviour.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const [entry] = performance.getEntriesByType("navigation");
    const stepBack = shouldStepBack({
      initialUrl: entry?.name ?? null,
      currentUrl: window.location.href,
      referrer: document.referrer,
      historyLength: window.history.length,
    });
    if (!stepBack) return;

    event.preventDefault();
    window.history.back();
  }

  return (
    <Link href="/comunicacao" className={`${styles.back} text-body`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
      <img src="/icons/conteudo/arrow-back.svg" alt="" width={16} height={16} />
      Voltar
    </Link>
  );
}
