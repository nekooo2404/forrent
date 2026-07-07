"use client";

import dynamic from "next/dynamic";

type LazyViewingRequestPanelProps = {
  disabled?: boolean;
  roomId: number | null;
};

const ViewingRequestPanel = dynamic(
  () => import("@/components/viewing-request-panel").then((module) => module.ViewingRequestPanel),
  {
    loading: () => (
      <div
        aria-busy="true"
        className="min-h-[360px] rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-elevated md:p-7"
      />
    ),
  },
);

export function LazyViewingRequestPanel(props: Readonly<LazyViewingRequestPanelProps>) {
  return <ViewingRequestPanel {...props} />;
}
