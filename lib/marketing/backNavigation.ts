// Whether the publication page's "Voltar" should step back through history
// (returning the visitor where they were, with its scroll position) instead of
// following its link to /comunicacao. Pure, so it is tested without a browser;
// BackButton.tsx feeds it the live values.
export type ArrivalContext = {
  // The URL of the document the browser first loaded in this tab session
  // (performance's navigation entry), which soft navigations do not replace.
  initialUrl: string | null
  currentUrl: string
  referrer: string
  historyLength: number
}

const LOGIN_PATH = '/login'

function parse(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function shouldStepBack({ initialUrl, currentUrl, referrer, historyLength }: ArrivalContext): boolean {
  if (historyLength <= 1) return false

  const current = parse(currentUrl)
  if (!current) return false

  // A soft navigation (next/link) keeps the first document's entry, so its URL
  // differs from the page now shown and the entry before this one is ours.
  // The login page is the exception: it replaces its own entry on the way in.
  if (initialUrl && initialUrl !== currentUrl) {
    return parse(initialUrl)?.pathname !== LOGIN_PATH
  }

  // A full load: history.back() stays on the site only when this origin sent
  // the visitor, and not through the login redirect, whose entry is gone.
  const from = referrer ? parse(referrer) : null
  return from !== null && from.origin === current.origin && from.pathname !== LOGIN_PATH
}
