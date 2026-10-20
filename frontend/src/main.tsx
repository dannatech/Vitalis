import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// HashRouter, not BrowserRouter: GitHub Pages serves static files with no
// server-side rewrite, so a direct link or refresh on e.g. /patients/123
// would 404 under BrowserRouter. Hash-based routes (/#/patients/123) always
// resolve to index.html first.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
