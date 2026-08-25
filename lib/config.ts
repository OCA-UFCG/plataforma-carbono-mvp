// The map requires a session. The private layouts redirect visitors to the
// login, so authenticated users can navigate straight to this destination.
export const MAPA_URL = process.env.NEXT_PUBLIC_MAPA_URL ?? "/mapa";

// Google Analytics measurement ID (GA4, format "G-XXXXXXXXXX"). Absent in local
// development by default; without it the <Analytics> component renders nothing.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
