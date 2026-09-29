import { useEffect, useState } from "react";
import { MAX_POGINGEN, haalPogingen } from "./pogingen";

/**
 * Resterende wachtwoordpogingen (null = nog geen enkele mislukt). Begint bij het
 * opgeslagen aantal, zodat de waarschuwing en de blokkade ook na herladen blijven staan.
 */
export function useWachtwoordPogingen() {
  const [over, setOver] = useState<number | null>(null);
  useEffect(() => {
    void haalPogingen("wachtwoord").then((n) => setOver(n > 0 ? MAX_POGINGEN.wachtwoord - n : null));
  }, []);
  return { over, geblokkeerd: over !== null && over <= 0, zetOver: setOver };
}
