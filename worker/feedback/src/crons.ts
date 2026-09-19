/**
 * Every cron string the Worker dispatches on.
 *
 * Must match wrangler.jsonc `triggers.crons` exactly — character for character,
 * one entry per trigger. `scheduled()` does NOTHING for a string it does not
 * recognise (see the note there), so a trigger with no entry here never runs
 * its job, and an entry with no trigger never fires. Test GP14 compares the two
 * sets, reading wrangler.jsonc the way scripts/deploy.sh does.
 */
export const DRAIN_CRON = '* * * * *';
export const MIRROR_CRON = '*/15 * * * *';
/**
 * TWO COLLECTION CYCLES A DAY, not a clock that never stops.
 *
 * 04:00 and 16:00 UTC are 12:00 and 00:00 in Asia/Manila, which is UTC+8 all
 * year — there is no daylight saving to drift against. Each cycle gets a
 * four-hour window of five-minute ticks, and a store stops being asked the
 * moment its pass for that cycle is complete: on a quiet day that is ONE
 * request per store, and the rest of the window costs a single query to
 * discover there is nothing to do.
 *
 * THE WINDOW IS A CEILING, NOT A SCHEDULE. It is there so a backlog can be
 * walked page by page — one page per invocation is what the free plan's 50
 * queries allow — without a cycle running indefinitely. A pass that does not
 * finish inside its window keeps its cursor and continues in the next one.
 *
 * See src/store/cron.ts for the phase rotation and checkpoint.ts for cycleStart.
 */
export const STORE_CRON = '*/5 4-7,16-19 * * *';
