// exifr ships type declarations only for its root "exifr" (full) entry point,
// not for the lighter prebuilt bundles under exifr/dist/*. This is a minimal
// shape covering the one function this project calls from that bundle.
declare module "exifr/dist/lite.esm.mjs" {
  export function parse(
    data: File | Blob,
    options?: { pick?: string[]; reviveValues?: boolean },
  ): Promise<Record<string, string> | undefined>;
}
