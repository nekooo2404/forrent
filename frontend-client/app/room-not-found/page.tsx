import type { Metadata } from "next";

export { default } from "../rooms/[slug]/not-found";

export const metadata: Metadata = {
  title: "Không tìm thấy phòng",
  robots: { follow: false, index: false },
};
