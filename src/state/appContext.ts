import { createContext, useContext } from 'react';

export type ModeId = 'explore' | 'builder' | 'hunt' | 'quiz' | 'lab' | 'collection' | 'tutor';

export interface AppApi {
  mode: ModeId;
  setMode: (m: ModeId) => void;
  openElement: (z: number) => void;
  selectedZ: number | null;
  toast: (text: string) => void;
  webgl: boolean;
  /** Set when the tutor should open with a question about an element */
  askTutorAbout: (z: number) => void;
  tutorSeed: { z: number; n: number } | null;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext missing');
  return ctx;
}
