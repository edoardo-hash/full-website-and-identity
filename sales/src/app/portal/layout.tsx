import { Hanken_Grotesk } from "next/font/google";
import "./portal.css";

const hanken = Hanken_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["300", "400", "500"], variable: "--hanken", display: "swap" });

/**
 * The agent portal keeps its own look (Edo, 1 Nov 2026: "il portale non si tocca"): the stylesheet and font the whole
 * app had before the public site took the company design. Loaded only under /portal.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // --font is declared again here, where --hanken exists (a var() resolved on :root would find no --hanken and fail).
  const style = { "--font": `var(--hanken), "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif`, fontFamily: "var(--font)", display: "contents" } as React.CSSProperties;
  return <div className={hanken.variable} style={style}>{children}</div>;
}
