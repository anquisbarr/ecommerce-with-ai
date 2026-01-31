/**
 * Utility functions for device detection
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for touch support and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  return isMobileUA || (hasTouch && isSmallScreen);
}

export function supportsMediaDevices(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
