/**
 * The home panel tints, taken in turn by position: sage, blue, lavender,
 * slate, then round again, so an eighth category takes the first tint and the
 * palette never grows with the content. The colours themselves live in
 * tokens.css under the same names; this is only the order.
 *
 * The home grid and the category view both read it, so a category's numbered
 * chips wear the colour its panel wears on the home page.
 */
export const panelTints = ['sage', 'blue', 'lavender', 'slate'] as const;

export type PanelTint = (typeof panelTints)[number];

export function panelTintFor(index: number): PanelTint {
  const count = panelTints.length;
  return panelTints[((index % count) + count) % count];
}
