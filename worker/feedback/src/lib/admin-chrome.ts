/**
 * The shell every admin page is rendered into — stylesheet, security headers,
 * escaping, the page frame and the navigation rail.
 *
 * It was extracted from review.ts when Store Reviews arrived, because the
 * console stopped being one page. The rail must look the same and carry the
 * same three groups whichever page you are on, and two copies of a rail is
 * two rails that drift.
 *
 * WHAT LIVES HERE: markup and CSS with no opinion about what is being listed.
 * WHAT DOES NOT: which queues exist, what they count, who may act on them.
 * A page passes in its own groups and its own counts; this file renders them.
 *
 * The two rules review.ts was built on are properties of this file now, and
 * every page that uses it inherits them:
 *
 *   1. NO SCRIPT BY DEFAULT. Plain server-rendered HTML with <form method=POST>,
 *      and every page works without JavaScript. A page with no script cannot be
 *      driven by injected content even if the escaping had a bug, which is why
 *      the default CSP is `default-src 'none'`. The one exception is the Store
 *      Reviews pages' own file (store/review-script.ts), allowed per response by
 *      a nonce — never inline, never eval, and still no network access.
 *   2. Every value that came from outside is escaped, and bodies render inside
 *      <pre> — never as markup, never as a URL the page will fetch.
 */

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/**
 * `default-src 'none'` is possible because these pages load no script, no fonts
 * and no third-party anything. A page that needs its one script (the Store
 * Reviews pages) overrides this header with a per-response nonce and changes
 * nothing else. `img-src 'self'` lets a screenshot render
 * through the attachment proxy and nothing else — in particular a body full of
 * image URLs cannot beacon out to an attacker's host.
 */
export function secureHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    // An admin page must never be cached anywhere: it is full of unpublished
    // user reports, some of which will turn out to be real.
    'cache-control': 'no-store, private',
    // Not a control -- it stops nobody. It only keeps an uncredentialed page
    // holding unpublished reports out of search results.
    'x-robots-tag': 'noindex, nofollow, noarchive',
    ...extra,
  };
}

