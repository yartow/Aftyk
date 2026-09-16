import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import "./Invoerveld.css";

interface InvoerveldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Invoerveld({ label, id, ...rest }: InvoerveldProps) {
  const veldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="invoerveld" htmlFor={veldId}>
      <span className="invoerveld-label">{label}</span>
      <input id={veldId} className="invoerveld-input" {...rest} />
    </label>
  );
}

interface TekstveldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Tekstveld({ label, id, ...rest }: TekstveldProps) {
  const veldId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="invoerveld" htmlFor={veldId}>
      {label ? <span className="invoerveld-label">{label}</span> : null}
      <textarea id={veldId} className="invoerveld-input invoerveld-textarea" rows={3} {...rest} />
    </label>
  );
}
