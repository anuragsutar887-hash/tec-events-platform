import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

// ─── Site Data Reset: Wipe all legacy cached accounts, sessions, and passwords ───
const SITE_DATA_EPOCH = 'tec_epoch_2026_clean_v1';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('tec_site_epoch') !== SITE_DATA_EPOCH) {
      const smtpConfig = localStorage.getItem('tec_smtp_config');
      localStorage.clear();
      sessionStorage.clear();
      // Preserve SMTP config so notification email delivery stays working
      if (smtpConfig) {
        localStorage.setItem('tec_smtp_config', smtpConfig);
      }
      localStorage.setItem('tec_site_epoch', SITE_DATA_EPOCH);
      signOut(auth).catch(() => {});
    }
  } catch (err) {
    console.warn('Storage epoch initialization note:', err);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
