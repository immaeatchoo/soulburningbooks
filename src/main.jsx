import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from './supabaseClient';

const rootElement = document.getElementById('root');
rootElement.style.width = '100%';

createRoot(rootElement).render(
  <StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <App />
    </SessionContextProvider>
  </StrictMode>,
)
