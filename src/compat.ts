// Small fallbacks so older Safari (iOS/macOS 13–15) can run the game.
// Imported first from main.ts so it runs before any other module.
const g = globalThis as unknown as Record<string, unknown>;

if (!Array.prototype.at)
  Object.defineProperty(Array.prototype, "at", {
    value(this: unknown[], index: number) {
      const i = Math.trunc(index) || 0;
      return this[i < 0 ? this.length + i : i];
    },
    writable: true,
    configurable: true,
  });

if (!Object.hasOwn)
  Object.defineProperty(Object, "hasOwn", {
    value: (o: object, key: PropertyKey) =>
      Object.prototype.hasOwnProperty.call(o, key),
    writable: true,
    configurable: true,
  });

if (!String.prototype.replaceAll)
  Object.defineProperty(String.prototype, "replaceAll", {
    value(this: string, search: string | RegExp, replacement: string) {
      return typeof search === "string"
        ? this.split(search).join(replacement)
        : this.replace(search, replacement);
    },
    writable: true,
    configurable: true,
  });

// Game state is plain JSON, so a JSON round trip is an exact clone.
if (typeof g.structuredClone !== "function")
  g.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

if (typeof crypto !== "undefined" && !crypto.randomUUID)
  Object.defineProperty(crypto, "randomUUID", {
    value: () =>
      "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
          Number(c) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
        ).toString(16),
      ),
    configurable: true,
  });

export {};
