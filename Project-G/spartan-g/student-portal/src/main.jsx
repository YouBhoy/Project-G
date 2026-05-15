import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { CalendarProvider } from './context/CalendarContext.jsx';
import './styles.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-google-client-id';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <CalendarProvider>
        <App />
      </CalendarProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
