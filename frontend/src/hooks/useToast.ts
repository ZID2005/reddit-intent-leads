import { useState, useCallback, useEffect } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  duration?: number;
  type?: 'lead' | 'system' | 'success' | 'info';
  message?: string;
}

// Global list of active toasts and listeners to sync across components
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let activeToasts: ToastItem[] = [];

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(activeToasts);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => {
      setToasts(newToasts);
    };
    toastListeners.push(listener);
    setToasts([...activeToasts]);

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    activeToasts = activeToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener([...activeToasts]));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { ...toast, id };
    activeToasts = [...activeToasts, item];
    toastListeners.forEach(listener => listener([...activeToasts]));

    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, [removeToast]);

  return {
    toasts,
    addToast,
    removeToast
  };
}
export type { ToastItem as ToastType };
