"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-storage";

import type { ApiResponse, LandlordRentalCandidate, LandlordRoom } from "./landlord-room-types";

function responseMessage(payload: ApiResponse<unknown>) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(payload.errors)[0];
    if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
    if (firstValue) return String(firstValue);
  }
  return payload.message || "Không thể xử lý yêu cầu lúc này.";
}

export function useLandlordRental(onConfirmed: () => Promise<void>) {
  const { toast } = useToast();
  const [room, setRoom] = useState<LandlordRoom | null>(null);
  const [candidates, setCandidates] = useState<LandlordRentalCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const dialogRef = useFocusTrap<HTMLDivElement>(Boolean(room));

  const reset = useCallback(() => {
    loadRequestIdRef.current += 1;
    setRoom(null);
    setCandidates([]);
    setSelectedCandidateId(null);
    setError("");
    setIsLoading(false);
  }, []);

  function close() {
    if (!isSubmittingRef.current) reset();
  }

  useEffect(() => {
    if (!room) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmittingRef.current) reset();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reset, room]);

  async function open(nextRoom: LandlordRoom) {
    const requestId = ++loadRequestIdRef.current;
    setRoom(nextRoom);
    setCandidates([]);
    setSelectedCandidateId(null);
    setError("");
    setIsLoading(true);
    try {
      const response = await authFetch(`/api/landlord/rooms/${nextRoom.id}/rental-candidates`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<LandlordRentalCandidate[]> | null;
      if (requestId !== loadRequestIdRef.current) return;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload ? responseMessage(payload) : "Không thể tải danh sách khách quan tâm.");
      }
      setCandidates(payload.data);
      setSelectedCandidateId(payload.data.find((candidate) => candidate.can_confirm_rental)?.id ?? null);
    } catch (caughtError) {
      if (requestId === loadRequestIdRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Không thể tải danh sách khách quan tâm.");
      }
    } finally {
      if (requestId === loadRequestIdRef.current) setIsLoading(false);
    }
  }

  async function confirm() {
    if (!room || !selectedCandidateId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await authFetch(`/api/landlord/rooms/${room.id}/confirm-rental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewing_request_id: selectedCandidateId }),
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<LandlordRoom> | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload ? responseMessage(payload) : "Không thể xác nhận khách thuê.");
      }
      const roomCode = room.room_code;
      reset();
      toast({
        type: "success",
        title: "Đã xác nhận khách thuê",
        message: `Phòng ${roomCode} đã chuyển sang trạng thái Đã thuê và được gỡ khỏi danh sách công khai.`,
      });
      await onConfirmed();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể xác nhận khách thuê.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    candidates,
    close,
    confirm,
    dialogRef,
    error,
    isLoading,
    isSubmitting,
    open,
    room,
    selectedCandidateId,
    setSelectedCandidateId,
  };
}