const STYLE = `<style>
 :root{
   color-scheme:light;
   --bg:#f4f5f7; --panel:#fff; --sunk:#fafbfc; --ink:#14161a; --muted:#5c6270;
   --line:#e3e5ea; --line-soft:#eef0f3;
   --accent:#5b5bd6; --accent-ink:#fff; --accent-soft:#eeeefb; --code:#f2f3f6;
   --g-spam:#5b5bd6; --g-spam-bg:#f1f1fc; --g-spam-line:#ddddf6;
   --g-del:#0f766e;  --g-del-bg:#ecf6f4;  --g-del-line:#cfe6e1;
   --g-store:#92400e; --g-store-bg:#fdf3e7; --g-store-line:#f0dcc0;
   --ok:#177245; --ok-line:#177245; --ok-bg:#e9f6ee; --danger:#a11b2b; --danger-line:#a11b2b;
   --warn-bg:#fff4e0; --warn-ink:#8a5300; --warn-line:#e6c68a;
   --spam-bg:#fdeaec; --spam-ink:#a11b2b; --spam-line:#eec1c6;
   --quar-bg:#eceaf9; --quar-ink:#443a99; --quar-line:#cdc7ee;
   --fail-bg:#eef0f3; --fail-ink:#4b5160; --fail-line:#d6dae1;
 }
 /* Dark. Three ways in, one set of colours: the device asks for dark and nobody
    chose Light in Settings; or somebody chose Dark (data-theme, lib/theme.ts). */
 @media(prefers-color-scheme:dark){
   :root:not([data-theme="light"]){
     --bg:#0c0e11; --panel:#15181d; --sunk:#111419; --ink:#e8eaee; --muted:#98a0ae;
     --line:#242932; --line-soft:#1d222a;
     --accent:#8b8bf0; --accent-ink:#11131a; --accent-soft:#1d1e33; --code:#0e1115;
     --g-spam:#9b9bf5; --g-spam-bg:#181a2b; --g-spam-line:#272a45;
     --g-del:#5eead4;  --g-del-bg:#111f1d;  --g-del-line:#1e3733;
     --g-store:#f0b160; --g-store-bg:#241a0e; --g-store-line:#43331c;
     --ok:#4ade80; --ok-line:#2f6b46; --ok-bg:#12241a; --danger:#f87171; --danger-line:#7a3038;
     --warn-bg:#2c2213; --warn-ink:#f0c274; --warn-line:#4d3c1d;
     --spam-bg:#2c1619; --spam-ink:#f2a0a8; --spam-line:#5b2b32;
     --quar-bg:#1e1b33; --quar-ink:#b9b0f5; --quar-line:#372f5c;
     --fail-bg:#1a1e25; --fail-ink:#a6aebd; --fail-line:#333a45;
     color-scheme:dark;
   }
 }
 :root[data-theme="dark"]{
   --bg:#0c0e11; --panel:#15181d; --sunk:#111419; --ink:#e8eaee; --muted:#98a0ae;
   --line:#242932; --line-soft:#1d222a;
   --accent:#8b8bf0; --accent-ink:#11131a; --accent-soft:#1d1e33; --code:#0e1115;
   --g-spam:#9b9bf5; --g-spam-bg:#181a2b; --g-spam-line:#272a45;
   --g-del:#5eead4;  --g-del-bg:#111f1d;  --g-del-line:#1e3733;
   --g-store:#f0b160; --g-store-bg:#241a0e; --g-store-line:#43331c;
   --ok:#4ade80; --ok-line:#2f6b46; --ok-bg:#12241a; --danger:#f87171; --danger-line:#7a3038;
   --warn-bg:#2c2213; --warn-ink:#f0c274; --warn-line:#4d3c1d;
   --spam-bg:#2c1619; --spam-ink:#f2a0a8; --spam-line:#5b2b32;
   --quar-bg:#1e1b33; --quar-ink:#b9b0f5; --quar-line:#372f5c;
   --fail-bg:#1a1e25; --fail-ink:#a6aebd; --fail-line:#333a45;
   color-scheme:dark;
 }
 *{box-sizing:border-box}
 body{
   margin:0;background:var(--bg);color:var(--ink);
   font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
   -webkit-font-smoothing:antialiased;
 }
 a{color:var(--accent)}

 /* ---- shell ---- */
 .app{display:grid;grid-template-columns:15.5rem minmax(0,1fr);min-height:100vh}
 .app.solo{grid-template-columns:minmax(0,1fr)}

 /* ---- sidebar ---- */
 /* Full viewport height rather than content height, so the settings link can
    sit at the bottom-left corner where every console keeps it. */
 .side{
   background:var(--panel);border-right:1px solid var(--line);
   padding:1.15rem .8rem;display:flex;flex-direction:column;gap:1.4rem;
   position:sticky;top:0;align-self:start;height:100vh;overflow:auto;
 }
 .brand{display:flex;align-items:center;gap:.6rem;padding:0 .4rem}
 .mark{
   flex:none;width:2rem;height:2rem;border-radius:.55rem;
   background:var(--accent);color:var(--accent-ink);
   display:inline-flex;align-items:center;justify-content:center;
   font-size:.72rem;font-weight:700;letter-spacing:.03em;
 }
 .brand-t{display:flex;flex-direction:column;min-width:0}
 .brand-t strong{font-size:.92rem;font-weight:650;letter-spacing:-.01em}
 .brand-t small{font-size:.72rem;color:var(--muted)}

 /* Each group carries its own hue and mark. Two labels set in identical type
    read as one list with a word dropped into the middle of it. */
 .grp{
   border:1px solid var(--g-line);border-radius:.55rem;
   background:var(--g-bg);padding:.3rem;
 }
 .g-spam{--g:var(--g-spam);--g-bg:var(--g-spam-bg);--g-line:var(--g-spam-line)}
 .g-delivery{--g:var(--g-del);--g-bg:var(--g-del-bg);--g-line:var(--g-del-line)}
 .g-store{--g:var(--g-store);--g-bg:var(--g-store-bg);--g-line:var(--g-store-line)}
 .grp + .grp{margin-top:.6rem}
 .grp-l{
   display:flex;align-items:center;gap:.4rem;cursor:pointer;
   padding:.35rem .45rem;border-radius:.4rem;
   font-size:.67rem;font-weight:700;letter-spacing:.11em;
   text-transform:uppercase;color:var(--g);
   list-style:none;user-select:none;
 }
 .grp-l::-webkit-details-marker{display:none}
 .grp-l:hover{background:var(--panel)}
 .grp-l:focus-visible{outline:2px solid var(--g);outline-offset:1px}
 .grp-i{display:inline-flex;opacity:.9}
 .chev{margin-left:auto;display:inline-flex;opacity:.55;transition:transform .12s ease}
 .grp[open] .chev{transform:rotate(90deg)}
 @media(prefers-reduced-motion:reduce){.chev{transition:none}}
 .grp nav{display:flex;flex-direction:column;gap:.1rem;padding-top:.2rem}
 .q{
   display:flex;align-items:center;gap:.5rem;
   padding:.48rem .55rem;border-radius:.45rem;
   border-left:2px solid transparent;
   color:var(--muted);text-decoration:none;font-size:.87rem;font-weight:550;
   min-width:0;overflow-wrap:anywhere;
 }
 .q:hover{background:var(--panel);color:var(--ink)}
 .q[aria-current="page"]{
   background:var(--panel);color:var(--ink);font-weight:650;
   border-left-color:var(--g);box-shadow:0 1px 2px rgba(0,0,0,.06);
 }
 .q:focus-visible{outline:2px solid var(--g);outline-offset:1px}
 .q .n{
   margin-left:auto;min-width:1.3rem;text-align:right;
   font-size:.78rem;font-weight:650;font-variant-numeric:tabular-nums;color:var(--muted);
 }
 .q .n.zero{opacity:.35;font-weight:550}
 .q[aria-current="page"] .n{color:var(--g)}

 /* ---- settings, pinned to the foot of the rail ----
    Neutral on purpose: it is not a queue, so it takes no group hue and no
    count, and it sits apart from the three groups rather than among them. */
 .side-foot{margin-top:auto;padding-top:.7rem;border-top:1px solid var(--line-soft)}
 /* Icon only. Its name comes from aria-label, and title gives the hover
    tooltip — both native, so no script is needed for either. */
 .gear{
   display:inline-flex;align-items:center;justify-content:center;
   width:2.3rem;height:2.3rem;border-radius:.45rem;
   color:var(--muted);text-decoration:none;
 }
 .gear svg{flex:none}
 .gear:hover{background:var(--sunk);color:var(--ink)}
 .gear[aria-current="page"]{background:var(--accent-soft);color:var(--accent)}
 .gear:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

 /* ---- main ---- */
 main{padding:1.6rem 1.8rem 4rem;min-width:0}
 main.narrow{max-width:34rem;margin:0 auto;padding-top:3rem;display:flex;flex-direction:column;gap:1.5rem}
 .head{margin:0 0 1.15rem}
 .head h2{margin:0;font-size:1.2rem;font-weight:650;letter-spacing:-.02em}
 .head p{margin:.3rem 0 0;font-size:.86rem;color:var(--muted);max-width:64ch}

 /* ---- cards ---- */
 .card{
   background:var(--panel);border:1px solid var(--line);border-radius:.65rem;
   margin:0 0 .8rem;overflow:hidden;
 }
 .card-head{
   display:flex;flex-wrap:wrap;align-items:center;gap:.55rem;
   padding:.65rem .9rem;background:var(--sunk);border-bottom:1px solid var(--line-soft);
 }
 .when{font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums}
 .id{
   font:.71rem/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
   color:var(--muted);margin-left:auto;word-break:break-all;opacity:.75;
 }
 .card-body{padding:.9rem}
 .badge{
   display:inline-flex;align-items:center;
   padding:.2rem .5rem;border-radius:.35rem;
   font-size:.72rem;font-weight:650;border:1px solid;
 }
 .b-suspected{background:var(--warn-bg);color:var(--warn-ink);border-color:var(--warn-line)}
 .b-spam{background:var(--spam-bg);color:var(--spam-ink);border-color:var(--spam-line)}
 .b-quarantined{background:var(--quar-bg);color:var(--quar-ink);border-color:var(--quar-line)}
 .b-failed{background:var(--fail-bg);color:var(--fail-ink);border-color:var(--fail-line)}
 .b-queued{background:var(--code);color:var(--muted);border-color:var(--line)}
 .b-actionable{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
 .b-deferred{background:var(--warn-bg);color:var(--warn-ink);border-color:var(--warn-line)}
 .b-published{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-line)}

 /* Reason codes stay chips. Everything else is a quiet meta line — a row of
    identical pills makes a score look like a verdict, which it is not. */
 .chips{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem;margin:0 0 .7rem}
 /* WHO said so, set apart from WHAT they said. As a chip among chips,
    "suggested" read as another label — the one thing it must not look like. */
 .chips-by{
   font-size:.66rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
   color:var(--muted);margin-right:.1rem;
 }
 .tag{
   display:inline-block;padding:.15rem .45rem;border-radius:.3rem;
   border:1px solid var(--line);background:var(--code);
   font:.71rem/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--muted);
 }
 .meta{
   display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;
   margin:0 0 .7rem;font-size:.77rem;color:var(--muted);
 }
 .meta b{color:var(--ink);font-weight:600}
 .sep{opacity:.35}
 .note{font-size:.77rem;color:var(--muted);margin:.6rem 0 0}

 /* ---- store reviews ---- */
 /* A rating is read at a glance or not at all, so it gets the tabular width
    of five glyphs whatever the score — a 2-star and a 5-star row must line up
    down the column, or scanning for the bad ones stops working. */
 .rating{font-size:.82rem;letter-spacing:.08em;color:var(--muted);white-space:nowrap}
 .r-low{color:var(--danger)}
 .rv-title{margin:0 0 .45rem;font-size:.95rem;font-weight:650;letter-spacing:-.01em}
 /* A redacted body must not look like an ordinary one. Same treatment the
    quarantine placeholder gets in the spam queue. */
 .redacted{color:var(--muted);font-style:italic}

 /* ---- reply ----
    The reply sits directly under the review it answers, indented behind a rule,
    the way both stores show a developer reply. Once approved it is shown, not
    editable: what was approved is what gets sent. */
 .reply-intro{margin:0 0 .5rem;font-size:.84rem;color:var(--muted)}
 .reply-off{
   margin:0 0 .7rem;padding:.5rem .7rem;border-radius:.45rem;font-size:.82rem;
   background:var(--warn-bg);color:var(--warn-ink);border:1px solid var(--warn-line);
 }
 .reply-card{background:var(--panel);border:1px solid var(--line);border-radius:.65rem;padding:.85rem .9rem}
 .reply-head{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0 0 .6rem}
 .reply-meta{font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums}
 .reply-count{margin-left:auto;font-size:.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
 .reply-bubble,.reply-mini{
   border-left:3px solid var(--accent);background:var(--sunk);
   border-radius:0 .45rem .45rem 0;padding:.55rem .75rem;
 }
 .reply-from{
   display:block;margin:0 0 .2rem;font-size:.66rem;font-weight:700;letter-spacing:.09em;
   text-transform:uppercase;color:var(--muted);
 }
 .reply-bubble p,.reply-mini p{margin:0;font-size:.87rem;white-space:pre-wrap;overflow-wrap:anywhere}
 .reply-mini{margin:.7rem 0 0}
 .reply-mini p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
 .reply-form .fl,.decide-form .fl{gap:.3rem}
 .reply-form textarea,.decide-form textarea{
   font:inherit;font-size:.88rem;color:var(--ink);background:var(--sunk);width:100%;
   border:1px solid var(--line);border-radius:.45rem;padding:.55rem .65rem;resize:vertical;min-height:6rem;
 }
 .reply-form textarea:focus-visible,.decide-form textarea:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 .reply-hint{margin:.3rem 0 0;font-size:.76rem;color:var(--muted)}
 .reply-card .actions{margin-top:.7rem;padding-top:.7rem}
 .reply-status{margin:.55rem 0 0;font-size:.82rem;color:var(--muted)}
 .reply-error{
   margin:.6rem 0 0;padding:.5rem .7rem;border-radius:.45rem;font-size:.82rem;
   background:var(--spam-bg);color:var(--spam-ink);border:1px solid var(--spam-line);overflow-wrap:anywhere;
 }
 .reply-error.reply-notice{margin:0 0 .7rem}
 .decide-form fieldset{border:0;margin:0 0 .8rem;padding:0;min-width:0}
 .decide-form fieldset[disabled]{opacity:.7}
 .decide-form legend{
   padding:0;margin:0 0 .35rem;font-size:.7rem;font-weight:700;letter-spacing:.07em;
   text-transform:uppercase;color:var(--muted);
 }
 .choices{display:flex;flex-wrap:wrap;gap:.35rem .9rem}
 .choice{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;min-height:1.75rem;cursor:pointer}
 .choice input{margin:0;accent-color:var(--accent)}
 .choice code{font-size:.8rem}
 .decide-form textarea{min-height:4.5rem}
 .subsect{margin:1rem 0 .5rem;font-size:.85rem}
 .handoff-card > .actions:first-child{margin-top:0;padding-top:0;border-top:0}
 .reply-unsaved{margin:0 0 .7rem}
 /* Save as draft, then Send: side by side at the end of the reply, the primary last. */
 .reply-bar{justify-content:flex-end}
 .reply-bar button{min-width:8.5rem}
 .reply-head form.inline{margin-left:.4rem}

 /* ---- reply templates ---- */
 .sugg-head{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin:0 0 .6rem}
 .copy-status{margin-left:auto;font-size:.78rem;font-weight:600;color:var(--ok)}
 .tpls{display:flex;flex-wrap:wrap;gap:.35rem;margin:0}
 .tpl{
   font-size:.78rem;text-decoration:none;color:var(--muted);background:var(--sunk);
   border:1px solid var(--line);border-radius:999px;padding:.22rem .65rem;
 }
 .tpl:hover{color:var(--ink);border-color:var(--muted)}
 .tpl:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 .tpl[aria-current]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft);font-weight:600}
 .tpl-pick{font-size:.66rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;opacity:.75;margin-left:.2rem}
 .sugg-text{
   font:inherit;font-size:.88rem;color:var(--ink);background:var(--sunk);width:100%;
   border:1px solid var(--line);border-radius:.45rem;padding:.55rem .65rem;resize:vertical;min-height:6rem;
 }
 .sugg-text:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 .reply-aside{margin-top:.6rem;display:flex;justify-content:flex-end}
 .reply-history{margin:.7rem 0 0}
 .reply-history summary{cursor:pointer;font-size:.82rem;color:var(--muted);padding:.3rem 0}
 .reply-old{margin:.5rem 0 0;padding:.7rem .8rem;border:1px dashed var(--line);border-radius:.55rem}
 .reply-old .reply-bubble{opacity:.8}

 /* ---- filters ---- */
 /* A plain GET form. No script means no live filtering, which is why the
    Filter button is prominent rather than tucked away. */
 /* overflow-x:clip keeps an open tooltip from ever widening the page; it is
    moved inside this box first, so nothing is actually cut. */
 .filters{
   overflow-x:clip;
   display:flex;flex-wrap:wrap;gap:.55rem .7rem;align-items:flex-end;
   background:var(--panel);border:1px solid var(--line);border-radius:.65rem;
   padding:.85rem .9rem;margin:0 0 .9rem;
 }
 .fl{display:flex;flex-direction:column;gap:.25rem;min-width:0}
 .fl.grow{flex:1 1 15rem}
 .fl > span{
   font-size:.66rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
   color:var(--muted);
 }
 .fl select,.fl input{
   font:inherit;font-size:.85rem;color:var(--ink);background:var(--sunk);
   border:1px solid var(--line);border-radius:.4rem;padding:.35rem .5rem;
   min-width:0;max-width:100%;
 }
 .fl input{width:100%}
 .fl select:focus-visible,.fl input:focus-visible,
 .filters button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 .fl-actions{display:flex;align-items:center;gap:.7rem;margin-left:auto}
 /* The store filter bar is a grid, so Apply filters is always on a row with fields,
    never on a line of its own.
      wide (66rem+)   one row: Search, six filters, Apply at the end
      medium          Search and Apply on the first row, the six filters below
      phone (40rem-)  two columns, Apply full width at the end
    "Not applied yet" sits above the button and "Clear all" beside the active
    chips, so neither changes the bar's shape. */
 .store-filters{
   display:grid;align-items:end;gap:.55rem .6rem;
   grid-template-columns:repeat(4,minmax(0,1fr));
   grid-template-areas:"q q q act" "state reply github label" "rating sort . .";
 }
 .store-filters .fl{min-width:0}
 .store-filters .fl select,.store-filters .fl input{width:100%}
 .store-filters .fl-q{grid-area:q}
 .store-filters .fl-state{grid-area:state}
 .store-filters .fl-reply{grid-area:reply}
 .store-filters .fl-github{grid-area:github}
 .store-filters .fl-label{grid-area:label}
 .store-filters .fl-rating{grid-area:rating}
 .store-filters .fl-sort{grid-area:sort}
 .store-filters .fl-actions{grid-area:act;margin-left:0;justify-self:end;position:relative}
 .store-filters .fl-pending{position:absolute;right:0;bottom:100%;margin-bottom:.3rem;white-space:nowrap}
 @media(min-width:66rem){
   .store-filters{
     grid-template-columns:minmax(6.5rem,2fr) repeat(5,minmax(3.9rem,1fr)) minmax(7.4rem,1.35fr) auto;
     grid-template-areas:"q state reply github label rating sort act";
   }
 }
 @media(max-width:40rem){
   .store-filters{
     grid-template-columns:repeat(2,minmax(0,1fr));
     grid-template-areas:"q q" "state reply" "github label" "rating sort" "act act";
   }
   .store-filters .fl-actions{justify-self:stretch}
   .store-filters .fl-actions button{width:100%}
 }
 .active-filters .clear{margin-left:.35rem}
 .filters button{
   font:inherit;font-size:.85rem;font-weight:600;cursor:pointer;
   background:var(--accent);color:var(--accent-ink);
   border:1px solid var(--accent);border-radius:.4rem;padding:.4rem .9rem;
 }
 .clear{font-size:.8rem;color:var(--muted)}
 .filters button.pending{box-shadow:0 0 0 3px var(--accent-soft),0 0 0 4px var(--accent)}
 .fl-pending{font-size:.78rem;font-weight:600;color:var(--warn-ink)}
 .fl-pending:empty{display:none}

 /* ---- info tooltips ----
    One sentence per control, opened by hover, keyboard focus or tap. It is also
    the control's accessible description, so it is read out without opening. */
 .fl-head{display:inline-flex;align-items:center;gap:.3rem}
 .fl-head label{cursor:default}
 .tipwrap{position:relative;display:inline-flex}
 /* Qualified by .filters too: the filter bar's own button rule is the Apply
    button's, and without the extra class the (i) would inherit its fill. */
 .info,.filters button.info{
   min-height:0;width:1.15rem;height:1.15rem;padding:0;border-radius:50%;
   display:inline-flex;align-items:center;justify-content:center;
   border:1px solid var(--line);background:var(--panel);color:var(--muted);
   font:italic 700 .7rem/1 Georgia,"Times New Roman",serif;letter-spacing:0;text-transform:none;cursor:help;
 }
 .info:hover,.info:focus-visible,.tipwrap.open .info,
 .filters button.info:hover,.filters button.info:focus-visible{color:var(--accent);border-color:var(--accent);background:var(--panel)}
 .info:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 /* display:none while closed, so a tooltip near the edge never widens the page.
    Still the accessible description: aria-describedby reads hidden text too.
    The script nudges an open one back inside the screen (--tip-dx). */
 .tip{
   display:none;position:absolute;z-index:30;top:calc(100% + .45rem);left:-.45rem;
   width:max-content;max-width:min(17rem,calc(100vw - 2rem));
   transform:translateX(var(--tip-dx,0px));
   padding:.5rem .65rem;border-radius:.45rem;background:var(--ink);color:var(--panel);
   font:500 .78rem/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
   letter-spacing:normal;text-transform:none;white-space:normal;
   box-shadow:0 8px 24px rgba(0,0,0,.22);pointer-events:none;
 }
 .tipwrap:hover .tip,.tipwrap:focus-within .tip,.tipwrap.open .tip{display:block}
 .tipwrap.dismissed .tip{display:none}
 /* With the script, only a placed tooltip opens (review-script.ts). */
 .js-tips .tipwrap:hover .tip,.js-tips .tipwrap:focus-within .tip{display:none}
 .js-tips .tipwrap.open .tip{display:block}
 .tipwrap.measuring .tip{visibility:hidden}
 .active-filters{margin:0 0 .9rem}
 .removable{text-decoration:none;color:var(--muted);border-style:dashed}
 .removable:hover{color:var(--ink);border-color:var(--muted)}
 .count{font-size:.8rem;color:var(--muted);margin:0 0 .7rem}

 /* A list is for scanning; the whole body is on the detail page. */
 .clamp{max-height:8.5rem;overflow:hidden;position:relative}
 a.id{text-decoration:none}
 a.id:hover{color:var(--accent)}

 /* ---- review identifier and the way into a review ----
    The identifier is plain text at title weight. Opening the review is a button
    that looks like one: border, fill, icon, a label saying where it goes, and a
    hover and focus state, so nobody has to guess what is clickable. */
 .rv-key{font:650 .98rem/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:-.01em;overflow-wrap:anywhere}
 .card-head .rv-key{font-size:1.1rem;font-weight:700;margin-right:.4rem}
 .card-head .when{margin-left:auto}
 .icon{flex:none;display:block}
 .btn-link{
   display:inline-flex;align-items:center;gap:.4rem;min-height:2.1rem;padding:.35rem .8rem;
   border:1px solid var(--accent);border-radius:.45rem;background:var(--accent-soft);color:var(--accent);
   font-size:.83rem;font-weight:650;text-decoration:none;white-space:nowrap;cursor:pointer;
 }
 .btn-link:hover{background:var(--accent);color:var(--accent-ink)}
 .btn-link:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

 /* ---- pager ---- */
 .pager{display:flex;align-items:center;gap:1rem;justify-content:center;margin:1.2rem 0 0}
 .pager a{font-size:.85rem;font-weight:600;text-decoration:none}
 .pager span{font-size:.85rem;color:var(--muted)}
 .pager .pos{font-variant-numeric:tabular-nums}

 /* ---- one review ---- */
 .crumb{margin:0 0 .8rem;font-size:.83rem}
 .crumb a{text-decoration:none}
 .home-link{
   display:inline-flex;align-items:center;justify-content:center;width:2.4rem;height:2.4rem;
   border:1px solid var(--line);border-radius:.5rem;background:var(--panel);color:var(--ink);cursor:pointer;
 }
 .home-link:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
 .home-link:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .rv-header{margin:0 0 1.25rem;padding:0 0 1.1rem;border-bottom:1px solid var(--line)}
 .rv-top{display:flex;align-items:center;gap:.65rem;margin:0 0 .7rem}
 .rv-platform{margin:0;font-size:.88rem;font-weight:600;color:var(--muted)}
 .rv-title-key{margin:0 0 .6rem;line-height:1.15}
 .rv-title-key .rv-key{font-size:1.7rem;font-weight:700;letter-spacing:-.02em}
 .rv-sub{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:.45rem}
 .sect{margin:1.6rem 0 .6rem;font-size:.92rem;font-weight:650;letter-spacing:-.01em}
 .kv{
   width:100%;border-collapse:collapse;background:var(--panel);
   border:1px solid var(--line);border-radius:.65rem;overflow:hidden;font-size:.85rem;
 }
 .kv th,.kv td{padding:.45rem .7rem;text-align:left;vertical-align:top;
   border-bottom:1px solid var(--line-soft)}
 .kv tr:last-child th,.kv tr:last-child td{border-bottom:0}
 .kv th{font-weight:600;color:var(--muted);width:14rem}
 .kv code{background:var(--code);padding:.05rem .3rem;border-radius:.25rem;font-size:.8rem}
 .timeline{list-style:none;margin:0;padding:0;font-size:.85rem}
 .timeline li{
   display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline;
   padding:.5rem .7rem;background:var(--panel);
   border:1px solid var(--line);border-bottom:0;
 }
 .timeline li:first-child{border-radius:.65rem .65rem 0 0}
 .timeline li:last-child{border-bottom:1px solid var(--line);border-radius:0 0 .65rem .65rem}
 .t-when{color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
 .t-detail{flex:1 1 14rem;min-width:0;overflow-wrap:anywhere}
 .t-actor{color:var(--muted);font-size:.78rem}

 pre{
   margin:0;white-space:pre-wrap;word-break:break-word;
   background:var(--code);border:1px solid var(--line-soft);
   padding:.8rem;border-radius:.5rem;max-height:24rem;overflow:auto;
   font:.82rem/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
 }
 .shot{margin:.7rem 0 0}
 .shot img{max-width:100%;max-height:22rem;border-radius:.5rem;border:1px solid var(--line);display:block}

 /* ---- actions ---- */
 .actions{
   display:flex;flex-wrap:wrap;gap:.45rem;
   margin-top:.9rem;padding-top:.8rem;border-top:1px solid var(--line-soft);
 }
 form.inline{display:inline;margin:0}
 button{
   font:inherit;font-size:.85rem;font-weight:600;
   min-height:2.3rem;padding:.45rem .9rem;
   border-radius:.45rem;border:1px solid var(--line);
   background:var(--panel);color:var(--ink);cursor:pointer;
 }
 button:hover{border-color:var(--muted)}
 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .btn-primary{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
 .btn-primary:hover{border-color:var(--accent);filter:brightness(1.08)}
 .btn-small{min-height:1.9rem;padding:.25rem .7rem;font-size:.78rem}
 .btn-ok{border-color:var(--ok-line);color:var(--ok)}
 .btn-ok:hover{border-color:var(--ok)}
 .btn-danger{border-color:var(--danger-line);color:var(--danger)}
 .btn-danger:hover{border-color:var(--danger)}
 .none{font-size:.77rem;color:var(--muted);margin:.9rem 0 0;padding-top:.8rem;border-top:1px solid var(--line-soft)}

 /* ---- empty + misc ---- */
 .empty{
   background:var(--panel);border:1px dashed var(--line);border-radius:.65rem;
   padding:3.5rem 1.5rem;text-align:center;
 }
 .empty .big{font-size:1.5rem;margin:0 0 .5rem;color:var(--muted)}
 .empty h3{margin:0 0 .35rem;font-size:.97rem;font-weight:650}
 .empty p{margin:0 auto;color:var(--muted);font-size:.86rem;max-width:44ch}
 .refused{background:var(--panel);border:1px solid var(--line);border-radius:.65rem;padding:1.4rem}
 .refused h1{margin:0 0 .5rem;font-size:1.05rem}
 .refused code{background:var(--code);padding:.15rem .4rem;border-radius:.3rem;font-size:.85rem}
 /* ---- sign in ---- */
 .signin-actions{margin:1.2rem 0 .6rem}
 .signin-btn{
   display:inline-block;padding:.6rem 1.1rem;border-radius:.45rem;
   background:var(--accent);color:var(--accent-ink);text-decoration:none;
   font-weight:650;font-size:.92rem;
 }
 .signin-btn:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
 .signin-error{
   background:var(--spam-bg);color:var(--spam-ink);border:1px solid var(--spam-line);
   border-radius:.45rem;padding:.55rem .7rem;font-size:.86rem;margin:.9rem 0;
 }
 /* A removed person stays visible — who HAD access is the question asked
    after something goes wrong, and a hidden row cannot answer it. */
 .row-off th,.row-off td{opacity:.5}

 /* ---- settings page ---- */
 .panel{background:var(--panel);border:1px solid var(--line);border-radius:.65rem;margin:0 0 1rem;overflow:hidden}
 .panel-head{padding:.95rem 1rem .2rem}
 .panel-head h3{margin:0;font-size:.97rem;font-weight:650;letter-spacing:-.01em}
 .panel-head p{margin:.3rem 0 0;font-size:.84rem;color:var(--muted);max-width:64ch}
 .panel .filters{border:0;border-radius:0;margin:0;background:transparent;padding:.75rem 1rem 1rem}
 .panel .signin-error{margin:.6rem 1rem 0}
 /* position:relative keeps the absolutely-positioned .sr-only header inside the
    scroll box; without it, it escapes to the page and widens the whole body. */
 .table-wrap{overflow-x:auto;border-top:1px solid var(--line);position:relative}
 .members{width:100%;border-collapse:collapse;font-size:.85rem}
 .members th,.members td{
   padding:.55rem 1rem;text-align:left;vertical-align:middle;
   border-bottom:1px solid var(--line-soft);white-space:nowrap;
 }
 .members tbody tr:last-child th,.members tbody tr:last-child td{border-bottom:0}
 .members thead th{
   background:var(--sunk);font-size:.66rem;font-weight:700;letter-spacing:.09em;
   text-transform:uppercase;color:var(--muted);
 }
 .members tbody th{font-weight:600}
 .members td.act{text-align:right}
 .members .note{margin:0}
 /* Appearance: three choices as cards, the chosen one outlined. */
 .theme-form{padding:.75rem 1rem 1rem}
 .theme-form fieldset{border:0;margin:0;padding:0;min-width:0}
 .theme-options{display:flex;flex-wrap:wrap;gap:.55rem}
 .theme-opt{
   display:inline-flex;align-items:center;gap:.5rem;min-height:2.6rem;padding:.45rem .85rem;
   border:1px solid var(--line);border-radius:.55rem;background:var(--sunk);cursor:pointer;font-size:.88rem;font-weight:550;
 }
 .theme-opt:hover{border-color:var(--muted)}
 .theme-opt input{margin:0;accent-color:var(--accent)}
 .theme-opt:has(input:checked){border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
 .theme-opt:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
 .theme-form .actions{margin-top:.8rem;padding-top:0;border-top:0}
 .panel-foot{display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;justify-content:space-between}
 .panel-foot .note{margin:0}
 .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

 /* ---- the sign-in card ----
    Deliberately the shape people already know from every hosted auth screen:
    a centred card on a plain ground, the app name in the heading, one line of
    context, then full-width provider buttons carrying the real provider mark.
    A login page nobody recognises reads as untrustworthy whatever it does
    underneath, so the familiar shape IS part of the security story. */
 .auth{min-height:100vh;display:grid;place-items:center;padding:2rem 1rem;background:var(--bg)}
 .auth-card{
   width:100%;max-width:25rem;background:var(--panel);
   border:1px solid var(--line);border-radius:.9rem;overflow:hidden;
   box-shadow:0 1px 2px rgba(0,0,0,.05),0 10px 30px rgba(0,0,0,.09);
 }
 @media(prefers-color-scheme:dark){
   :root:not([data-theme="light"]) .auth-card{box-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.5)}
 }
 :root[data-theme="dark"] .auth-card{box-shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.5)}
 .auth-body{padding:2.1rem 2rem 1.7rem}
 .auth-mark{
   width:2.4rem;height:2.4rem;border-radius:.7rem;margin:0 auto .95rem;
   background:var(--accent);color:var(--accent-ink);
   display:flex;align-items:center;justify-content:center;
   font-size:.8rem;font-weight:700;letter-spacing:.03em;
 }
 .auth-title{
   margin:0 0 .3rem;text-align:center;font-size:1.16rem;font-weight:700;
   letter-spacing:-.02em;line-height:1.3;
 }
 .auth-sub{margin:0 0 1.5rem;text-align:center;font-size:.87rem;color:var(--muted)}
 .auth-btn{
   display:flex;align-items:center;justify-content:center;gap:.65rem;
   width:100%;padding:.72rem 1rem;margin:0 0 .6rem;
   border:1px solid var(--line);border-radius:.55rem;
   background:var(--panel);color:var(--ink);text-decoration:none;
   font-size:.92rem;font-weight:550;
 }
 .auth-btn:hover{background:var(--sunk);border-color:var(--muted)}
 .auth-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .auth-btn svg{flex:none}
 .auth-note{
   margin:1.3rem 0 0;text-align:center;font-size:.78rem;color:var(--muted);line-height:1.5;
 }
 .auth-err{
   margin:0 0 1.1rem;padding:.6rem .75rem;border-radius:.5rem;font-size:.84rem;
   background:var(--spam-bg);color:var(--spam-ink);border:1px solid var(--spam-line);
 }
 .auth-foot{
   border-top:1px solid var(--line);background:var(--sunk);
   padding:.8rem 2rem;text-align:center;font-size:.78rem;color:var(--muted);
 }

 @media(max-width:52rem){
   .app{grid-template-columns:minmax(0,1fr)}
   .side{
     position:static;height:auto;overflow:visible;
     border-right:0;border-bottom:1px solid var(--line);
     flex-direction:row;flex-wrap:wrap;align-items:center;
     gap:.5rem 1.1rem;padding:.85rem .9rem;
   }
   .brand{flex:1 1 100%}
   .grp{flex:1 1 14rem;padding:.25rem}
   .grp + .grp{margin-top:0}
   .grp nav{flex-direction:row;flex-wrap:wrap;gap:.25rem}
   .q{border-left:0;border-bottom:2px solid transparent;border-radius:.4rem .4rem 0 0}
   .q[aria-current="page"]{border-bottom-color:var(--accent)}
   .q .n{margin-left:.2rem;min-width:0}
   .side-foot{margin-top:0;padding-top:0;border-top:0;flex:1 1 100%}
   main{padding:1.15rem .9rem 4rem}
   .id{margin-left:0;width:100%}
   .card-head .btn-link{flex:1 1 100%;justify-content:center}
   .actions button{flex:1 1 auto}
 }
 /* A phone cannot show five columns, and scrolling sideways to reach Remove is
    not "easy". Each person becomes a stacked block, labelled from the header. */
 @media(max-width:40rem){
   .members thead{display:none}
   .members,.members tbody,.members tr,.members th,.members td{display:block;width:100%}
   .members tr{padding:.65rem 1rem;border-bottom:1px solid var(--line-soft)}
   .members tbody tr:last-child{border-bottom:0}
   .members th,.members td{padding:.12rem 0;border:0;white-space:normal;overflow-wrap:anywhere}
   .members td[data-label]::before{
     content:attr(data-label);display:inline-block;min-width:7.5rem;
     font-size:.66rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);
   }
   .members td.act{text-align:left;padding-top:.5rem}
 }
</style>`;

