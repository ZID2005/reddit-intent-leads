import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLeads } from '../hooks/useLeads';
import { useFilters } from '../hooks/useFilters';
import { useOnboarding } from '../hooks/useOnboarding';
import { Sidebar } from '../components/Sidebar';
import { StatBar } from '../components/StatBar';
import { LiveSignalFeed } from '../components/LiveSignalFeed';
import { LeadCard } from '../components/LeadCard';
import { LeadDetailsDrawer } from '../components/LeadDetailsDrawer';
import { OnboardingModal } from '../components/OnboardingModal';
import { ToastContainer } from '../components/ToastContainer';
import { LoadingState, EmptyState, ErrorState, NoSearchResultsState } from '../components/EmptyStates';
import { SearchBar } from '../components/filters/SearchBar';
import { SortDropdown } from '../components/filters/SortDropdown';
import { ActiveFilterChips } from '../components/filters/ActiveFilterChips';
import { ResultCounter } from '../components/filters/ResultCounter';
import { RotateCw, LogOut } from 'lucide-react';
import { Lead } from '../types/lead';
import { AnalyticsPage } from './AnalyticsPage';

interface DashboardPageProps {
  onBackToMarketing: () => void;
}

export function DashboardPage({ onBackToMarketing }: DashboardPageProps) {
  // ── Data layer ──────────────────────────────────────────────────────────────
  const {
    allLeads,
    loading,
    error,
    retryFetch,
    currentView,
    setCurrentView,
    totalLeadsCount,
    savedLeadsCount,
    contactedLeadsCount,
    toggleSaveLead,
    toggleContactedLead,
  } = useLeads();

  // ── Filter layer (in-memory, no re-fetch) ───────────────────────────────────
  const {
    filters,
    setSearchQuery,
    togglePriority,
    toggleCategory,
    toggleSubreddit,
    setIntentRange,
    setConfidenceRange,
    setSortKey,
    resetFilters,
    availableSubreddits,
    filteredLeads,
    filteredCount,
    hasActiveFilters,
    activeChips,
    removeChip,
  } = useFilters(allLeads);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  const { isOnboarded, step, nextStep, prevStep, completeOnboarding } = useOnboarding();

  // ── Drawer ──────────────────────────────────────────────────────────────────
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (lead: Lead) => { setDrawerLead(lead); setDrawerOpen(true); };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerLead(null), 350);
  };

  // Monitored subreddits shown in navbar
  const monitoredSubs = ['SaaS', 'smallbusiness', 'startups', 'marketing', 'shopify'];

  // Detect if search/filter produced zero results from a non-empty dataset
  const hasLeadsInDb = allLeads.length > 0;
  const noResults = !loading && !error && filteredCount === 0;
  const noResultsFromFilter = noResults && hasActiveFilters && hasLeadsInDb;

  return (
    <div className="min-h-screen bg-carbon-dark text-white select-none relative flex flex-col font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 h-16 glass-panel border-t-0 border-r-0 border-l-0 bg-carbon-dark/80 backdrop-blur-md z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse shadow-[0_0_6px_#C6FF34]" />
          <span className="font-mono text-sm font-bold tracking-wider text-white">SignalRadar</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-mono text-mutedText uppercase tracking-widest mr-1">monitoring:</span>
          {monitoredSubs.map(sub => (
            <span key={sub} className="px-2.5 py-0.5 rounded-full glass-panel border-white/5 bg-white/[0.01] font-mono text-[9px] text-lime/90 font-medium">
              r/{sub}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass-panel border-white/5 bg-white/[0.01] px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-lime pulse-dot" />
            <span className="font-mono text-[9px] text-lime font-bold tracking-widest">LIVE</span>
          </div>
          <button
            onClick={onBackToMarketing}
            className="p-1.5 rounded-lg glass-panel border-white/5 text-gray-400 hover:text-white transition-colors duration-150"
            title="Landing Page"
          >
            <LogOut className="w-4 h-4 transform rotate-180" />
          </button>
        </div>
      </nav>

      {/* ── Live signal marquee ─────────────────────────────────────────────── */}
      <div className="fixed top-16 left-0 right-0 z-30">
        <LiveSignalFeed />
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row pt-[108px] h-screen overflow-hidden">

        {/* Sidebar with all filter props */}
        <Sidebar
          currentView={currentView}
          setView={setCurrentView}
          totalLeads={totalLeadsCount}
          savedCount={savedLeadsCount}
          contactedCount={contactedLeadsCount}
          filters={filters}
          availableSubreddits={availableSubreddits}
          togglePriority={togglePriority}
          toggleCategory={toggleCategory}
          toggleSubreddit={toggleSubreddit}
          setIntentRange={setIntentRange}
          setConfidenceRange={setConfidenceRange}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />

        {/* ── Main Feed / Analytics Content ─────────────────────────────────── */}
        {currentView === 'analytics' ? (
          <AnalyticsPage
            leads={allLeads}
            loading={loading}
            error={error}
            retryFetch={retryFetch}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">

            {/* Stats bar */}
            <StatBar leads={allLeads} />

            {/* ── Toolbar: header + search + sort ─────────────────────────────── */}
            <div className="space-y-3 pt-2">
              {/* Row 1: title + refresh + sort */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-wider text-white uppercase font-sans">
                    {currentView === 'all'       && 'All Scored Signals'}
                    {currentView === 'saved'     && 'Bookmarked Leads'}
                    {currentView === 'contacted' && 'Outreach History'}
                  </h2>
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

                <div className="flex items-center gap-2">
                  <ResultCounter filtered={filteredCount} total={allLeads.length} loading={loading} />
                  <SortDropdown value={filters.sortKey} onChange={setSortKey} />
                </div>
              </div>

              {/* Row 2: search bar */}
              <SearchBar value={filters.searchQuery} onChange={setSearchQuery} />

              {/* Row 3: active filter chips */}
              <AnimatePresence>
                {activeChips.length > 0 && (
                  <ActiveFilterChips
                    chips={activeChips}
                    onRemove={removeChip}
                    onClearAll={resetFilters}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ── Lead cards ─────────────────────────────────────────────────── */}
            <div className="space-y-3 pb-8">
              {loading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} onRetry={retryFetch} />
              ) : noResultsFromFilter ? (
                <NoSearchResultsState onClear={resetFilters} />
              ) : noResults ? (
                currentView === 'saved' ? (
                  <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-8">
                    <span className="text-xl block mb-4">🔖</span>
                    <h3 className="text-base font-semibold mb-1">No saved leads yet</h3>
                    <p className="text-xs text-mutedText leading-relaxed">
                      Bookmark high-intent leads to follow up later.
                    </p>
                  </div>
                ) : currentView === 'contacted' ? (
                  <div className="glass-panel p-12 text-center rounded-2xl max-w-md mx-auto my-8">
                    <span className="text-xl block mb-4">📞</span>
                    <h3 className="text-base font-semibold mb-1">No outreach history</h3>
                    <p className="text-xs text-mutedText leading-relaxed">
                      Leads you mark as contacted appear here.
                    </p>
                  </div>
                ) : (
                  <EmptyState onRefresh={retryFetch} />
                )
              ) : (
                filteredLeads.map(lead => (
                  <LeadCard
                    key={lead.post_id}
                    lead={lead}
                    isSaved={lead.status === 'saved'}
                    isContacted={lead.status === 'contacted'}
                    contactedAt={null}
                    onToggleSave={() => toggleSaveLead(lead.post_id)}
                    onToggleContacted={() => toggleContactedLead(lead.post_id)}
                    fetchLeads={retryFetch}
                    onOpenDrawer={openDrawer}
                  />
                ))
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Lead Details Drawer ─────────────────────────────────────────────── */}
      <LeadDetailsDrawer
        lead={drawerLead}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        isSaved={drawerLead?.status === 'saved'}
        isContacted={drawerLead?.status === 'contacted'}
        onToggleSave={() => drawerLead && toggleSaveLead(drawerLead.post_id)}
        onToggleContacted={() => drawerLead && toggleContactedLead(drawerLead.post_id)}
      />

      {/* ── Onboarding ──────────────────────────────────────────────────────── */}
      {!isOnboarded && (
        <OnboardingModal
          step={step}
          onNext={() => { if (step === 3) completeOnboarding(); else nextStep(); }}
          onPrev={prevStep}
          onSkip={completeOnboarding}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default DashboardPage;
