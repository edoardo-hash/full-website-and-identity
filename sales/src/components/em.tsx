import { Fragment } from "react";

/** Renders a dictionary string with *word* as the italic accent of the company design ("*known* from the inside"). */
export function Em({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/);
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <Fragment key={i}>{p}</Fragment>))}</>;
}
