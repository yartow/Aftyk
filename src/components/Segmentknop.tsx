import "./Segmentknop.css";

interface Optie<T extends string> {
  waarde: T;
  label: string;
}

interface SegmentknopProps<T extends string> {
  label?: string;
  opties: Optie<T>[];
  waarde: T | null;
  onWijzig: (waarde: T | null) => void;
  /** Nogmaals tikken op de gekozen optie maakt de keuze weer leeg. */
  leegmaken?: boolean;
}

/** Ja/Nee, V/O, Goed/Matig/Slecht: grote knoppen naast elkaar, gekozen optie met ✓ (niet alleen kleur). */
export function Segmentknop<T extends string>({ label, opties, waarde, onWijzig, leegmaken = true }: SegmentknopProps<T>) {
  return (
    <div className="segment-groep" role="radiogroup" aria-label={label}>
      {label ? <span className="invoerveld-label">{label}</span> : null}
      <div className="segment">
        {opties.map((optie) => {
          const gekozen = optie.waarde === waarde;
          return (
            <button
              key={optie.waarde}
              type="button"
              role="radio"
              aria-checked={gekozen}
              className={`segment-knop ${gekozen ? "segment-knop--gekozen" : ""}`}
              onClick={() => onWijzig(gekozen && leegmaken ? null : optie.waarde)}
            >
              {gekozen ? "✓ " : ""}
              {optie.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
