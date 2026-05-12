// Cloudinary unsigned browser upload helper.
export const CLOUDINARY_CLOUD_NAME = "dier88erd";
export const CLOUDINARY_UPLOAD_PRESET = "ust_unsigned";

export async function uploadToCloudinary(
  file: File,
  opts: { folder?: string } = {}
): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const resourceType = isImage ? "image" : "auto";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (opts.folder) fd.append("folder", opts.folder);

  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { secure_url?: string; url?: string };
  const link = data.secure_url || data.url;
  if (!link) throw new Error("Cloudinary response missing secure_url");
  return link;
}
