export const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
export type Role = typeof ROLES[number];
