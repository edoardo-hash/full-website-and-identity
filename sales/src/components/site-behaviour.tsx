"use client";

import { useEffect } from "react";

/**
 * The two behaviours the company site's script gives its header: the header turns solid once the page is scrolled
 * (is-stuck) and the menu button opens the full-screen menu (body.menu-open). No reveal animations: the content is
 * there from the first paint.
 */
export function SiteBehaviour() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-header]");
    const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    const menu = document.getElementById("site-menu");
    const onScroll = () => header?.classList.toggle("is-stuck", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const setMenu = (open: boolean) => {
      document.body.classList.toggle("menu-open", open);
      toggle?.setAttribute("aria-expanded", String(open));
      menu?.setAttribute("aria-hidden", String(!open));
      if (open) menu?.querySelector<HTMLElement>("a")?.focus();
    };
    const onToggle = () => setMenu(!document.body.classList.contains("menu-open"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
    };
    const onMenuClick = (e: Event) => {
      if ((e.target as HTMLElement).closest("a")) setMenu(false);
    };
    toggle?.addEventListener("click", onToggle);
    menu?.addEventListener("click", onMenuClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      toggle?.removeEventListener("click", onToggle);
      menu?.removeEventListener("click", onMenuClick);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, []);
  return null;
}
