export const KIOSK_CART_QUEUE_KEY = 'kiosk-cart-queue';

function readQueue(): number[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(KIOSK_CART_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is number => typeof value === 'number');
    }
  } catch (error) {
    console.error('Failed to parse kiosk cart queue from localStorage', error);
  }

  return [];
}

export function queueKioskCartItem(itemId: number): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const current = readQueue();
  current.push(itemId);
  try {
    window.localStorage.setItem(KIOSK_CART_QUEUE_KEY, JSON.stringify(current));
    return true;
  } catch (error) {
    console.error('Failed to persist kiosk cart queue', error);
    return false;
  }
}

export function consumeQueuedKioskCartItems(): number[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const queued = readQueue();
  if (queued.length === 0) {
    return [];
  }

  window.localStorage.removeItem(KIOSK_CART_QUEUE_KEY);
  return queued;
}
