import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuizConfig } from '../domain/types';
import { DEFAULT_QUESTION_COUNT } from '../app/constants';

interface SettingsState {
  soundOn: boolean;
  lastConfig: QuizConfig;
  setSoundOn(on: boolean): void;
  setLastConfig(config: QuizConfig): void;
}

export const DEFAULT_CONFIG: QuizConfig = {
  mode: 'multiple-choice',
  kinds: ['country'],
  region: 'all',
  labels: 'none',
  questionCount: DEFAULT_QUESTION_COUNT,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      lastConfig: DEFAULT_CONFIG,
      setSoundOn: (soundOn) => set({ soundOn }),
      setLastConfig: (lastConfig) => set({ lastConfig }),
    }),
    { name: 'geo.settings.v1' },
  ),
);
