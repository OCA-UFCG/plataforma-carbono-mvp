"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SOBRE_PAGES } from "@/lib/marketing/nav";
import styles from "./SobreSubnav.module.css";

// Sub-navigation of the four Sobre pages, Figma node 18988:8635 (hover
// 18988:10642). It looks like the landing's tab strip but each entry is a
// page with its own URL, so it is a <nav> of links marked with aria-current,
// not an ARIA tablist: a tablist would promise arrow-key switching between
// panels on one page, which is not what these do.
export default function SobreSubnav() {
  const pathname = usePathname();

  return (
    <nav className={styles.subnav} aria-label="Páginas de Sobre">
      <div className={`container ${styles.list}`}>
        {SOBRE_PAGES.map((page) => {
          const current = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`${styles.item} text-subtle-medium${current ? ` ${styles.itemCurrent}` : ""}`}
              aria-current={current ? "page" : undefined}
            >
              {page.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
