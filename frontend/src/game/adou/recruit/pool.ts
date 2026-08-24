/**
 * 招募系统 - 池规则
 */
import type { RecruitPoolId, RecruitPoolRule } from "./types";

export const RECRUIT_POOL_RULES: Record<RecruitPoolId, RecruitPoolRule> = {
  basic: { resource: "gold", cost: 100, epicPity: 10, legendPity: 50 },
  elite: { resource: "eliteItem", cost: 1, epicPity: 10, legendPity: 40 },
  legend: { resource: "legendScroll", cost: 1, epicPity: 10, legendPity: 30 },
  targeted: { resource: "recruitTicket", cost: 1, epicPity: 1, legendPity: 1 },
};
