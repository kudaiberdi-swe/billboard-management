// Deterministic value in [0, 1) from string parts (FNV-1a 32-bit). No Math.random anywhere in the demo data.
export function hash01(...parts: string[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  // final avalanche so close inputs spread out
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 0x1_0000_0000;
}
