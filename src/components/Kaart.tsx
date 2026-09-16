import type { CSSProperties, ReactNode } from "react";
import "./Kaart.css";

export function Kaart({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`kaart ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
