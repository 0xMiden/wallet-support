import { FeedbackPage } from './feedback/FeedbackPage';
import { AllTopics } from './help-center/AllTopics';
import { HelpCenter } from './help-center/HelpCenter';
import { PublicShell } from './help-center/PublicShell';
import { parsePublicRoute } from './help-center/publicRoute';

export default function App() {
  const route = parsePublicRoute(window.location.pathname);
  if (route === 'not-found') return <main className="public-not-found"><h1>Page not found</h1><a href="/">Return to the Help Center</a></main>;
  return <PublicShell active={route}>{route === 'topics' ? <AllTopics /> : route === 'feedback' ? <FeedbackPage /> : <HelpCenter />}</PublicShell>;
}
