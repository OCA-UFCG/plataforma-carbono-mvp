import { describe, expect, it } from 'vitest'
import { nextStep, readyToPrint, stepFromQuery, storyPath, wantedThemes } from '@/lib/territorios/storyTabs'

describe('wantedThemes', () => {
  it('asks for the next theme from the territory tab, which has none of its own', () => {
    expect(wantedThemes('territorio')).toEqual(['estoque'])
  })

  it('asks for a theme tab and the one after it, in reading order', () => {
    expect(wantedThemes('uso')).toEqual(['uso', 'fogo'])
  })

  it('asks only for the rain theme before the summary', () => {
    expect(wantedThemes('chuva')).toEqual(['chuva'])
  })

  it('asks for every theme on the summary', () => {
    expect(wantedThemes('resumo')).toEqual(['estoque', 'fluxo', 'uso', 'fogo', 'chuva'])
  })
})

describe('nextStep', () => {
  it('walks the tabs in order and stops at the summary', () => {
    expect(nextStep('territorio')).toBe('estoque')
    expect(nextStep('chuva')).toBe('resumo')
    expect(nextStep('resumo')).toBeNull()
  })
})

describe('stepFromQuery', () => {
  it('opens the tab an address names, or the territory tab for anything else', () => {
    expect(stepFromQuery('resumo')).toBe('resumo')
    // Addresses from before 13deade named a degradation step.
    expect(stepFromQuery('degradacao')).toBe('territorio')
    expect(stepFromQuery('')).toBe('territorio')
  })
})

describe('storyPath', () => {
  it('holds the screen in the query, so the section works on any path', () => {
    expect(storyPath('/territorios', null, '', 'territorio')).toBe('/territorios')
    expect(storyPath('/territorios', 'municipios', '', 'territorio')).toBe('/territorios?recorte=municipios')
    expect(storyPath('/', 'municipios', 'juazeiro', 'fogo')).toBe('/?recorte=municipios&feicao=juazeiro&etapa=fogo')
  })
})

describe('readyToPrint', () => {
  const ALL = { estoque: 1, fluxo: 1, uso: 1, fogo: 1, chuva: 1 }

  it('waits for every theme of the territory "Baixar" was pressed on', () => {
    expect(readyToPrint('m|a', 'm|a', false, { estoque: 1 })).toBe(false)
    expect(readyToPrint('m|a', 'm|a', false, ALL)).toBe(true)
  })

  it('prints what it has once the session is gone, since nothing more will come', () => {
    expect(readyToPrint('m|a', 'm|a', true, {})).toBe(true)
  })

  it('never prints for another territory or without a request', () => {
    expect(readyToPrint('m|a', 'm|b', false, ALL)).toBe(false)
    expect(readyToPrint(null, 'm|a', false, ALL)).toBe(false)
  })
})
