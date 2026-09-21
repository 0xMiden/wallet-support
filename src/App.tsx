import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { FeedbackPage } from './feedback/FeedbackPage';
import { AllTopics } from './help-center/AllTopics';
import { HelpCenter } from './help-center/HelpCenter';
import { PublicShell } from './help-center/PublicShell';
import { parsePublicRoute } from './help-center/publicRoute';

export default function App() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useLayoutEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  const route = parsePublicRoute(location.pathname);
  if (route === 'not-found')
    return (
      <main className="public-not-found">
        <h1>Page not found</h1>
        <Link to="/">Return to the Help Center</Link>
      </main>
    );
  return (
    <PublicShell active={route}>
      {route === 'topics' ? (
        <AllTopics />
      ) : route === 'feedback' ? (
        <FeedbackPage />
      ) : (
        <HelpCenter />
      )}
    </PublicShell>
  );
}
