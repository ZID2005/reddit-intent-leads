import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCw, BarChart2 } from 'lucide-react';
import { Lead } from '../types/lead';
import { AnalyticsFilters, TimeFilterType } from '../components/analytics/AnalyticsFilters';
import { AnalyticsCards } from '../components/analytics/AnalyticsCards';
import { AnalyticsCharts } from '../components/analytics/AnalyticsCharts';
import { TopSubredditsTable } from '../components/analytics/TopSubredditsTable';
import { SchedulerStatusCard } from '../components/analytics/SchedulerStatusCard';
import { LoadingState, ErrorState } from '../components/EmptyStates';

interface AnalyticsPageProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  retryFetch: () => void;
}

export function AnalyticsPage({ leads, loading, error, retryFetch }: AnalyticsPageProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

  // In-memory date filtering based on selection
  const filteredLeads = useMemo(() => {
    if (timeFilter === 'all') return leads;

    const now = new Date();
    const cutoff = new Date();

    if (timeFilter === 'today') {
      cutoff.setHours(0, 0, 0, 0); // Start of today (local time)
    } else if (timeFilter === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeFilter === '30days') {
      cutoff.setDate(now.getDate() - 30);
    }

    return leads.filter(l => {
      const dateVal = l.created_at || l.processed_at;
      if (!dateVal) return false;
      const leadDate = new Date(dateVal);
      return leadDate >= cutoff;
    });
  }, [leads, timeFilter]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <div className="h-10 w-48 bg-white/5 rounded shimmer" />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex items-center justify-center">
        <ErrorState message={error} onRetry={retryFetch} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 select-none bg-carbon-dark/30">
      
      {/* Header section with page title and time filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-lime">
            <BarChart2 className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-wider uppercase font-mono">
              Analytics Engine
            </h1>
            {!loading && (
              <button
                onClick={retryFetch}
                className="p-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors duration-150 ml-1"
                title="Refresh Analytics Data"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-mutedText max-w-xl">
            Real-time aggregate performance metrics and visual trends across monitored channels.
          </p>
        </div>

        {/* Time Filters component */}
        <AnalyticsFilters value={timeFilter} onChange={setTimeFilter} />
      </div>

      {/* Scheduler Status Card */}
      <SchedulerStatusCard />

      {/* Metric Cards Grid */}
      <AnalyticsCards leads={filteredLeads} />

      {/* SVG Interactive Charts */}
      <AnalyticsCharts leads={filteredLeads} />

      {/* Top Subreddits Table */}
      <div className="pt-2">
        <TopSubredditsTable leads={filteredLeads} />
      </div>
      
    </div>
  );
}
export default AnalyticsPage;

