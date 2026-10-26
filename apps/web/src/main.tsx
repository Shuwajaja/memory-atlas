import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/inter.css';
import './styles/reference.css';
import './styles/tokens.css';

const root = document.getElementById('root');
if (!root) throw new Error('root fehlt');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
