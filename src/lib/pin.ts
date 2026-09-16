import bcrypt from "bcryptjs";
import { haalInstelling, zetInstelling } from "../db/db";

/**
 * De pincode is uitsluitend een lokaal gemak-slot tegen "iemand pakt de
 * tablet op en tikt raak" — géén beveiligingsgrens. Hij wordt gehasht
 * opgeslagen en volledig lokaal gecontroleerd, zodat het zonder internet
 * werkt. Het echte wachtwoord (Supabase-account) beveiligt het archief op
 * het bureaubladscherm.
 */
const SLEUTEL_HASH = "pincode_hash";
const SLEUTEL_INGESCHAKELD = "pincode_ingeschakeld";

export async function pincodeIsIngeschakeld(): Promise<boolean> {
  const waarde = await haalInstelling(SLEUTEL_INGESCHAKELD);
  return waarde === "true";
}

export async function zetPincode(nieuwePincode: string): Promise<void> {
  const hash = await bcrypt.hash(nieuwePincode, 10);
  await zetInstelling(SLEUTEL_HASH, hash);
  await zetInstelling(SLEUTEL_INGESCHAKELD, "true");
}

export async function schakelPincodeUit(): Promise<void> {
  await zetInstelling(SLEUTEL_INGESCHAKELD, "false");
}

export async function controleerPincode(ingevoerd: string): Promise<boolean> {
  const hash = await haalInstelling(SLEUTEL_HASH);
  if (!hash) return false;
  return bcrypt.compare(ingevoerd, hash);
}
