"use client";

import { AnimatePresence, motion, type HTMLMotionProps, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const motionDuration = {
  fast: 0.16,
  base: 0.25,
  medium: 0.4,
  slow: 0.6,
} as const;

export const motionEase = {
  out: [0.2, 0.8, 0.2, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.4, 0, 0.2, 1],
  smooth: [0.22, 1, 0.36, 1],
} as const;

export const pageFadeSlide: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionDuration.slow, ease: motionEase.smooth } },
};

export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionDuration.medium, ease: motionEase.smooth } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  show: { opacity: 1, backdropFilter: "blur(8px)", transition: { duration: motionDuration.base, ease: motionEase.out } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 18, filter: "blur(8px)" },
  show: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { duration: motionDuration.medium, ease: motionEase.smooth } },
};

export function MotionPage({ children, className = "", ...props }: HTMLMotionProps<"main">) {
  return (
    <motion.main animate="show" className={className} initial="hidden" variants={pageFadeSlide} {...props}>
      {children}
    </motion.main>
  );
}

export function MotionSection({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div initial="hidden" variants={fadeSlide} viewport={{ once: true, margin: "-80px" }} whileInView="show" {...props}>
      {children}
    </motion.div>
  );
}

export function MotionList({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div initial="hidden" variants={staggerContainer} viewport={{ once: true, margin: "-80px" }} whileInView="show" {...props}>
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeSlide} {...props}>
      {children}
    </motion.div>
  );
}

export function MotionModal({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={{ duration: motionDuration.base, ease: motionEase.out }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export const MotionDiv = motion.div;
