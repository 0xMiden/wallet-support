/** Bridge the wallet's motion tokens to Radix/CSS animations without retuning them. */
import { durations, easings, presets, sheetMotionVars, springToLinearEasing } from './animation';

export function applyMotionVariables() {
  const press = springToLinearEasing(presets.press.transition, { distance: 24 });
  const pop = springToLinearEasing(presets.pop.transition, { distance: 24 });
  const variables: Record<string, string> = {
    ...sheetMotionVars,
    '--motion-fast': `${durations.fast}s`,
    '--motion-ease': `cubic-bezier(${easings.easeOutCubic.join(',')})`,
    '--motion-press-scale': String(presets.press.whileTap?.scale),
    '--motion-press-duration': `${press?.duration ?? durations.fast * 1000}ms`,
    '--motion-press-easing': press?.easing ?? `cubic-bezier(${easings.easeOutCubic.join(',')})`,
    '--motion-pop-duration': `${pop?.duration ?? durations.fast * 1000}ms`,
    '--motion-pop-easing': pop?.easing ?? `cubic-bezier(${easings.easeOutCubic.join(',')})`,
    '--motion-pop-enter-scale': String(presets.pop.initial?.scale),
    '--motion-pop-exit-scale': String(presets.pop.exit?.scale),
    '--motion-pending-duration': `${durations.shimmer}s`
  };
  for (const [name, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(name, value);
  }
}
