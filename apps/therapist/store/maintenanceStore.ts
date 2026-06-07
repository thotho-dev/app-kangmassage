import { create } from 'zustand';

interface MaintenanceState {
  enabled: boolean;
  message: string;
  setMaintenance: (enabled: boolean, message: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  enabled: false,
  message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
  setMaintenance: (enabled, message) => set({ enabled, message }),
}));
