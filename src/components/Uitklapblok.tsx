import { useState, type ReactNode } from "react";
import "./Uitklapblok.css";

interface UitklapblokProps {
  titel: string;
  children: ReactNode;
  beginOpen?: boolean;
  /** Korte samenvatting naast de titel, bijv. "2 afwijkingen". */
  badge?: ReactNode;
}

export function Uitklapblok({ titel, children, beginOpen = false, badge }: UitklapblokProps) {
  const [open, setOpen] = useState(beginOpen);
  return (
    <section className="uitklap">
      <button type="button" className="uitklap-kop" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="uitklap-titel">{titel}</span>
        {badge}
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="uitklap-inhoud">{children}</div> : null}
    </section>
  );
}
