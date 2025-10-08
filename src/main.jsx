import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Import global styles if any. Vite will bundle CSS imported inside components.

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);