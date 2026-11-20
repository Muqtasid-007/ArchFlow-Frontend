import { create } from 'zustand';

let nextId = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push(message, variant = 'info') {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toastItem) => toastItem.id !== id) }));
    }, 4200);
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((toastItem) => toastItem.id !== id) }));
  },
}));

const push = (variant) => (message) => useToastStore.getState().push(message, variant);

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
};
