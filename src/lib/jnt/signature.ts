import { createHash } from "crypto";

/**
 * Generate J&T signature: base64(md5(data + key))
 * Used by Tariff Check and Create Order APIs.
 */
export function generateSignature(data: string, key: string): string {
  return Buffer.from(createHash("md5").update(data + key).digest()).toString("base64");
}
