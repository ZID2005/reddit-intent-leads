import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  return (
    <div className="min-h-screen bg-carbon-dark text-white select-none">
      {view === 'landing' ? (
        <LandingPage onStartMonitoring={() => setView('dashboard')} />
      ) : (
        <DashboardPage onBackToMarketing={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
