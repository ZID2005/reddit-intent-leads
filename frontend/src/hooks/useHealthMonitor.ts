import { useState, useEffect, useRef } from 'react';
import { useToast } from './useToast';

const SCHEDULER_API_URL =
  import.meta.env.VITE_SCHEDULER_API_URL || 'http://localhost:8000';

export interface HealthState {
  api: boolean;
  scheduler: boolean;
  db: boolean;
  groq: boolean;
  uptime: number;
}

export function useHealthMonitor() {
  const [health, setHealth] = useState<HealthState>({
    api: false,
    scheduler: false,
    db: false,
    groq: false,
    uptime: 0,
  });

  const { addToast } = useToast();
  const prevSchedulerState = useRef<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${SCHEDULER_API_URL}/health`);
        if (!response.ok) {
          throw new Error('Health check responded with error status');
        }
        
        const data = await response.json();
        
        const isSchedulerRunning = !!data.scheduler?.running;
        const isDbConnected = !!data.database?.connected;
        const isGroqConfigured = !!data.groq?.configured;
        const uptime = Number(data.uptime_seconds || 0);

        setHealth({
          api: true,
          scheduler: isSchedulerRunning,
          db: isDbConnected,
          groq: isGroqConfigured,
          uptime,
        });

        // Trigger alert when scheduler goes offline (including on initial load)
        if (prevSchedulerState.current !== false && !isSchedulerRunning) {
          addToast({
            title: "SignalRadar Scheduler has stopped running! Lead parsing is paused.",
            subreddit: "system_warning",
            score: 0,
            duration: 6000,
          });
        }
        prevSchedulerState.current = isSchedulerRunning;

      } catch (err) {
        setHealth({
          api: false,
          scheduler: false,
          db: false,
          groq: false,
          uptime: 0,
        });

        // Trigger alert only when API first goes offline
        if (prevSchedulerState.current !== false) {
          addToast({
            title: "SignalRadar Backend API is offline! Cannot fetch system status.",
            subreddit: "system_warning",
            score: 0,
            duration: 6000,
          });
        }
        prevSchedulerState.current = false;
      }
    };

    // Run health check initially
    checkHealth();

    // Poll every 60 seconds
    const interval = setInterval(checkHealth, 60_000);

    return () => clearInterval(interval);
  }, [addToast]);

  return health;
}
