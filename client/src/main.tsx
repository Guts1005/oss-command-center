import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './styles/tokens.css';
import 'lenis/dist/lenis.css';

axios.defaults.withCredentials = true;

// Intercept 401 Unauthorized responses to prevent stale zombie session states
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadCachedUser = Boolean(localStorage.getItem('oss_user_cached'));
      localStorage.removeItem('oss_user_cached');
      if (hadCachedUser) {
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
