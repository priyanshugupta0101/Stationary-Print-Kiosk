import { PrintJob } from '../types';

const STORAGE_KEY = 'stationery_customer_recent_jobs';

export function getRecentCustomerJobs(): PrintJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any mock/demo jobs or empty placeholder jobs
      return parsed.filter((j: PrintJob) => {
        if (!j || !j.otp || !j.id) return false;
        const idStr = String(j.id);
        if (idStr.startsWith('demo_') || idStr.startsWith('mock_')) return false;
        return true;
      });
    }
    return [];
  } catch (err) {
    console.warn('Failed to read recent customer jobs from storage:', err);
    return [];
  }
}

export function saveRecentCustomerJob(job: PrintJob): void {
  if (typeof window === 'undefined' || !job || !job.otp) return;
  const idStr = String(job.id || '');
  if (idStr.startsWith('demo_') || idStr.startsWith('mock_')) return;
  try {
    const existing = getRecentCustomerJobs();
    // Prepend job, avoid duplicate by id or otp
    const filtered = existing.filter((j) => j.id !== job.id && j.otp !== job.otp);
    const updated = [job, ...filtered].slice(0, 15); // keep latest 15 jobs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recent job to storage:', err);
  }
}

export function updateRecentJobStatuses(freshJobs: PrintJob[]): PrintJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRecentCustomerJobs();
    if (existing.length === 0) return [];

    const freshMap = new Map<string, PrintJob>();
    freshJobs.forEach((j) => {
      freshMap.set(j.id, j);
      if (j.otp) freshMap.set(String(j.otp), j);
    });

    const now = Date.now();
    // Keep only jobs that either exist on the server, or were created less than 45 seconds ago (in transit)
    const synced: PrintJob[] = [];

    for (const oldJob of existing) {
      const fresh = freshMap.get(oldJob.id) || (oldJob.otp ? freshMap.get(String(oldJob.otp)) : undefined);
      if (fresh) {
        synced.push({
          ...oldJob,
          ...fresh,
          settings: { ...oldJob.settings, ...fresh.settings },
          pricing: { ...oldJob.pricing, ...fresh.pricing },
        });
      } else {
        // If job does not exist on server, check if it was just submitted in the last 45s
        const jobCreatedAt = oldJob.createdAt ? new Date(oldJob.createdAt).getTime() : 0;
        if (now - jobCreatedAt < 45000) {
          synced.push(oldJob);
        }
        // Otherwise, it was deleted or reset from the server; do not keep fake or deleted jobs!
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
    return synced;
  } catch (err) {
    console.warn('Failed to update recent job statuses:', err);
    return getRecentCustomerJobs();
  }
}

export function updateRecentJobPaymentStatus(
  jobIdOrOtp: string,
  paymentStatus: 'paid' | 'unpaid',
  paymentMethod?: string
): PrintJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRecentCustomerJobs();
    const cleanTarget = String(jobIdOrOtp).trim();
    const updated = existing.map((j) => {
      if (j.id === cleanTarget || j.otp === cleanTarget) {
        return {
          ...j,
          paymentStatus,
          paymentMethod: (paymentMethod as any) || j.paymentMethod,
        };
      }
      return j;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to update job payment status in storage:', err);
    return getRecentCustomerJobs();
  }
}

export function clearRecentCustomerJobs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear recent customer jobs:', err);
  }
}