/**
 * One brand for the whole console. It says Command Center rather than
 * "Feedback review" because the rail now reaches three places, only one of
 * which is the spam queue.
 */
export function brand(): string {
  return `<div class="brand">
    <span class="mark" aria-hidden="true">MF</span>
    <span class="brand-t">
      <strong>Feedback Command Center</strong>
      <small>Bread Wallet</small>
    </span>
  </div>`;
}

export function page(
  title: string, body: string, status = 200,
  extra: Record<string, string> = {}, aside = ''
): Response {
  // A standalone page (not found, refused) has no queue to be inside, so it
  // gets a centred column rather than an empty rail pretending there is one.
  const shell = aside
    ? `<div class="app">${aside}<main>${body}</main></div>`
    : `<div class="app solo"><main class="narrow">${brand()}${body}</main></div>`;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>${esc(title)}</title>${STYLE}</head><body>${shell}</body></html>`,
    { status, headers: secureHeaders(extra) }
  );
}

/**
 * The Google mark, inline.
 *
 * INLINE SVG, not an <img>. The CSP is `img-src 'self'`, so a logo fetched
 * from Google's CDN would simply not render — and loosening the CSP to let a
 * picture load would be a poor trade on the one page that exists to keep
 * people out. Inline markup is part of the document and needs no exception.
 */
const GOOGLE_MARK =
  '<svg viewBox="0 0 48 48" width="17" height="17" aria-hidden="true" focusable="false">'
  + '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0'
  + ' 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
  + '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26'
  + ' 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
  + '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19'
  + 'C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>'
  + '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16'
  + ' 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

export const PROVIDER_MARKS = { google: GOOGLE_MARK } as const;

/**
 * A centred sign-in card, with no rail and no queue chrome around it.
 *
 * Separate from `page()` because a signed-out visitor must not be shown the
 * navigation of a console they cannot open — a rail listing queues, with counts
 * of reports they have no access to, is both a tease and a small leak.
 */
export function authPage(
  title: string, inner: string, footer = '', status = 200,
  extra: Record<string, string> = {}
): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>${esc(title)}</title>${STYLE}</head><body>` +
    `<div class="auth"><div class="auth-card"><div class="auth-body">${inner}</div>` +
    (footer ? `<div class="auth-foot">${footer}</div>` : '') +
    `</div></div></body></html>`,
    { status, headers: secureHeaders(extra) }
  );
}

