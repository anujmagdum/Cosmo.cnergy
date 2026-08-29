import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { MailQueueProvider } from './context/MailQueueContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MailQueueProvider>
        <App />
      </MailQueueProvider>
    </BrowserRouter>
  </React.StrictMode>
);
