"use client";

/* eslint-disable @next/next/no-img-element -- Local blob previews and Cloudinary URLs should not pass through a second optimizer. */

import { ArrowDown, ArrowUp, ImageIcon, LoaderCircle, Video, X } from "@/components/ui/icons";
import { useState } from "react";

import type { ApiRoomImage } from "@/lib/api";

import type { LandlordMediaLabel, LandlordSelectedMedia } from "./landlord-room-types";

export const mediaLabelOptions: Array<{ value: LandlordMediaLabel; label: string }> = [
  { value: "OVERVIEW", label: "Toàn cảnh" },
  { value: "SLEEPING_AREA", label: "Khu ngủ" },
  { value: "KITCHEN", label: "Bếp" },
  { value: "BATHROOM", label: "Nhà tắm" },
  { value: "BALCONY", label: "Ban công" },
  { value: "VIDEO_TOUR", label: "Video" },
  { value: "OTHER", label: "Khác" },
];

const labelMap = new Map(mediaLabelOptions.map((option) => [option.value, option.label]));

function labelsForMediaType(mediaType: "IMAGE" | "VIDEO") {
  return mediaLabelOptions.filter((option) => (
    mediaType === "VIDEO"
      ? ["VIDEO_TOUR", "OTHER"].includes(option.value)
      : option.value !== "VIDEO_TOUR"
  ));
}

type LandlordMediaManagerProps = {
  existingImages: ApiRoomImage[];
  isSaving: boolean;
  onExistingChange: (image: ApiRoomImage, updates: Partial<Pick<ApiRoomImage, "label" | "sort_order">>) => void;
  onExistingDelete: (image: ApiRoomImage) => void;
  onFilesChange: (files: LandlordSelectedMedia[]) => void;
  selectedFiles: LandlordSelectedMedia[];
  uploadError?: string;
};

