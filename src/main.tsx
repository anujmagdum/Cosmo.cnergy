import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { MailQueueProvider } from './context/MailQueueContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <MailQueueProvider>
          <App />
        </MailQueueProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
