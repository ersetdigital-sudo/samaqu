// Shared utility: get the best product thumbnail image
// Skips videos, returns first actual image URL

/**
 * Get the best thumbnail URL for a product.
 * Priority: first non-video image from media array → product.image (if not video) → empty string
 */
export function getProductThumbnail(product: { image?: string; media?: Array<{ src: string; type: string }> }): string {
  // If media array available, find first non-video image
  if (product.media && product.media.length > 0) {
    const firstImage = product.media.find((m) => m.type === "image" && m.src);
    if (firstImage) return firstImage.src;
  }

  // Fallback: use product.image if it's not a video
  if (product.image && !isVideoUrl(product.image)) {
    return product.image;
  }

  return "";
}

/**
 * Check if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
}

/**
 * Get thumbnail for a product fetched from DB (without media array).
 * Uses product_images table data passed as parameter.
 */
export function getThumbnailFromImages(
  productId: string,
  productImage: string | undefined,
  allImages: Array<{ product_id: string; url: string; is_video: boolean }>
): string {
  // Find first non-video image for this product
  const firstImage = allImages.find((img) => img.product_id === productId && !img.is_video);
  if (firstImage) return firstImage.url;

  // Fallback: use product.image if not video
  if (productImage && !isVideoUrl(productImage)) {
    return productImage;
  }

  return "";
}
