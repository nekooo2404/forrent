import "server-only";

import { cache } from "react";

import { getRoomDetail } from "@/lib/api";

// Django caches the serialized public detail in Redis. React cache only
// deduplicates generateMetadata and page rendering within the same request,
// avoiding Next Data Cache locks on this dynamic, nonce-bearing route.
export const getCachedRoomDetail = cache(getRoomDetail);
