'use client'

import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { storyScript, type StoryScript } from '@/config/territorios/storyScript'
import type { TerritoriosCopy } from '@/lib/content/territorios'

const StoryScriptContext = createContext<StoryScript | null>(null)

/**
 * Hands the story's words to its panels. The page reads the copy on the
 * server and sends plain strings, since functions do not cross into a client
 * component; the script, with its templates, is built here once.
 */
export function StoryScriptProvider({ copy, children }: PropsWithChildren<{ copy: TerritoriosCopy }>) {
  const script = useMemo(() => storyScript(copy), [copy])
  return <StoryScriptContext.Provider value={script}>{children}</StoryScriptContext.Provider>
}

/**
 * The story's words. No default: a panel outside the provider would show the
 * shipped copy and hide the editors' changes without a trace.
 */
export function useStoryScript(): StoryScript {
  const script = useContext(StoryScriptContext)
  if (!script) throw new Error('useStoryScript needs a StoryScriptProvider above it.')
  return script
}
