import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './styles/tokens.css';
import 'lenis/dist/lenis.css';

axios.defaults.withCredentials = true;

// Attach Bearer token from localStorage if present as resilient fallback
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('oss_session_token');
  if (token && config.headers) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Intercept 401 Unauthorized responses to prevent stale zombie session states
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = Boolean(localStorage.getItem('oss_session_token'));
      localStorage.removeItem('oss_session_token');
      localStorage.removeItem('oss_user_cached');
      if (hadToken) {
        window.dispatchEvent(
          new CustomEvent('oss:auth:unauthorized', {
            detail: { message: error.response?.data?.error || 'Session expired. Please sign in again.' },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