/** One entry in the rail. `count` is rendered dimmed when it is zero. */
export interface NavItem {
  href: string;
  label: string;
  count: number;
  active: boolean;
}

/** One section of the rail. Each carries its own hue and mark. */
export interface NavGroup {
  id: string;
  label: string;
  cls: string;
  icon: string;
  items: NavItem[];
}

/**
 * Inline SVG, not emoji and not a webfont: the CSP is `default-src 'none'`
 * and a glyph that renders differently per platform is not an icon.
 */
const ICON = (path: string, size = 13) =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false"`
  + ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"'
  + ` stroke-linejoin="round">${path}</svg>`;

export const ICONS = {
  /** A star: what a store rating is. */
  store: ICON('<path d="M8 2.4l1.7 3.5 3.8.55-2.75 2.7.65 3.8L8 11.15l-3.4 1.8.65-3.8L2.5 6.45l3.8-.55z"/>'),
  /** An arrow moving through: something on its way somewhere. */
  delivery: ICON('<path d="M2.3 8h9.1"/><path d="M8.4 4.6 11.8 8l-3.4 3.4"/>'),
  /** A funnel: something being filtered out. */
  spam: ICON('<path d="M2.4 3.3h11.2l-4.3 5.1v4.3l-2.6-1.3V8.4z"/>'),
  /** A gear: the conventional mark for settings, drawn as 8 teeth around a hub. */
  settings: ICON('<path d="M6.78 3.46L6.98 1.58L9.02 1.58L9.22 3.46L10.35 3.93L11.82 2.74'
    + 'L13.26 4.18L12.07 5.65L12.54 6.78L14.42 6.98L14.42 9.02L12.54 9.22L12.07 10.35'
    + 'L13.26 11.82L11.82 13.26L10.35 12.07L9.22 12.54L9.02 14.42L6.98 14.42L6.78 12.54'
    + 'L5.65 12.07L4.18 13.26L2.74 11.82L3.93 10.35L3.46 9.22L1.58 9.02L1.58 6.98'
    + 'L3.46 6.78L3.93 5.65L2.74 4.18L4.18 2.74L5.65 3.93Z"/><circle cx="8" cy="8" r="2.1"/>', 18),
} as const;

