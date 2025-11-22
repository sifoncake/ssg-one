/**
 * Device fingerprinting utility for magic link authentication
 * Creates a simple fingerprint based on user agent and screen size
 */

export function generateFingerprint(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const userAgent = window.navigator.userAgent;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const colorDepth = window.screen.colorDepth;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Combine all factors into a fingerprint string
  const fingerprintData = `${userAgent}|${screenResolution}|${colorDepth}|${timezone}`;

  // Create a simple hash from the fingerprint data
  return btoa(fingerprintData);
}

export function saveFingerprint(): string {
  const fingerprint = generateFingerprint();
  if (fingerprint) {
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  return fingerprint;
}

export function getStoredFingerprint(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('device_fingerprint');
}

export function getFingerprintOrCreate(): string {
  const stored = getStoredFingerprint();
  if (stored) {
    return stored;
  }
  return saveFingerprint();
}
