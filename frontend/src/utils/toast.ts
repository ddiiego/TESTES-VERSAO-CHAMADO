export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  title?: string;
  type: ToastType;
  onClick?: () => void;
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 0;

const notify = () => {
  const copy = [...items];
  listeners.forEach(l => l(copy));
};

const dismiss = (id: number) => {
  items = items.filter(t => t.id !== id);
  notify();
};

const show = (
  message: string,
  options?: { title?: string; type?: ToastType; onClick?: () => void }
) => {
  const id = nextId++;
  items = [{ id, message, title: options?.title, type: options?.type ?? 'info', onClick: options?.onClick }, ...items];
  notify();
  return id;
};

const dismissAll = () => {
  items = [];
  notify();
};

export const toast = {
  show,
  dismiss,
  dismissAll,
  info:    (message: string, title?: string, onClick?: () => void) => show(message, { title, type: 'info',    onClick }),
  success: (message: string, title?: string, onClick?: () => void) => show(message, { title, type: 'success', onClick }),
  error:   (message: string, title?: string, onClick?: () => void) => show(message, { title, type: 'error',   onClick }),
  warning: (message: string, title?: string, onClick?: () => void) => show(message, { title, type: 'warning', onClick }),
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
