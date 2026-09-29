import { haalInstelling, zetInstelling } from "../db/db";

const SLEUTEL = "vergrendel_minuten";

export const VERGRENDEL_OPTIES = [1, 5, 15, 30] as const;
export const STANDAARD_VERGRENDEL_MINUTEN = 5;

/** Na hoeveel minuten zonder activiteit de app zichzelf vergrendelt (per apparaat). */
export async function haalVergrendelMinuten(): Promise<number> {
  const waarde = Number(await haalInstelling(SLEUTEL));
  return (VERGRENDEL_OPTIES as readonly number[]).includes(waarde) ? waarde : STANDAARD_VERGRENDEL_MINUTEN;
}

export async function zetVergrendelMinuten(minuten: number): Promise<void> {
  await zetInstelling(SLEUTEL, String(minuten));
}
