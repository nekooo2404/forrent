export const SITE_NAME = "ForRent";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://forrent.io.vn";
export const SITE_TITLE = "ForRent - Tìm CCMN, CHDV giá tốt tại Hà Nội";
export const SITE_DESCRIPTION =
  "Tìm chung cư mini (CCMN), căn hộ dịch vụ (CHDV) giá tốt tại Hà Nội, minh bạch giá thuê, tiền cọc, chi phí và lịch xem phòng.";
export const SOCIAL_PREVIEW_IMAGE = {
  url: "/brand/forrent-social-preview.jpg",
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
};

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function shortDescription(value?: string | null, fallback = SITE_DESCRIPTION, maxLength = 160) {
  const text = (value || fallback).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function expandRoomTypeAcronyms(value: string) {
  return value
    .replace(/\bccmn\b/giu, (_match, offset: number) => (offset === 0 ? "Chung cư mini" : "chung cư mini"))
    .replace(/\bccdv\b/giu, (_match, offset: number) => (offset === 0 ? "Căn hộ dịch vụ" : "căn hộ dịch vụ"));
}

export function cleanRoomTitle(
  value?: string | null,
  properNouns: Array<string | null | undefined> = [],
  fallback = "Phòng cho thuê",
) {
  const title = (value || "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu, " ")
    .replace(
      /^(?:mã\s+phòng\s*)?(?:\[[^\]]+\]|\(?[a-z]\d+(?:[.\-]\d+)?\)?(?:\s*[,/&+]\s*\(?[a-z]\d+(?:[.\-]\d+)?\)?)*)\s*(?:[-–—|:]\s*|(?=\p{L}))/iu,
      "",
    )
    .replace(/^(?:(?:khai\s+trương|mới\s+lên\s+sàn|siêu\s+phẩm)\s*)+/iu, "")
    .replace(/\s*(?:[-–—|•]\s*)?(?:còn\s+trống|trống|đã\s+thuê|hết\s+phòng)\s*$/iu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title || /^(?:phòng\s*)?[a-z]?\d+[a-z]?(?:\s*[,/&+-]\s*[a-z]?\d+[a-z]?)*$/iu.test(title)) {
    return fallback;
  }

  const letters = title.match(/\p{L}/gu)?.join("") || "";
  if (!letters || letters !== letters.toLocaleUpperCase("vi-VN")) return expandRoomTypeAcronyms(title);

  const sentenceCase = title.toLocaleLowerCase("vi-VN");
  let result = `${sentenceCase.charAt(0).toLocaleUpperCase("vi-VN")}${sentenceCase.slice(1)}`.replace(
    /\b(ccmn|ccdv|wifi)\b/gi,
    (acronym) => acronym.toUpperCase(),
  );
  for (const properNoun of properNouns.filter((item): item is string => Boolean(item))) {
    const escaped = properNoun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "giu"), properNoun);
  }
  return expandRoomTypeAcronyms(result);
}
