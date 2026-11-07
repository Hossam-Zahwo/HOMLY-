/**
 * The app bundles client and server entrypoints through Vite.
 * Its lockfile intentionally does not include @types/node, so the small
 * server-only Node surface used by Cloudinary is declared explicitly.
 * Runtime implementations are provided by Node (not this declaration).
 */
declare const process: {
  readonly env: Record<string, string | undefined>;
};

declare module 'node:crypto' {
  export function createHash(algorithm: 'sha1'): {
    update(data: string): {
      digest(encoding: 'hex'): string;
    };
  };
}
