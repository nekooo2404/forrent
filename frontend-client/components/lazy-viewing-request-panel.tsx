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
        className="min-h-[360px] rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft md:p-6"
      />
    ),
  },
);

export function LazyViewingRequestPanel(props: Readonly<LazyViewingRequestPanelProps>) {
  return <ViewingRequestPanel {...props} />;
}
