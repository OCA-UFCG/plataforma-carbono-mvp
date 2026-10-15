'use client'

import { usePathname } from 'next/navigation'
import { Analytics } from '@/components/Analytics'
import { PASSWORD_RESET_PATH, SIGNUP_CONFIRMATION_PATH } from '@/lib/access/paths'

const PAGES_WITH_CODES = [SIGNUP_CONFIRMATION_PATH, PASSWORD_RESET_PATH]

/**
 * Google Analytics for the access pages, except the two whose URL carries a one-time code: GA's
 * page_view sends the full URL, and the confirmation and reset codes are credentials.
 */
export function AuthAnalytics() {
  const pathname = usePathname()
  if (PAGES_WITH_CODES.includes(pathname)) return null
  return <Analytics />
}
