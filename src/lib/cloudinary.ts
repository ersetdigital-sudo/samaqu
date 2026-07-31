const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dgtixuop0";
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "samaqu_unsigned";

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const isVideo = file.type.startsWith("video/");
  const endpoint = isVideo ? "video" : "image";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${endpoint}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload gagal");
  const data = await res.json();
  return data.secure_url;
}
