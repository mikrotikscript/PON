'use client';

export function recordToolUse() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('netforge:tool-use'));
  }
}
