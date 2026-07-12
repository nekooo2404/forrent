"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { fastImageProps, fastImageUrl } from "@/lib/image";

type RoomGalleryProps = Readonly<{
  images: string[];
  title: string;
}>;

export function RoomGallery({ images, title }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const modalRef = useFocusTrap<HTMLDivElement>(activeIndex !== null);

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
      <section className="mb-6 grid h-[360px] grid-cols-1 grid-rows-2 gap-2 md:h-[460px] md:grid-cols-4">
        <GalleryTile
          alt={`${title} - ảnh chính`}
          className="col-span-1 row-span-2 md:col-span-2"
          onClick={() => setActiveIndex(0)}
          priority
          src={images[0]}
        />
        <GalleryTile alt={`${title} - ảnh 2`} className="hidden md:col-span-1 md:row-span-1 md:block" onClick={() => setActiveIndex(1)} src={images[1]} />
        <GalleryTile alt={`${title} - ảnh 3`} className="hidden md:col-span-1 md:row-span-1 md:block" onClick={() => setActiveIndex(2)} src={images[2]} />
        <GalleryTile
          alt={`${title} - ảnh 4`}
          badge={images.length ? `${images.length} ảnh` : undefined}
          className="hidden md:col-span-2 md:row-span-1 md:block"
          onClick={() => setActiveIndex(3)}
          src={images[3]}
        />
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

          <button
            aria-label="Ảnh trước"
            className="absolute left-4 top-1/2 z-10 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 p-3 transition hover:bg-surface-container-highest"
            onClick={() => setActiveIndex((current) => previousIndex(current, images.length))}
            type="button"
          >
            <ChevronLeft size={26} strokeWidth={1.8} />
          </button>

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
              {...fastImageProps()}
            />
          </div>

          <button
            aria-label="Ảnh tiếp theo"
            className="absolute right-4 top-1/2 z-10 min-h-[44px] min-w-[44px] -translate-y-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 p-3 transition hover:bg-surface-container-highest"
            onClick={() => setActiveIndex((current) => nextIndex(current, images.length))}
            type="button"
          >
            <ChevronRight size={26} strokeWidth={1.8} />
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-outline-variant/30 bg-surface-container-high/80 px-4 py-2 text-sm font-semibold">
            {(activeIndex ?? 0) + 1} / {images.length}
          </p>
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
  src?: string;
}>) {
  return (
    <button
      aria-label={src ? `Xem ${alt}` : "Chưa có ảnh phòng"}
      className={`group relative overflow-hidden rounded-lg text-left ${className}`}
      disabled={!src}
      onClick={onClick}
      type="button"
    >
      {src ? (
        <>
          <Image
            alt={alt}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            decoding="async"
            fill
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            quality={priority ? 82 : 78}
            sizes="(min-width: 768px) 50vw, 100vw"
            src={fastImageUrl(src, priority ? 1200 : 768, priority ? 82 : 78)}
            {...fastImageProps()}
          />
          {badge ? (
            <span className="absolute bottom-3 right-3 rounded-md border border-outline-variant/30 bg-surface-container-high/90 px-3 py-1 text-sm font-semibold text-on-surface shadow-soft">
              {badge}
            </span>
          ) : null}
        </>
      ) : (
        <span className="flex h-full min-h-40 w-full items-center justify-center bg-surface-container-low text-center text-sm font-medium text-on-surface-variant">
          Chưa có ảnh phòng
        </span>
      )}
    </button>
  );
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
