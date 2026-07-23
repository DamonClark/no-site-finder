import { track } from '@vercel/analytics';

export const CALENDLY_URL = 'https://calendly.com/motivware/discovery-call';

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export function openCalendlyPopup() {
  track('calendly_clicked');
  if (window.Calendly) {
    window.Calendly.initPopupWidget({ url: CALENDLY_URL });
  } else {
    window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
  }
}
