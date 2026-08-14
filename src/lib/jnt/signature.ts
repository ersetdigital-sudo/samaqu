import { createHash } from "crypto";

/**
 * Generate J&T signature: base64(md5(data + key))
 * PHP md5() returns hex string, then base64_encode() encodes that hex string.
 * So: base64( hex(md5(data + key)) )
 */
export function generateSignature(data: string, key: string): string {
  const hexHash = createHash("md5").update(data + key).digest("hex");
  return Buffer.from(hexHash).toString("base64");
}
