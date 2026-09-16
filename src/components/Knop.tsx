import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Knop.css";

interface KnopProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primair" | "secundair" | "gevaar" | "tekst";
  children: ReactNode;
  volledigeBreedte?: boolean;
}

/**
 * Alle knoppen in de app lopen hierdoorheen zodat aanraakdoelgrootte en
 * schaalgedrag (via rem, zie global.css) overal gegarandeerd gelijk zijn.
 */
export function Knop({ variant = "primair", volledigeBreedte, className, children, ...rest }: KnopProps) {
  const klassen = ["knop", `knop--${variant}`, volledigeBreedte ? "knop--vol" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={klassen} {...rest}>
      {children}
    </button>
  );
}
