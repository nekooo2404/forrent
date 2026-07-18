const cloudinaryUploadPath = "/image/upload/";
const cloudinaryVideoUploadPath = "/video/upload/";

export const ROOM_IMAGE_BLUR_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='6'%3E%3Crect width='8' height='6' fill='%23eee9e4'/%3E%3C/svg%3E";

export function isCloudinaryImage(src: string) {
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

function cloudinaryVideoUrl(src: string, transformation: string, extension: string) {
  try {
    const url = new URL(src);
    if (url.hostname !== "res.cloudinary.com" || !url.pathname.includes(cloudinaryVideoUploadPath)) return src;
    const [prefix, videoPath] = url.pathname.split(cloudinaryVideoUploadPath);
    const pathWithoutExtension = videoPath.replace(/\.[a-z0-9]+$/i, "");
    url.pathname = `${prefix}${cloudinaryVideoUploadPath}${transformation}/${pathWithoutExtension}.${extension}`;
    return url.toString();
  } catch {
    return src;
  }
}

export function fastVideoUrl(src: string) {
  return cloudinaryVideoUrl(src, "f_mp4,q_auto:eco", "mp4");
}

export function videoPosterUrl(src: string, width = 768) {
  const poster = cloudinaryVideoUrl(src, `so_0,f_jpg,q_auto:eco,c_limit,w_${width}`, "jpg");
  return poster === src ? undefined : poster;
}
