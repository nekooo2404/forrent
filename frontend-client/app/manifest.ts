import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ForRent",
    short_name: "ForRent",
    description: "Tìm phòng thuê theo tháng tại Hà Nội, rõ giá, cọc, phí và lịch xem.",
    start_url: "/homepage",
    display: "standalone",
    background_color: "#f7f3ef",
    theme_color: "#7c3f18",
    lang: "vi",
    icons: [
      {
        src: "/brand/forrent-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/forrent-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
