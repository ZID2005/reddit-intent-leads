import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PreferencesProvider } from './hooks/usePreferences'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
