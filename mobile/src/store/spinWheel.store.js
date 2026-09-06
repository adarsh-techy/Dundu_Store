import { create } from 'zustand';

const useSpinWheelStore = create((set) => ({
  isOpen: false,
  isForced: false,
  forceTriggerCount: 0,
  openSpinWheel: () => set((state) => ({ isOpen: true, isForced: true, forceTriggerCount: state.forceTriggerCount + 1 })),
  closeSpinWheel: () => set({ isOpen: false, isForced: false }),
}));

export default useSpinWheelStore;
