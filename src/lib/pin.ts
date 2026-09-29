import bcrypt from "bcryptjs";
import { haalInstelling, zetInstelling } from "../db/db";

/**
 * De pincode is verplicht en geldt per apparaat (dezelfde gebruiker kan op
 * elke telefoon een andere pincode hebben). Hij is uitsluitend een lokaal gemak-slot tegen "iemand pakt de
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

/** Vergeten pincode: wissen, zodat de gebruiker (na inloggen met het wachtwoord) een nieuwe kiest. */
export async function wisPincode(): Promise<void> {
  await zetInstelling(SLEUTEL_HASH, "");
  await zetInstelling(SLEUTEL_INGESCHAKELD, "false");
}

export async function controleerPincode(ingevoerd: string): Promise<boolean> {
  const hash = await haalInstelling(SLEUTEL_HASH);
  if (!hash) return false;
  return bcrypt.compare(ingevoerd, hash);
}
