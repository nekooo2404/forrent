"use client";

/* eslint-disable @next/next/no-img-element -- Cloudinary optimizes media at the source; native elements avoid a second optimization layer. */

import { ChevronLeft, ChevronRight, ImageOff, LoaderCircle, Play, Video, X } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { fastImageUrl, fastVideoUrl, videoPosterUrl } from "@/lib/image";

export type RoomGalleryMedia = Readonly<{
  label?: string;
  labelText?: string;
  src: string;
  type: "image" | "video";
}>;

type RoomGalleryProps = Readonly<{
  altText?: string;
  media: readonly RoomGalleryMedia[];
  title: string;
}>;

const modalMediaWidth = 1200;
const galleryMediaLoads = new Map<string, Promise<void>>();

export function RoomGallery({ altText, media, title }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isActiveMediaLoading, setIsActiveMediaLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const transitionId = useRef(0);
  const pointerStartX = useRef<number | null>(null);
  const activeMedia = activeIndex === null ? null : media[activeIndex];
  const modalRef = useFocusTrap<HTMLDivElement>(activeIndex !== null);
  const visibleMedia = media.slice(0, 4);
  const mediaLabel = mediaCountLabel(media);
  const mediaDescription = altText || title;

  const closeGallery = useCallback(() => {
    transitionId.current += 1;
    setActiveIndex(null);
    setPendingIndex(null);
    setFailedIndex(null);
    setLoadError(false);
    setIsActiveMediaLoading(false);
    setReloadVersion(0);
  }, []);

  const showIndex = useCallback(async (index: number | null) => {
    if (index === null || index === activeIndex || pendingIndex !== null || !media[index]) return;

    const requestId = ++transitionId.current;
    setPendingIndex(index);
    setFailedIndex(null);
    setLoadError(false);

    try {
      await preloadGalleryMedia(media[index]);
      if (transitionId.current === requestId) {
        setActiveIndex(index);
        setIsActiveMediaLoading(media[index].type === "video");
        setReloadVersion(0);
      }
    } catch {
      if (transitionId.current === requestId) {
        setFailedIndex(index);
        setLoadError(true);
      }
    } finally {
      if (transitionId.current === requestId) setPendingIndex(null);
    }
  }, [activeIndex, media, pendingIndex]);

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void showIndex(previousIndex(activeIndex, media.length));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void showIndex(nextIndex(activeIndex, media.length));
      }
    };

    document.body.classList.add("gallery-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("gallery-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, closeGallery, media.length, showIndex]);

  useEffect(() => {
    if (activeIndex === null || media.length < 2) return;

    const next = nextIndex(activeIndex, media.length);
    const previous = previousIndex(activeIndex, media.length);
    if (next === null || next === activeIndex) return;

    void preloadGalleryMedia(media[next])
      .then(() => {
        if (previous !== null && previous !== activeIndex && previous !== next) {
          return preloadGalleryMedia(media[previous]);
        }
      })
      .catch(() => undefined);
  }, [activeIndex, media]);

  const openGallery = (index: number) => {
    transitionId.current += 1;
    setPendingIndex(null);
    setFailedIndex(null);
    setLoadError(false);
    setIsActiveMediaLoading(media[index]?.type === "video");
    setReloadVersion(0);
    setActiveIndex(index);
  };

  const retryFailedMedia = () => {
    const targetIndex = failedIndex;
    setLoadError(false);
    setFailedIndex(null);
    if (targetIndex !== null && targetIndex !== activeIndex) {
      void showIndex(targetIndex);
      return;
    }
    setIsActiveMediaLoading(true);
    setReloadVersion((current) => current + 1);
  };

  return (
    <>
      <section
        aria-label="Ảnh và video phòng"
        className={`relative mb-6 h-[320px] overflow-hidden rounded-lg md:h-[440px] ${galleryGridClass(media.length)}`}
        data-image-count={media.length}
        data-media-count={media.length}
      >
        {visibleMedia.length ? (
          visibleMedia.map((item, index) => (
            <GalleryTile
              badge={index === visibleMedia.length - 1 && media.length > 1 ? mediaLabel : undefined}
              className={galleryTileClass(media.length, index)}
              index={index}
              item={item}
              key={`${item.type}-${item.src}`}
              onClick={() => openGallery(index)}
              priority={index === 0}
              title={mediaDescription}
            />
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-container-low px-6 text-center text-on-surface-variant">
            <ImageOff aria-hidden="true" size={36} strokeWidth={1.6} />
            <div>
              <p className="font-semibold text-on-surface">Ảnh và video phòng đang được cập nhật</p>
              <p className="mt-1 text-sm">Nhân viên tư vấn sẽ xác nhận hình ảnh và tình trạng phòng trước lịch xem.</p>
            </div>
          </div>
        )}
        {media.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-md border border-outline-variant/30 bg-surface-container-high/90 px-3 py-1 text-sm font-semibold text-on-surface shadow-soft md:hidden">
            {mediaLabel}
          </span>
        ) : null}
      </section>

      {activeMedia && activeIndex !== null ? (
        <div
          aria-busy={pendingIndex !== null || isActiveMediaLoading}
          aria-label={`Thư viện ảnh và video: ${title}`}
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-inverse-surface/95 p-4 text-inverse-on-surface"
          ref={modalRef}
          role="dialog"
        >
          <button
            aria-label="Đóng thư viện"
            className="absolute right-4 top-4 z-20 min-h-[48px] min-w-[48px] rounded-full border border-inverse-on-surface/20 bg-inverse-surface/80 p-3 transition hover:bg-inverse-surface focus-visible:outline-inverse-primary"
            onClick={closeGallery}
            type="button"
          >
            <X size={22} strokeWidth={1.8} />
          </button>

          {media.length > 1 ? (
            <button
              aria-label="Nội dung trước"
              className="absolute left-4 top-1/2 z-20 min-h-[52px] min-w-[52px] -translate-y-1/2 rounded-full border border-inverse-on-surface/20 bg-inverse-surface/80 p-3 transition hover:bg-inverse-surface disabled:cursor-wait disabled:opacity-60"
              disabled={pendingIndex !== null}
              onClick={() => void showIndex(previousIndex(activeIndex, media.length))}
              type="button"
            >
              <ChevronLeft size={26} strokeWidth={1.8} />
            </button>
          ) : null}
          <p className="absolute left-1/2 top-4 z-20 max-w-[calc(100%-9rem)] -translate-x-1/2 truncate rounded-md border border-inverse-on-surface/20 bg-inverse-surface/80 px-3 py-2 text-sm font-semibold">
            {mediaSemanticLabel(activeMedia, activeIndex)}
          </p>

          <div
            className="relative mx-auto h-full max-w-6xl touch-pan-y select-none pb-14 md:px-16 md:pb-24"
            data-gallery-stage
            onPointerCancel={() => {
              pointerStartX.current = null;
            }}
            onPointerDown={(event) => {
              if (event.pointerType === "touch" && activeMedia.type !== "video") {
                pointerStartX.current = event.clientX;
              }
            }}
            onPointerUp={(event) => {
              const startX = pointerStartX.current;
              pointerStartX.current = null;
              if (startX === null || Math.abs(event.clientX - startX) < 50) return;
              void showIndex(event.clientX < startX
                ? nextIndex(activeIndex, media.length)
                : previousIndex(activeIndex, media.length));
            }}
          >
            {activeMedia.type === "video" ? (
              <video
                aria-label={`${mediaDescription}, video ${activeIndex + 1}`}
                className="h-full w-full object-contain"
                controls
                key={`${activeIndex}-${activeMedia.src}-${reloadVersion}`}
                playsInline
                poster={videoPosterUrl(activeMedia.src, modalMediaWidth)}
                preload="auto"
                src={withRetryVersion(fastVideoUrl(activeMedia.src), reloadVersion)}
                onCanPlay={() => setIsActiveMediaLoading(false)}
                onError={() => {
                  setIsActiveMediaLoading(false);
                  setFailedIndex(activeIndex);
                  setLoadError(true);
                }}
              />
            ) : (
              <img
                alt={`${mediaSemanticLabel(activeMedia, activeIndex)} của ${mediaDescription}`}
                className="h-full w-full object-contain"
                decoding="async"
                draggable={false}
                height={900}
                key={`${activeIndex}-${activeMedia.src}-${reloadVersion}`}
                onError={() => {
                  setIsActiveMediaLoading(false);
                  setFailedIndex(activeIndex);
                  setLoadError(true);
                }}
                onLoad={() => setIsActiveMediaLoading(false)}
                sizes="100vw"
                src={withRetryVersion(modalImageUrl(activeMedia.src), reloadVersion)}
                srcSet={reloadVersion ? undefined : imageSrcSet(activeMedia.src)}
                width={modalMediaWidth}
              />
            )}
          </div>

          {pendingIndex !== null || isActiveMediaLoading ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md bg-inverse-surface/90 px-4 py-3 text-sm font-semibold shadow-lg"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" size={20} />
              Đang tải nội dung...
            </div>
          ) : null}

          {loadError ? (
            <div className="absolute left-1/2 top-1/2 z-30 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-inverse-on-surface/20 bg-inverse-surface p-5 text-center shadow-lg" role="alert">
              <p className="text-sm font-semibold text-inverse-on-surface">Không tải được nội dung. Kết nối có thể đang gián đoạn.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button className="min-h-11 rounded-md bg-inverse-primary px-4 py-2 text-sm font-semibold text-inverse-surface" onClick={retryFailedMedia} type="button">
                  Thử lại
                </button>
                <button className="min-h-11 rounded-md border border-inverse-on-surface/30 px-4 py-2 text-sm font-semibold" onClick={closeGallery} type="button">
                  Đóng
                </button>
              </div>
            </div>
          ) : null}

          {media.length > 1 ? (
            <button
              aria-label="Nội dung tiếp theo"
              className="absolute right-4 top-1/2 z-20 min-h-[52px] min-w-[52px] -translate-y-1/2 rounded-full border border-inverse-on-surface/20 bg-inverse-surface/80 p-3 transition hover:bg-inverse-surface disabled:cursor-wait disabled:opacity-60"
              disabled={pendingIndex !== null}
              onClick={() => void showIndex(nextIndex(activeIndex, media.length))}
              type="button"
            >
              <ChevronRight size={26} strokeWidth={1.8} />
            </button>
          ) : null}

          {media.length > 1 ? (
            <p className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-inverse-on-surface/20 bg-inverse-surface/80 px-4 py-2 text-sm font-semibold md:bottom-auto md:left-4 md:top-4 md:translate-x-0">
              {activeIndex + 1} / {media.length}
            </p>
          ) : null}

          {media.length > 1 ? (
            <div
              aria-label="Chọn nội dung"
              className="absolute bottom-3 left-1/2 z-20 hidden max-w-[calc(100%-8rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-md border border-inverse-on-surface/15 bg-inverse-surface/85 p-2 md:flex"
              role="group"
            >
              {media.map((item, index) => (
                <FilmstripButton
                  active={index === activeIndex}
                  disabled={pendingIndex !== null}
                  index={index}
                  item={item}
                  key={`${item.type}-${item.src}`}
                  onClick={() => void showIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function GalleryTile({ badge, className, index, item, onClick, priority, title }: Readonly<{
  badge?: string;
  className: string;
  index: number;
  item: RoomGalleryMedia;
  onClick: () => void;
  priority?: boolean;
  title: string;
}>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const width = priority ? modalMediaWidth : 768;
  const quality = 78;
  const semanticLabel = mediaSemanticLabel(item, index);
  const imageAlt = `${semanticLabel} của ${title}`;

  useEffect(() => {
    if (item.type === "image") {
      const image = imageRef.current;
      if (!image?.complete) return;
      if (image.naturalWidth > 0) setIsLoaded(true);
      else setHasError(true);
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (video.error) setHasError(true);
    else if (video.readyState >= HTMLMediaElement.HAVE_METADATA) setIsLoaded(true);
  }, [item.type]);

  return (
    <button
      aria-label={item.type === "video" ? `Xem video ${index + 1} của ${title}` : `Xem ${imageAlt}`}
      className={`group relative overflow-hidden rounded-lg bg-surface-container text-left ${className}`}
      onClick={onClick}
      onFocus={() => {
        void preloadGalleryMedia(item).catch(() => undefined);
      }}
      onPointerEnter={() => {
        void preloadGalleryMedia(item).catch(() => undefined);
      }}
      onPointerDown={() => {
        void preloadGalleryMedia(item).catch(() => undefined);
      }}
      type="button"
    >
      {!isLoaded && !hasError ? <span aria-hidden="true" className="absolute inset-0 skeleton-shimmer" /> : null}
      <span className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-md border border-outline-variant/30 bg-surface-container-lowest/90 px-2.5 py-1 text-xs font-semibold text-on-surface shadow-soft">
        {semanticLabel}
      </span>
      {item.type === "video" ? (
        <>
          <video
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            height={900}
            muted
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            playsInline
            poster={videoPosterUrl(item.src, width)}
            preload="metadata"
            ref={videoRef}
            src={fastVideoUrl(item.src)}
            width={width}
          />
          <span className="absolute inset-0 grid place-items-center bg-inverse-surface/20 transition-colors group-hover:bg-inverse-surface/30">
            <span className="grid size-14 place-items-center rounded-full border border-inverse-on-surface/30 bg-inverse-surface/80 text-inverse-on-surface shadow-soft">
              <Play aria-hidden="true" className="ml-0.5" fill="currentColor" size={24} />
            </span>
          </span>
        </>
      ) : (
        <img
          alt={imageAlt}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-200 group-hover:scale-[1.02] ${isLoaded ? "opacity-100" : "opacity-0"}`}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          height={900}
          loading={priority ? "eager" : "lazy"}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          ref={imageRef}
          sizes={priority ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
          src={fastImageUrl(item.src, width, quality)}
          srcSet={imageSrcSet(item.src)}
          width={width}
        />
      )}
      {hasError ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-container-low px-4 text-center text-sm font-semibold text-on-surface-variant">
          <ImageOff aria-hidden="true" size={24} />
          Không tải được {item.type === "video" ? "video" : "ảnh"}
        </span>
      ) : null}
      {badge ? (
        <span className="absolute bottom-3 right-3 hidden rounded-md border border-outline-variant/30 bg-surface-container-high/90 px-3 py-1 text-sm font-semibold text-on-surface shadow-soft md:block">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function FilmstripButton({ active, disabled, index, item, onClick }: Readonly<{
  active: boolean;
  disabled: boolean;
  index: number;
  item: RoomGalleryMedia;
  onClick: () => void;
}>) {
  const poster = item.type === "video" ? videoPosterUrl(item.src, 160) : fastImageUrl(item.src, 160, 70);
  const label = mediaSemanticLabel(item, index);

  return (
    <button
      aria-current={active ? "true" : undefined}
      aria-label={`Xem ${label}`}
      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded border-2 transition ${active ? "border-inverse-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {poster ? (
        <img alt="" className="h-full w-full object-cover" decoding="async" height={56} loading="lazy" src={poster} width={80} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-inverse-surface text-inverse-on-surface">
          <Video aria-hidden="true" size={20} />
        </span>
      )}
      {item.type === "video" ? (
        <span className="absolute inset-0 grid place-items-center bg-inverse-surface/25 text-inverse-on-surface">
          <Play aria-hidden="true" fill="currentColor" size={16} />
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function galleryGridClass(total: number) {
  if (total === 0) return "block";
  if (total === 1) return "grid grid-cols-1";
  if (total === 2) return "grid grid-cols-1 gap-2 md:grid-cols-3";
  return "grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2";
}

function mediaCountLabel(media: readonly RoomGalleryMedia[]) {
  const imageCount = media.filter((item) => item.type === "image").length;
  const videoCount = media.length - imageCount;
  return [imageCount ? `${imageCount} ảnh` : "", videoCount ? `${videoCount} video` : ""].filter(Boolean).join(" · ");
}

const mediaLabels: Record<string, string> = {
  OVERVIEW: "Toàn cảnh",
  SLEEPING_AREA: "Góc ngủ",
  KITCHEN: "Bếp",
  BATHROOM: "WC",
  BALCONY: "Ban công",
  VIDEO_TOUR: "Video tham quan",
  OTHER: "Góc khác",
};

function mediaSemanticLabel(item: RoomGalleryMedia, index: number) {
  if (item.labelText) return item.labelText;
  if (item.label && mediaLabels[item.label]) return mediaLabels[item.label];
  if (item.type === "video") return "Video tham quan";
  return index === 0 ? "Toàn cảnh" : `Góc phòng ${index + 1}`;
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

function modalImageUrl(src: string) {
  return fastImageUrl(src, modalMediaWidth, 78);
}

function imageSrcSet(src: string) {
  const widths = [480, 768, 960, modalMediaWidth];
  const urls = widths.map((width) => fastImageUrl(src, width, 78));
  return new Set(urls).size > 1
    ? urls.map((url, index) => `${url} ${widths[index]}w`).join(", ")
    : undefined;
}

function withRetryVersion(url: string, version: number) {
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}retry=${version}`;
}

function preloadGalleryMedia(item?: RoomGalleryMedia) {
  if (!item || typeof window === "undefined") return Promise.resolve();
  if (item.type === "video") {
    const poster = videoPosterUrl(item.src, modalMediaWidth);
    void preloadVideoMetadata(fastVideoUrl(item.src)).catch(() => undefined);
    return poster ? preloadImage(poster) : preloadVideoMetadata(fastVideoUrl(item.src));
  }
  return preloadImage(modalImageUrl(item.src), imageSrcSet(item.src));
}

function preloadImage(url: string, srcSet?: string) {
  const key = `image:${srcSet || url}`;
  const cached = galleryMediaLoads.get(key);
  if (cached) return cached;

  const request = new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    if (srcSet) {
      image.sizes = "100vw";
      image.srcset = srcSet;
    }
    image.onload = () => {
      image.decode().then(resolve).catch(resolve);
    };
    image.onerror = () => reject(new Error("Gallery image failed to load."));
    image.src = url;
  });

  galleryMediaLoads.set(key, request);
  void request.catch(() => galleryMediaLoads.delete(key));
  return request;
}

function preloadVideoMetadata(url: string) {
  const key = `video:${url}`;
  const cached = galleryMediaLoads.get(key);
  if (cached) return cached;

  const request = new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Gallery video failed to load."));
    video.src = url;
    video.load();
  });

  galleryMediaLoads.set(key, request);
  void request.catch(() => galleryMediaLoads.delete(key));
  return request;
}
