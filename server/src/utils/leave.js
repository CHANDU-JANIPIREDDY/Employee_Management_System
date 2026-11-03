import { LEAVE_QUOTAS } from './constants.js';

export function shapeBalance(balance) {
  if (!balance) return null;
  const pack = (total, used) => ({
    total,
    used,
    remaining: Math.max(0, total - used),
  });
  return {
    casual: pack(balance.casualTotal ?? LEAVE_QUOTAS.casual, balance.casualUsed ?? 0),
    sick: pack(balance.sickTotal ?? LEAVE_QUOTAS.sick, balance.sickUsed ?? 0),
    earned: pack(balance.earnedTotal ?? LEAVE_QUOTAS.earned, balance.earnedUsed ?? 0),
  };
}

export const LEAVE_FIELDS = {
  casual: ['casualUsed', 'casualTotal'],
  sick: ['sickUsed', 'sickTotal'],
  earned: ['earnedUsed', 'earnedTotal'],
};
