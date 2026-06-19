import React from 'react';
import { useLeads } from '../hooks/useLeads';
import { useOnboarding } from '../hooks/useOnboarding';
import { Sidebar } from '../components/Sidebar';
import { StatBar } from '../components/StatBar';
import { LiveSignalFeed } from '../components/LiveSignalFeed';
import { LeadCard } from '../components/LeadCard';
import { OnboardingModal } from '../components/OnboardingModal';
import { ToastContainer } from '../components/ToastContainer';
import { LoadingState, EmptyState, ErrorState, NoSearchResultsState } from '../components/EmptyStates';
import { Search, RotateCw, LogOut, Sparkles } from 'lucide-react';

interface DashboardPageProps {
  onBackToMarketing: () => void;
}

export function DashboardPage({ onBackToMarketing }: DashboardPageProps) {
  const {
    leads,
    loading,
    error,
    retryFetch,
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    selectedPriorities,
    togglePriority,
    selectedCategories,
    toggleCategory,
    resetFilters,
    totalLeadsCount,
    savedLeadsCount,
    contactedLeadsCount,
    toggleSaveLead,
    toggleContactedLead,
  } = useLeads();

  const {
    isOnboarded,
    step,
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding
  } = useOnboarding();

  // Monitored subreddits list shown in the navbar center
  const monitoredSubs = ['SaaS', 'smallbusiness', 'startups', 'marketing', 'shopify'];

  return (
    <div className="min-h-screen bg-carbon-dark text-white select-none relative flex flex-col font-sans">
      
      {/* 1. Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 glass-panel border-t-0 border-r-0 border-l-0 bg-carbon-dark/80 backdrop-blur-md z-40 flex items-center justify-between px-6 select-none">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse shadow-[0_0_6px_#C6FF34]" />
          <span className="font-mono text-sm font-bold tracking-wider text-white">
            SignalRadar
          </span>
        </div>

        {/* Monitored Subreddits Chips (Desktop Center) */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-mono text-mutedText uppercase tracking-widest mr-1">
            monitoring:
          </span>
          {monitoredSubs.map(sub => (
            <span key={sub} className="px-2.5 py-0.5 rounded-full glass-panel border-white/5 bg-white/[0.01] font-mono text-[9px] text-lime/90 font-medium">
              r/{sub}
            </span>
          ))}
        </div>

        {/* Connection status (Right side) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass-panel border-white/5 bg-white/[0.01] px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-lime pulse-dot" />
            <span className="font-mono text-[9px] text-lime font-bold tracking-widest">
              LIVE
            </span>
          </div>

          {/* Landing page exit link */}
          <button
            onClick={onBackToMarketing}
            className="p-1.5 rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white transition-colors duration-150"
            title="Landing Page"
          >
            <LogOut className="w-4 h-4 transform rotate-180" />
          </button>
        </div>
      </nav>

      {/* 2. Horizontal scrolling Signals Marquee Bar */}
      <div className="fixed top-16 left-0 right-0 z-30">
        <LiveSignalFeed />
      </div>

      {/* 3. Main Dashboard Layout content container */}
      <div className="flex-1 flex flex-col md:flex-row pt-[108px] h-screen overflow-hidden">
        
        {/* Sidebar Filters */}
        <Sidebar
          currentView={currentView}
          setView={setCurrentView}
          selectedPriorities={selectedPriorities}
          togglePriority={togglePriority}
          selectedCategories={selectedCategories}
          toggleCategory={toggleCategory}
          totalLeads={totalLeadsCount}
          savedCount={savedLeadsCount}
          contactedCount={contactedLeadsCount}
        />

        {/* Main Lead Feed Area (Scrollable container) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Stats Summary Bar */}
          <StatBar leads={leads} />

          {/* Lead list header with search query input */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 select-none">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase font-sans">
                {currentView === 'all' && "All Scored Signals"}
                {currentView === 'saved' && "Bookmarked Leads"}
                {currentView === 'contacted' && "Outreach History"}
              </h2>
              {/* Refresh indicator */}
              {!loading && (
                <button
                  onClick={retryFetch}
                  className="p-1.5 rounded-full glass-panel border-white/5 text-gray-400 hover:text-white transition-colors"
                  title="Reload Leads"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Keyword / Subreddit text search */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords or subreddits..."
                className="w-full pl-9 pr-4 py-2 text-xs font-sans rounded-lg glass-panel bg-transparent border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-lime/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 hover:text-white uppercase font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Conditional rendering for Loader, Error, Empty list, or Cards */}
          <div className="space-y-4 pt-2">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} onRetry={retryFetch} />
            ) : leads.length === 0 ? (
              searchQuery ? (
                <NoSearchResultsState onClear={resetFilters} />
              ) : currentView === 'saved' ? (
                <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-8">
                  <span className="text-xl block mb-4">🔖</span>
                  <h3 className="text-base font-semibold mb-1">No saved leads yet</h3>
                  <p className="text-xs text-mutedText leading-relaxed">
                    Bookmark high-intent leads from the all leads feed to follow up or draft replies later.
                  </p>
                </div>
              ) : currentView === 'contacted' ? (
                <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-8">
                  <span className="text-xl block mb-4">📞</span>
                  <h3 className="text-base font-semibold mb-1">No outreach history</h3>
                  <p className="text-xs text-mutedText leading-relaxed">
                    Leads you mark as contacted will show up here to help you track your sales conversion pipeline.
                  </p>
                </div>
              ) : (
                <EmptyState onRefresh={retryFetch} />
              )
            ) : (
              // Lead cards list grid layout
              <div className="space-y-4">
                {leads.map((lead) => (
                  <LeadCard
                    key={lead.post_id}
                    lead={lead}
                    isSaved={lead.status === 'saved'}
                    isContacted={lead.status === 'contacted'}
                    contactedAt={null}
                    onToggleSave={() => toggleSaveLead(lead.post_id)}
                    onToggleContacted={() => toggleContactedLead(lead.post_id)}
                    fetchLeads={retryFetch}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Onboarding Wizard Modal Overlay */}
      {!isOnboarded && (
        <OnboardingModal
          step={step}
          onNext={() => {
            if (step === 3) {
              completeOnboarding();
            } else {
              nextStep();
            }
          }}
          onPrev={prevStep}
          onSkip={completeOnboarding}
        />
      )}

      {/* Toast popup notifications queue wrapper */}
      <ToastContainer />

    </div>
  );
}
export default DashboardPage;
