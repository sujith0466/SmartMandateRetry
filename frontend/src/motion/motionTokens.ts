import { Variants, Transition } from 'framer-motion';

/**
 * Standard Motion Durations (in seconds)
 */
export const MOTION_DURATIONS = {
  instant: 0.08,
  micro: 0.14,
  standard: 0.22,
  emphasis: 0.35,
  major: 0.5,
} as const;

/**
 * Standard Fintech Motion Easings
 */
export const MOTION_EASINGS = {
  fintechBezier: [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring', stiffness: 350, damping: 28 } as Transition,
  gentleSpring: { type: 'spring', stiffness: 220, damping: 24 } as Transition,
};

/**
 * Common Standard Transitions
 */
export const transitions = {
  micro: {
    duration: MOTION_DURATIONS.micro,
    ease: MOTION_EASINGS.fintechBezier,
  },
  standard: {
    duration: MOTION_DURATIONS.standard,
    ease: MOTION_EASINGS.fintechBezier,
  },
  emphasis: {
    duration: MOTION_DURATIONS.emphasis,
    ease: MOTION_EASINGS.fintechBezier,
  },
  spring: MOTION_EASINGS.spring,
};

/**
 * Reusable Motion Variants for UI Elements
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.standard },
  exit: { opacity: 0, transition: transitions.micro },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.standard },
  exit: { opacity: 0, y: -4, transition: transitions.micro },
};

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitions.emphasis },
  exit: { opacity: 0, scale: 0.96, transition: transitions.micro },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitions.standard },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: transitions.emphasis },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: transitions.micro },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.standard },
  exit: { opacity: 0, transition: transitions.micro },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: transitions.emphasis },
  exit: { x: '100%', transition: transitions.standard },
};

export const tableRowVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: transitions.micro },
};
