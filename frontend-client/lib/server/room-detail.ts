import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { AVAILABILITY_REVALIDATE_SECONDS, getRoomDetail } from "@/lib/api";

const getRevalidatedRoomDetail = unstable_cache(
  async (slug: string) => getRoomDetail(slug),
  ["public-room-detail"],
  {
    revalidate: AVAILABILITY_REVALIDATE_SECONDS,
    tags: ["public-room-detail"],
  },
);

export const getCachedRoomDetail = cache(getRevalidatedRoomDetail);
