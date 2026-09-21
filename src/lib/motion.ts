/** Shared wallet springs. Components must honor the root reduced-motion policy. */
export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 38, mass: 1 },
  standard: { type: 'spring', stiffness: 322, damping: 32, mass: 1 }
} as const;
export const enter = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springs.standard }
};
