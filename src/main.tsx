import React from 'react';
import { setNonce } from 'get-nonce';
import ReactDOM from 'react-dom/client';

import App from './App';
import { BrowserRouter } from 'react-router';
import { applyMotionVariables } from './lib/animation-css';
import './design-system.css';
import { MotionConfig } from 'framer-motion';

const styleNonce = document.querySelector<HTMLMetaElement>('meta[name="style-nonce"]')?.content;
if (styleNonce) setNonce(styleNonce);
applyMotionVariables();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      {/* These eager routes and URL-backed inputs commit synchronously. */}
      <BrowserRouter useTransitions={false}>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </React.StrictMode>
);
