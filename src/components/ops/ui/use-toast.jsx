import { useState, useCallback } from "react";

let toastCount = 0;
const listeners = new Set();
let toastsState = [];

function generateId() {
  toastCount += 1;
  return `toast-${toastCount}-${Date.now()}`;
}

function notifyListeners() {
  listeners.forEach((listener) => listener(toastsState));
}

export function toast({ title, description, variant = "default", duration = 4000 }) {
  const id = generateId();
  const newToast = { id, title, description, variant };

  toastsState = [newToast, ...toastsState].slice(0, 5); // Max 5 toasts
  notifyListeners();

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

export function dismissToast(id) {
  toastsState = toastsState.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [toasts, setToasts] = useState(toastsState);

  const subscribe = useCallback(() => {
    const listener = (newToasts) => setToasts([...newToasts]);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  });

  return {
    toasts,
    toast,
    dismiss: dismissToast,
  };
}