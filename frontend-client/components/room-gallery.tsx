"use client";

import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { fastImageUrl } from "@/lib/image";

type RoomGalleryProps = Readonly<{
  images: string[];
  title: string;
}>;

export function RoomGallery({ images, title }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const modalRef = useFocusTrap<HTMLDivElement>(activeIndex !== null);
  const visibleImages = images.slice(0, 4);

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((current) => previousIndex(current, images.length));
      if (event.key === "ArrowRight") setActiveIndex((current) => nextIndex(current, images.length));
    };

    document.body.classList.add("gallery-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("gallery-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, images.length]);

  useEffect(() => {
    if (activeIndex === null || images.length < 2) return;

    preloadGalleryImage(images[previousIndex(activeIndex, images.length) ?? 0]);
    preloadGalleryImage(images[nextIndex(activeIndex, images.length) ?? 0]);
  }, [activeIndex, images]);

  return (
    <>
      <section
        aria-label="Ảnh phòng"
        className={`relative mb-6 h-[320px] overflow-hidden rounded-lg md:h-[440px] ${galleryGridClass(images.length)}`}
        data-image-count={images.length}
      >
        {visibleImages.length ? (
          visibleImages.map((src, index) => (
            <GalleryTile
              alt={`${title} - ${index === 0 ? "ảnh chính" : `ảnh ${index + 1}`}`}
              badge={index === visibleImages.length - 1 && images.length > 1 ? `${images.length} ảnh` : undefined}
              className={galleryTileClass(images.length, index)}
              key={`${src}-${index}`}
              onClick={() => setActiveIndex(index)}
              priority={index === 0}
              src={src}
            />
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-container-low px-6 text-center text-on-surface-variant">
            <ImageOff aria-hidden="true" size={36} strokeWidth={1.6} />
            <div>
              <p className="font-semibold text-on-surface">Ảnh phòng đang được cập nhật</p>
              <p className="mt-1 text-sm">Nhân viên tư vấn sẽ xác nhận hình ảnh và tình trạng phòng trước lịch xem.</p>
            </div>
          </div>
        )}
        {images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-md border border-outline-variant/30 bg-surface-container-high/90 px-3 py-1 text-sm font-semibold text-on-surface shadow-soft md:hidden">
            {images.length} ảnh
          </span>
        ) : null}
      </section>

      {activeImage ? (
        <div aria-modal="true" className="fixed inset-0 z-[100] bg-surface-dim/95 p-4 text-on-surface" ref={modalRef} role="dialog">
          <button
            aria-label="Đóng xem ảnh"
            className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] rounded-full border border-outline-variant/30 bg-surface-container-high/80 p-3 transition hover:bg-surface-container-highest"
            onClick={() => setActiveIndex(null)}
            type="button"
          >
            <X size={22} strokeWidth={1.8} />
          </button>

          {images.length > 1 ? (
            <button
              aria-label="Ảnh trước"
              className="absolute left-4 top-1/2 z-10 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 p-3 transition hover:bg-surface-container-highest"
              onClick={() => setActiveIndex((current) => previousIndex(current, images.length))}
              type="button"
            >
              <ChevronLeft size={26} strokeWidth={1.8} />
            </button>
          ) : null}

          <div className="relative mx-auto h-full max-w-6xl">
            <Image
              alt={`${title} - ảnh ${(activeIndex ?? 0) + 1}`}
              className="object-contain"
              decoding="async"
              fill
              priority
              quality={78}
              sizes="(min-width: 1280px) 1152px, 100vw"
              src={fastImageUrl(activeImage, 1536, 78)}
            />
          </div>

          {images.length > 1 ? (
            <button
              aria-label="Ảnh tiếp theo"
              className="absolute right-4 top-1/2 z-10 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 p-3 transition hover:bg-surface-container-highest"
              onClick={() => setActiveIndex((current) => nextIndex(current, images.length))}
              type="button"
            >
              <ChevronRight size={26} strokeWidth={1.8} />
            </button>
          ) : null}

          {images.length > 1 ? (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 px-4 py-2 text-sm font-semibold">
              {(activeIndex ?? 0) + 1} / {images.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function GalleryTile({
  alt,
  badge,
  className,
  onClick,
  priority,
  src,
}: Readonly<{
  alt: string;
  badge?: string;
  className: string;
  onClick: () => void;
  priority?: boolean;
  src: string;
}>) {
  return (
    <button
      aria-label={`Xem ${alt}`}
      className={`group relative overflow-hidden rounded-lg text-left ${className}`}
      onClick={onClick}
      type="button"
    >
      <Image
        alt={alt}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        decoding="async"
        fill
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        quality={priority ? 82 : 78}
        sizes="(min-width: 768px) 50vw, 100vw"
        src={fastImageUrl(src, priority ? 1200 : 768, priority ? 82 : 78)}
      />
      {badge ? (
        <span className="absolute bottom-3 right-3 hidden rounded-md border border-outline-variant/30 bg-surface-container-high/90 px-3 py-1 text-sm font-semibold text-on-surface shadow-soft md:block">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function galleryGridClass(total: number) {
  if (total === 0) return "block";
  if (total === 1) return "grid grid-cols-1";
  if (total === 2) return "grid grid-cols-1 gap-2 md:grid-cols-3";
  return "grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2";
}

function galleryTileClass(total: number, index: number) {
  if (total === 1) return "h-full";
  if (index === 0) return total === 2 ? "h-full md:col-span-2" : "h-full md:col-span-2 md:row-span-2";
  if (total === 2) return "hidden h-full md:block";
  if (total === 3) return "hidden h-full md:col-span-2 md:block";
  return index === 3 ? "hidden h-full md:col-span-2 md:block" : "hidden h-full md:block";
}

function previousIndex(current: number | null, total: number) {
  if (!total) return null;
  return current === null || current === 0 ? total - 1 : current - 1;
}

function nextIndex(current: number | null, total: number) {
  if (!total) return null;
  return current === null || current === total - 1 ? 0 : current + 1;
}

function preloadGalleryImage(src?: string) {
  if (!src || typeof window === "undefined") return;

  for (const width of [768, 1200]) {
    const image = new window.Image();
    image.decoding = "async";
    image.src = fastImageUrl(src, width, 78);
  }
}
