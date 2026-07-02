"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

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
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionDuration.slow, ease: motionEase.smooth } },
};

export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: motionDuration.medium, ease: motionEase.smooth } },
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
    <motion.div initial="hidden" variants={fadeSlide} viewport={{ once: true, margin: "-60px" }} whileInView="show" {...props}>
      {children}
    </motion.div>
  );
}

export const MotionDiv = motion.div;
