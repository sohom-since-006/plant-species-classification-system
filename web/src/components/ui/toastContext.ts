import { createContext } from 'react';

export type Toast = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
};

export type ToastContextType = {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);

