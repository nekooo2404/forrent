import type { ImageProps } from "next/image";

const cloudinaryUploadPath = "/image/upload/";

export const warmImageBlurDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%232f2018'/%3E%3C/svg%3E";

function isCloudinaryImage(src: string) {
  try {
    const url = new URL(src);
    return url.hostname === "res.cloudinary.com" && url.pathname.includes(cloudinaryUploadPath);
  } catch {
    return false;
  }
}

function cloudinaryUrl(src: string, width: number, quality?: number) {
  const url = new URL(src);
  const [prefix, imagePath] = url.pathname.split(cloudinaryUploadPath);
  const q = quality && quality >= 80 ? "q_auto:good" : "q_auto:eco";

  url.pathname = `${prefix}${cloudinaryUploadPath}f_auto,fl_progressive,${q},c_limit,w_${width}/${imagePath}`;
  return url.toString();
}

export function fastImageUrl(src: string, width = 1200, quality = 78) {
  return isCloudinaryImage(src) ? cloudinaryUrl(src, width, quality) : src;
}

export function fastImageProps(): Pick<ImageProps, "placeholder" | "blurDataURL"> {
  return {
    placeholder: "blur",
    blurDataURL: warmImageBlurDataUrl,
  };
}
