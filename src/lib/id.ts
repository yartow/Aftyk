import { v4 as uuidv4 } from "uuid";

/** Client-gegenereerde UUID's — dit zijn ook de sync-sleutels richting Supabase. */
export function nieuweId(): string {
  return uuidv4();
}
