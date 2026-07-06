import type { ImageLoaderProps, ImageProps } from "next/image";

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

function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  const [prefix, imagePath] = url.pathname.split(cloudinaryUploadPath);
  const q = quality && quality >= 80 ? "q_auto:good" : "q_auto:eco";

  url.pathname = `${prefix}${cloudinaryUploadPath}f_auto,${q},c_limit,w_${width}/${imagePath}`;
  return url.toString();
}

export function fastImageProps(src: string): Pick<ImageProps, "loader" | "placeholder" | "blurDataURL"> {
  return {
    ...(isCloudinaryImage(src) ? { loader: cloudinaryLoader } : {}),
    placeholder: "blur",
    blurDataURL: warmImageBlurDataUrl,
  };
}
