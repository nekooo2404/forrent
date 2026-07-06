export const SITE_NAME = "ForRent";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://forrent.io.vn";
export const SITE_DESCRIPTION =
  "ForRent giúp người thuê tìm phòng theo tháng tại Hà Nội, lọc theo khu vực, giá, diện tích, tiện ích và đặt lịch xem trực tiếp.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function shortDescription(value?: string | null, fallback = SITE_DESCRIPTION, maxLength = 160) {
  const text = (value || fallback).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}
