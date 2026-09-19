/**
 * The one script on the Store Reviews pages, served from /admin/store/review.js.
 *
 * WHY THERE IS A SCRIPT AT ALL. Everything else on these pages works with no
 * JavaScript. A few things cannot: a one-click Copy (the clipboard is only
 * reachable from script), switching a reply template without a reload that
 * would lose a half-written reply above it, closing an info tooltip with Escape
 * or a second tap, and saying that a filter choice has not been applied yet.
 * Each is an enhancement: without the script the Copy button stays hidden,
 * template links reload the page, and tooltips still open on hover and focus.
 *
 * HOW THE CSP STAYS STRICT. The page allows exactly one script, by a nonce that
 * is new on every response: `script-src 'nonce-…'`, no 'unsafe-inline', no
 * 'unsafe-eval', and `default-src 'none'` still forbids fetch, so the script can
 * neither run text a reviewer wrote nor send anything anywhere. It reads no
 * review text into markup: it only copies a field's value and swaps one field's
 * value for another string the server already escaped into an attribute.
 */
export const REVIEW_SCRIPT = `(() => {
  'use strict';

  // ---- Copy ----------------------------------------------------------------
  for (const btn of document.querySelectorAll('button[data-copy]')) {
    const field = document.getElementById(btn.getAttribute('data-copy'));
    const status = document.getElementById(btn.getAttribute('data-status'));
    if (!field) continue;
    btn.hidden = false;
    let timer = 0;
    const say = (text) => {
      if (!status) return;
      status.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(() => { status.textContent = ''; }, 2500);
    };
    btn.addEventListener('click', async () => {
      // The field's value exactly as it stands: plain text, no markup, no trimming.
      const text = field.value;
      try {
        await navigator.clipboard.writeText(text);
        say('Copied');
      } catch {
        field.focus();
        field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { copied = false; }
        say(copied ? 'Copied' : 'Selected. Press Ctrl+C or Cmd+C to copy.');
      }
    });
  }

  // ---- Reply templates, without a reload ------------------------------------
  for (const link of document.querySelectorAll('a[data-template-text]')) {
    link.addEventListener('click', (e) => {
      const field = document.getElementById(link.getAttribute('data-target'));
      if (!field) return;
      e.preventDefault();
      field.value = link.getAttribute('data-template-text');
      for (const other of link.parentElement.querySelectorAll('a[data-template-text]')) {
        if (other === link) other.setAttribute('aria-current', 'true');
        else other.removeAttribute('aria-current');
      }
      field.focus();
    });
  }

  // ---- Filters: say when a choice has not been applied yet -----------------
  // Filters apply when the form is submitted, never on change: reloading the page
  // under someone still choosing would move their focus and lose their place.
  const filters = document.querySelector('form.filters');
  if (filters) {
    const status = document.getElementById('filters-pending');
    const apply = filters.querySelector('button[type=submit]');
    const serial = () => new URLSearchParams(new FormData(filters)).toString();
    const applied = serial();
    const mark = () => {
      const changed = serial() !== applied;
      if (apply) apply.classList.toggle('pending', changed);
      if (status) status.textContent = changed ? 'Not applied yet' : '';
    };
    filters.addEventListener('change', mark);
    filters.addEventListener('input', mark);
  }

  // ---- Info tooltips ----------------------------------------------------------
  // With the script, a tooltip opens only once it has been placed: it is shown
  // hidden, measured, moved inside the filter box, then revealed in the same task,
  // so no frame ever draws it past the edge and the page never shifts sideways.
  // Without the script, CSS opens it on hover and focus.
  const root = document.documentElement;
  root.classList.add('js-tips');
  const tips = [...document.querySelectorAll('.tipwrap')];
  const place = (wrap) => {
    const tip = wrap.querySelector('.tip');
    if (!tip) return;
    wrap.classList.add('measuring');
    tip.style.removeProperty('--tip-dx');
    const r = tip.getBoundingClientRect();
    const box = (wrap.closest('.filters') || root).getBoundingClientRect();
    const pad = 8;
    const left = Math.max(box.left, 0) + pad;
    const right = Math.min(box.right, root.clientWidth) - pad;
    let dx = r.right > right ? right - r.right : 0;
    if (r.left + dx < left) dx = left - r.left;
    if (dx) tip.style.setProperty('--tip-dx', dx + 'px');
    wrap.classList.remove('measuring');
  };
  const hide = (wrap) => { wrap.classList.remove('open'); delete wrap.dataset.tapped; };
  const closeAll = (except) => { for (const t of tips) if (t !== except) hide(t); };
  const show = (wrap) => {
    if (wrap.classList.contains('dismissed')) return;
    closeAll(wrap);
    wrap.classList.add('open');
    place(wrap);
  };
  for (const wrap of tips) {
    const btn = wrap.querySelector('.info');
    if (!btn) continue;
    wrap.addEventListener('mouseenter', () => show(wrap));
    wrap.addEventListener('mouseleave', () => {
      wrap.classList.remove('dismissed');
      if (document.activeElement !== btn) hide(wrap);
    });
    btn.addEventListener('focus', () => show(wrap));
    btn.addEventListener('blur', () => {
      wrap.classList.remove('dismissed');
      if (!wrap.matches(':hover')) hide(wrap);
    });
    // A tap opens it; a second tap on the same (i) closes it.
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      wrap.classList.remove('dismissed');
      if (wrap.classList.contains('open') && wrap.dataset.tapped) { hide(wrap); return; }
      show(wrap);
      wrap.dataset.tapped = '1';
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('.tipwrap')) closeAll(null);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const t of tips) {
      if (t.classList.contains('open')) { t.classList.add('dismissed'); hide(t); }
    }
  });
})();
`;
