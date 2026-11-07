export interface TrialCalculationResult {
  isTrial: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  totalDurationDays: number;
  progressPercent: number;
}

export function calculateTrialRemaining(shop: {
  isTrial?: boolean;
  plan?: string;
  trialStartDate?: string;
  trialEndsAt?: string;
  trialDurationDays?: number;
  createdAt?: string;
}): TrialCalculationResult {
  const isTrial = Boolean(
    shop.isTrial || shop.plan === 'four_day_trial' || shop.plan === 'free_trial'
  );

  if (!isTrial) {
    return {
      isTrial: false,
      isTrialExpired: false,
      daysLeft: 0,
      hoursLeft: 0,
      totalDurationDays: 0,
      progressPercent: 100,
    };
  }

  const durationDays = shop.plan === 'four_day_trial' ? 4 : (shop.trialDurationDays || 7);
  const now = Date.now();

  const startMs = shop.trialStartDate
    ? new Date(shop.trialStartDate).getTime()
    : (shop.createdAt ? new Date(shop.createdAt).getTime() : now);

  const endMs = shop.trialEndsAt
    ? new Date(shop.trialEndsAt).getTime()
    : startMs + durationDays * 24 * 60 * 60 * 1000;

  const msLeft = endMs - now;
  const isExpired = msLeft <= 0;

  // Real-time remaining days calculation:
  // Elapsed time = now - startMs
  // If 2 days elapsed on a 4-day plan, days remaining = 4 - 2 = 2 days left
  const elapsedMs = Math.max(0, now - startMs);
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const daysLeft = isExpired ? 0 : Math.max(0, durationDays - elapsedDays);
  const hoursLeft = isExpired ? 0 : Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));

  const totalMs = durationDays * 24 * 60 * 60 * 1000;
  const progressPercent = isExpired ? 100 : Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

  return {
    isTrial: true,
    isTrialExpired: isExpired,
    daysLeft,
    hoursLeft,
    totalDurationDays: durationDays,
    progressPercent,
  };
}