/** Where the gear at the foot of the rail goes. */
export const SETTINGS_PATH = '/admin/settings';

/**
 * The rail.
 *
 * <details>, not a script: the toggle is native, keyboard-operable and
 * announced. Every group renders `open` — there is no script to remember a
 * collapse across a navigation, and a rail that reopened SOME groups and not
 * others would be a rail whose state you cannot predict.
 *
 * The settings link is part of the rail itself, not something each page adds,
 * so it is on every page that has a rail — and only those. The sign-in card
 * has no rail, so a signed-out visitor never sees it.
 */
export function sidebar(groups: NavGroup[], settingsActive = false): string {
  const rendered = groups.map(({ label, cls, icon, items }) => {
    if (items.length === 0) return '';
    return `<details class="grp ${esc(cls)}" open>
      <summary class="grp-l">
        <span class="grp-i">${icon}</span>${esc(label)}
        <span class="chev" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor"
               stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>
        </span>
      </summary>
      <nav aria-label="${esc(label)}">
        ${items.map((it) =>
          `<a class="q" href="${esc(it.href)}"${it.active ? ' aria-current="page"' : ''}>${
            esc(it.label)}<span class="n${it.count === 0 ? ' zero' : ''}">${esc(String(it.count))}</span></a>`
        ).join('')}
      </nav>
    </details>`;
  }).join('');
  const foot = `<div class="side-foot">
    <a class="gear" href="${SETTINGS_PATH}" aria-label="Settings" title="Settings"${
      settingsActive ? ' aria-current="page"' : ''}>${ICONS.settings}</a>
  </div>`;
  return `<aside class="side">${brand()}${rendered}${foot}</aside>`;
}
