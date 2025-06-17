import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("quill-theme") || "coffee",
  setTheme: (theme) => {
    localStorage.setItem("quill-theme", theme);
    set({ theme });
  },
}));
