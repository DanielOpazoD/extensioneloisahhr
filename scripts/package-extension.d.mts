export const extensionDirectory: string;
export function packageRayenExtension(root: string): {
  zip: Uint8Array;
  fileName: string;
  version: string;
  buildId: string;
};
