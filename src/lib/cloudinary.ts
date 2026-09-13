export interface CloudinaryConfig {
  cloud: string;
  preset: string;
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;
  if (!cloud || !preset) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Set NEXT_PUBLIC_CLOUDINARY_CLOUD dan NEXT_PUBLIC_CLOUDINARY_PRESET."
    );
  }
  return { cloud, preset };
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const { cloud, preset } = getCloudinaryConfig();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  const isVideo = file.type.startsWith("video/");
  const endpoint = isVideo ? "video" : "image";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${endpoint}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload gagal");
  const data = await res.json();
  return data.secure_url;
}
