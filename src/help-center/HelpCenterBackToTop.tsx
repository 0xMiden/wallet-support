import { useEffect, useState } from 'react';

/**
 * A way back to the top, for the pages that have a distance to travel.
 *
 * Deliberately not on the home page: it is one screen of hero, cards and
 * footer, and a control that appears on a page nobody scrolls is clutter.
 *
 * It moves focus as well as the viewport. Scrolling alone leaves a keyboard
 * reader's focus at the foot of the document, so the next Tab would take them
 * back into the footer they just left — the button would look like it worked
 * and do nothing for the people most likely to need it.
 */

/**
 * How far down to appear.
 *
 * A fixed 400px did not work: "What is Guardian?" is short enough that the
 * whole document scrolls 287px, so the reader could be standing in the footer
 * with the button still hidden — the one case it exists for. The threshold is
 * whichever comes first: 400px, or halfway down what there is to scroll.
 */
const REVEAL_AFTER_PX = 400;

/** Below this there is no journey to save the reader, and a button would blink. */
const MIN_SCROLLABLE_PX = 200;

function revealThreshold(scrollable: number) {
  return Math.min(REVEAL_AFTER_PX, scrollable / 2);
}

export function HelpCenterBackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setIsVisible(
        scrollable >= MIN_SCROLLABLE_PX && window.scrollY >= revealThreshold(scrollable)
      );
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    // The document grows and shrinks under it — a platform tab swaps the body,
    // and a resize changes how much there is left to scroll.
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const returnToTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.getElementById('help-center-content')?.focus({ preventScroll: true });
  };

  return (
    <button
      className={`help-center-to-top${isVisible ? ' is-visible' : ''}`}
      type="button"
      onClick={returnToTop}
      // Out of the tab order until it is on screen, so it is never a focus
      // stop the reader cannot see.
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
    >
      <span className="help-center-visually-hidden">Back to top</span>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m6 14 6-6 6 6" />
      </svg>
    </button>
  );
}