export function LandlordMediaManager({
  existingImages,
  isSaving,
  onExistingChange,
  onExistingDelete,
  onFilesChange,
  selectedFiles,
  uploadError,
}: Readonly<LandlordMediaManagerProps>) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState("");
  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    let hasCover = existingImages.some((item) => item.label === "OVERVIEW") || selectedFiles.some((item) => item.label === "OVERVIEW");
    const availableSlots = Math.max(0, 12 - existingImages.length - selectedFiles.length);
    setCapacityError(fileList.length > availableSlots ? `Chỉ có thể thêm ${availableSlots} media nữa (tối đa 12 mục mỗi phòng).` : "");
    const nextFiles = Array.from(fileList).slice(0, availableSlots).map((file) => {
      let label: LandlordMediaLabel = file.type.startsWith("video/") ? "VIDEO_TOUR" : "OTHER";
      if (!hasCover && file.type.startsWith("image/")) {
        label = "OVERVIEW";
        hasCover = true;
      }
      return { key: crypto.randomUUID(), file, label, previewUrl: URL.createObjectURL(file), uploadState: "ready" as const };
    });
    onFilesChange([...selectedFiles, ...nextFiles]);
  }

  function moveSelected(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= selectedFiles.length) return;
    const next = [...selectedFiles];
    [next[index], next[target]] = [next[target], next[index]];
    onFilesChange(next);
  }

  function setSelectedLabel(key: string, label: LandlordMediaLabel) {
    onFilesChange(selectedFiles.map((item) => item.key === key ? { ...item, label } : label === "OVERVIEW" ? { ...item, label: "OTHER" } : item));
  }

  function setCover(image: ApiRoomImage) {
    if (image.media_type !== "IMAGE") return;
    onExistingChange(image, { label: "OVERVIEW" });
  }

  function dropSelected(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const fromIndex = selectedFiles.findIndex((item) => item.key === dragKey);
    const toIndex = selectedFiles.findIndex((item) => item.key === targetKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...selectedFiles];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onFilesChange(next);
    setDragKey(null);
  }

  return (
    <fieldset className="border-t border-outline-variant/70 pt-5">
      <legend className="text-base font-semibold text-on-surface">4. Ảnh và video</legend>
      <p className="mt-1 text-sm leading-6 text-on-surface-variant">Chọn ảnh đại diện, gắn nhãn theo không gian và sắp xếp thứ tự trước khi lưu.</p>
      <label className="mt-4 block" htmlFor="landlord-room-media">
        <span className="mb-2 block text-sm font-semibold text-on-surface">Thêm media</span>
        <input
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          className="block min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-sm text-on-surface file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-primary"
          id="landlord-room-media"
          multiple
          onChange={(event) => addFiles(event.target.files)}
          type="file"
        />
        <span className="mt-2 block text-xs text-on-surface-variant">Tối đa 12 mục, tổng dung lượng upload mới không quá 50MB. Tệp được lưu tạm trên màn hình này, không lưu vào bộ nhớ trình duyệt.</span>
      </label>
      {uploadError ? <p className="mt-3 rounded-md border border-error/30 bg-error-container p-3 text-sm text-on-error-container" role="alert">{uploadError}</p> : null}
      {capacityError ? <p className="mt-3 rounded-md border border-warning/30 bg-warning-container p-3 text-sm text-on-warning-container" role="alert">{capacityError}</p> : null}

      {existingImages.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-on-surface">Media đã có</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {existingImages.map((image, index) => (
              <article className="overflow-hidden rounded-md border border-outline-variant/70 bg-surface-container-low" key={image.id}>
                <MediaPreview image={image} />
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-on-surface">{labelMap.get(image.label) ?? "Khác"}</span>
                    {image.label === "OVERVIEW" ? <span className="rounded bg-primary-container px-2 py-1 text-[11px] font-semibold text-on-primary-container">{selectedFiles.some((item) => item.label === "OVERVIEW") ? "Ảnh bìa hiện tại" : "Ảnh bìa"}</span> : null}
                  </div>
                  <label className="sr-only" htmlFor={`media-label-${image.id}`}>Nhãn media {index + 1}</label>
                  <select className="min-h-10 w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-2 text-sm text-on-surface" id={`media-label-${image.id}`} onChange={(event) => onExistingChange(image, { label: event.target.value as LandlordMediaLabel })} value={image.label || "OTHER"}>
                    {labelsForMediaType(image.media_type).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <div className="flex items-center justify-between gap-2">
                    <button aria-label={`Đặt media ${index + 1} làm ảnh bìa`} className="min-h-10 flex-1 rounded-md border border-outline-variant/70 px-2 text-xs font-semibold text-on-surface disabled:opacity-50" disabled={image.media_type !== "IMAGE" || image.label === "OVERVIEW" || isSaving} onClick={() => setCover(image)} type="button">Đặt ảnh bìa</button>
                    <button aria-label={`Đưa media ${index + 1} lên trước`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-outline-variant/70 text-on-surface disabled:opacity-50" disabled={index === 0 || isSaving} onClick={() => onExistingChange(image, { sort_order: existingImages[index - 1].sort_order })} type="button"><ArrowUp size={16} /></button>
                    <button aria-label={`Đưa media ${index + 1} xuống sau`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-outline-variant/70 text-on-surface disabled:opacity-50" disabled={index === existingImages.length - 1 || isSaving} onClick={() => onExistingChange(image, { sort_order: existingImages[index + 1].sort_order })} type="button"><ArrowDown size={16} /></button>
                    <button aria-label={`Xóa media ${index + 1}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-error/30 text-error disabled:opacity-50" disabled={isSaving} onClick={() => onExistingDelete(image)} type="button"><X size={16} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {selectedFiles.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-on-surface">Media sẽ upload</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedFiles.map((item, index) => (
              <article className="overflow-hidden rounded-md border border-outline-variant/70 bg-surface-container-low" draggable={!isSaving} key={item.key} onDragEnd={() => setDragKey(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDragKey(item.key)} onDrop={() => dropSelected(item.key)}>
                <div className="relative aspect-[4/3] bg-surface-container-high">
                  {item.file.type.startsWith("video/") ? <video className="h-full w-full object-cover" muted preload="metadata" src={item.previewUrl} /> : <img alt={`Xem trước ${item.file.name}`} className="h-full w-full object-cover" decoding="async" src={item.previewUrl} />}
                  {item.uploadState === "uploading" ? <span className="absolute inset-0 flex items-center justify-center bg-inverse-surface/50 text-on-inverse-surface"><LoaderCircle className="animate-spin" size={24} /></span> : null}
                  {item.uploadState === "complete" ? <span className="absolute left-2 top-2 rounded bg-success-container px-2 py-1 text-xs font-semibold text-on-surface">Đã tải</span> : null}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-xs text-on-surface-variant" title={item.file.name}>{item.file.name}</p>
                  <select aria-label={`Nhãn file ${index + 1}`} className="min-h-10 w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-2 text-sm text-on-surface" disabled={isSaving} onChange={(event) => setSelectedLabel(item.key, event.target.value as LandlordMediaLabel)} value={item.label}>
                    {labelsForMediaType(item.file.type.startsWith("video/") ? "VIDEO" : "IMAGE").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-on-surface-variant">{item.label === "OVERVIEW" ? (existingImages.some((image) => image.label === "OVERVIEW") ? "Sẽ thay ảnh bìa" : "Ảnh bìa") : labelMap.get(item.label)}</span>
                    <div className="flex gap-1">
                      <button aria-label={`Đưa file ${index + 1} lên trước`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-outline-variant/70 text-on-surface disabled:opacity-50" disabled={index === 0 || isSaving} onClick={() => moveSelected(index, -1)} type="button"><ArrowUp size={16} /></button>
                      <button aria-label={`Đưa file ${index + 1} xuống sau`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-outline-variant/70 text-on-surface disabled:opacity-50" disabled={index === selectedFiles.length - 1 || isSaving} onClick={() => moveSelected(index, 1)} type="button"><ArrowDown size={16} /></button>
                      <button aria-label={`Bỏ file ${index + 1}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-error/30 text-error disabled:opacity-50" disabled={isSaving} onClick={() => { URL.revokeObjectURL(item.previewUrl); onFilesChange(selectedFiles.filter((file) => file.key !== item.key)); }} type="button"><X size={16} /></button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

function MediaPreview({ image }: Readonly<{ image: ApiRoomImage }>) {
  return <div className="relative aspect-[4/3] bg-surface-container-high">{image.media_type === "VIDEO" ? <><video className="h-full w-full object-cover" muted preload="metadata" src={image.image_url || image.image || undefined} /><span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-inverse-surface/75 px-2 py-1 text-xs font-semibold text-on-inverse-surface"><Video size={14} /> Video</span></> : image.image_url || image.image ? <img alt={labelMap.get(image.label) || "Ảnh phòng"} className="h-full w-full object-cover" decoding="async" src={image.image_url || image.image || undefined} /> : <span className="flex h-full items-center justify-center text-on-surface-variant"><ImageIcon size={24} /></span>}</div>;
}
