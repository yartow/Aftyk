/**
 * Demo-modus zit in sessionStorage (dus: sluit de app, dan eindigt de demo).
 * Deze module importeert bewust niets, zodat db.ts en supabase.ts hem al bij
 * het laden kunnen gebruiken — de keuze "echte database of demo-database"
 * wordt één keer per paginalading gemaakt. Aan- en uitzetten gaat daarom
 * altijd samen met een herlaadbeurt (zie lib/demo.ts).
 */
const SLEUTEL = "modus";

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(SLEUTEL) === "demo";
  } catch {
    return false;
  }
}

export function zetDemoVlag(aan: boolean): void {
  try {
    if (aan) sessionStorage.setItem(SLEUTEL, "demo");
    else sessionStorage.removeItem(SLEUTEL);
  } catch {
    /* geen sessionStorage beschikbaar */
  }
}

export const DB_NAAM_ECHT = "hygienecode";
export const DB_NAAM_DEMO = "hygienecode-demo";
