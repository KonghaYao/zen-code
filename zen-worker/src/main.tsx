import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from '@codegraph/union-client';
import { configStore } from './store';
import { fetchAllowedModels } from './utils/api';
import App from './App';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SettingsProvider
          manager={configStore}
          get_allowed_models={fetchAllowedModels}
        >
          <ChatProvider
            defaultAgent="code"
            apiUrl={import.meta.env.VITE_API_URL || new URL('/api/langgraph', location.href).toString()}
            defaultHeaders={{}}
            withCredentials={false}
            showHistory={true}
            showGraph={false}
            onInitError={(error, currentAgent) => {
              console.error(`Failed to initialize ${currentAgent}:`, error);
            }}
          >
            <App />
          </ChatProvider>
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
