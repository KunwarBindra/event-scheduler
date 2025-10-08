import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Import global styles if any (Tailwind, etc.). Since this code uses plain
// CSS files within each component, there is no global import here.

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);