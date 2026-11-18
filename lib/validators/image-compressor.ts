// Client-side compression helper (sharp is server-only)
export async function compressImage(file: File, maxKB = 150): Promise<Blob> {
  return file; // placeholder — implement with canvas in the browser
}
