import type { Metadata } from "next";

import { LandlordRoomManager } from "@/components/landlord/landlord-room-manager";

export const metadata: Metadata = {
  title: "Quản lý phòng cho thuê - ForRent",
  description: "Khu vực dành cho người cho thuê nhỏ lẻ tạo, đăng và quản lý phòng trực tiếp trên ForRent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LandlordRoomsPage() {
  return <LandlordRoomManager />;
}
