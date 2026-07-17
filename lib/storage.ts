// Server-only Vercel Blob storage helpers.
// Import from Server Components, Server Actions, or route handlers — never from
// client components. Reads BLOB_READ_WRITE_TOKEN from the environment (injected
// automatically on Vercel when a Blob store is connected).

import { del, put } from "@vercel/blob";

export type UploadOptions = {
  /** MIME type — e.g. "image/png", "application/pdf". */
  contentType?: string;
};

/**
 * Upload a file to Vercel Blob with public access.
 * @param data Buffer or Uint8Array of the file contents.
 * @param pathname Blob key, e.g. "workspaces/abc/projects/xyz/files/<uuid>-name.pdf".
 * @returns The full public Blob URL (persist this — it's what downloads and
 *   deletes both operate on).
 */
export async function uploadFile(
  data: Buffer | Uint8Array,
  pathname: string,
  options: UploadOptions = {},
): Promise<string> {
  const blob = await put(pathname, Buffer.from(data), {
    access: "public",
    contentType: options.contentType,
    // The caller's pathname already carries a randomUUID(), so keep the key
    // exactly as given rather than appending another random suffix.
    addRandomSuffix: false,
  });
  return blob.url;
}

/**
 * Delete a blob. Accepts the public Blob URL (what we persist) or a pathname.
 * No-op-safe: `del` does not throw if the blob is already gone.
 */
export async function deleteFile(urlOrPathname: string): Promise<void> {
  await del(urlOrPathname);
}
