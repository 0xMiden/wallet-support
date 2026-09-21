import React from 'react';
import { setNonce } from 'get-nonce';
import ReactDOM from 'react-dom/client';

import App from './App';
import './design-system.css';
import { MotionConfig } from 'motion/react';

const styleNonce = document.querySelector<HTMLMetaElement>('meta[name="style-nonce"]')?.content;
if (styleNonce) setNonce(styleNonce);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>
);
