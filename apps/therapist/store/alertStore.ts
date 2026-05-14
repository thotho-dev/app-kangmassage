import { create } from 'zustand';

interface AlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
}

interface AlertState {
  visible: boolean;
  options: AlertOptions | null;
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  options: null,
  showAlert: (options) => set({ visible: true, options }),
  hideAlert: () => set({ visible: false, options: null }),
}));

export const CustomAlertTrigger = {
  show: (options: AlertOptions) => useAlertStore.getState().showAlert(options),
  hide: () => useAlertStore.getState().hideAlert(),
};
