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

export function cleanRoomTitle(value?: string | null, properNouns: Array<string | null | undefined> = []) {
  const title = (value || "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return "Phòng cho thuê";

  const letters = title.match(/\p{L}/gu)?.join("") || "";
  if (!letters || letters !== letters.toLocaleUpperCase("vi-VN")) return title;

  const sentenceCase = title.toLocaleLowerCase("vi-VN");
  let result = `${sentenceCase.charAt(0).toLocaleUpperCase("vi-VN")}${sentenceCase.slice(1)}`.replace(
    /\b(ccmn|ccdv|wifi)\b/gi,
    (acronym) => acronym.toUpperCase(),
  );
  for (const properNoun of properNouns.filter((item): item is string => Boolean(item))) {
    const escaped = properNoun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "giu"), properNoun);
  }
  return result;
}
