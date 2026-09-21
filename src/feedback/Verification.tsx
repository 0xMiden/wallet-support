import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
interface Turnstile {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      appearance: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    }
  ) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let loader: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!loader)
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.dataset.breadTurnstile = 'true';
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        loader = undefined;
        reject(new Error('Verification unavailable'));
      };
      document.head.append(script);
    });
  return loader;
}
/** Explicit rendering survives StrictMode and remounts with a fresh token after each submission. */
export function Verification({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    setToken('');
    setFailed(false);
    if (!siteKey) return;
    void loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widget = window.turnstile.render(container.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: setToken,
          'expired-callback': () => setToken(''),
          'error-callback': () => {
            setToken('');
            setFailed(true);
          }
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [siteKey, attempt]);
  return (
    <div className="feedback-turnstile" role="group" aria-label="Human verification">
      <div ref={container} data-sitekey={siteKey} className="cf-turnstile" />
      <input type="hidden" name="bread-verification-token" value={token} />
      {failed && (
        <div role="alert" className="text-sm text-destructive">
          Verification couldn’t load. Check your connection.
          <Button type="button" variant="link" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
