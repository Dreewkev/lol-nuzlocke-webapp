export const PHASES = ['idle', 'rolling', 'locked', 'summary', 'finished'] as const;
export type Phase = typeof PHASES[number];
