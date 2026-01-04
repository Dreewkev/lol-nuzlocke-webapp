export const PHASES = ['idle', 'rolling', 'locked', 'finished'] as const;
export type Phase = typeof PHASES[number];
