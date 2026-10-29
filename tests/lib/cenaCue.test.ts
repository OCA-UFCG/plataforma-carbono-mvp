import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControleCena, EstadoCena } from '@/lib/cenas/tipos'
import { criarCena } from '@/lib/cenas/gerado/cue'

// The scene runs in node against a canvas that draws nothing: a 2D context
// that keeps what is set on it and answers every call. Frames are driven by
// hand, 50 ms apart, the longest step the engine takes (dt ≤ 0.05 s).
function contexto() {
  const props: Record<string | symbol, unknown> = {}
  const nada = () => {}
  return new Proxy(props, {
    get(alvo, chave) {
      if (chave in alvo) return alvo[chave]
      if (chave === 'measureText') return (s: string) => ({ width: String(s).length * 7 })
      if (chave === 'createLinearGradient' || chave === 'createRadialGradient' || chave === 'createPattern') {
        return () => ({ addColorStop: nada })
      }
      return nada
    },
    set(alvo, chave, valor) {
      alvo[chave] = valor
      return true
    },
  })
}

function canvas() {
  return { width: 960, height: 540, getBoundingClientRect: () => ({ width: 960 }), getContext: () => contexto() }
}

let quadro: ((agora: number) => void) | null = null
let agora = 0
function quadros(n: number) {
  for (let i = 0; i < n; i++) {
    agora += 50
    const f = quadro
    quadro = null
    f?.(agora)
  }
}

let cena: ControleCena
let avisos: EstadoCena[]

beforeEach(() => {
  agora = performance.now()
  quadro = null
  vi.stubGlobal('requestAnimationFrame', (f: (agora: number) => void) => {
    quadro = f
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal('Path2D', class { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} arc() {} ellipse() {} rect() {} closePath() {} })
  // No matchMedia: the scene takes motion as allowed, so its tour runs.
  vi.stubGlobal('window', { devicePixelRatio: 1 })
  vi.stubGlobal('document', { createElement: () => canvas() })
  avisos = []
  cena = criarCena(canvas() as unknown as HTMLCanvasElement, { aoMudar: (e) => avisos.push(e) })
})

afterEach(() => {
  cena.encerrar()
  vi.unstubAllGlobals()
})

describe('CUE scene value', () => {
  it('describes its slider and presets by the two measured sites', () => {
    expect(cena.valor()).toEqual({
      rotulo: 'Ajuste manual',
      min: 0.31,
      max: 0.58,
      passo: 0.01,
      predefinidos: [
        { rotulo: 'Área cristalina: 0,31', valor: 0.31 },
        { rotulo: 'Ecótono do Agreste: 0,58', valor: 0.58 },
      ],
    })
  })

  it('opens "O que é a CUE" when a new value is chosen on another step', () => {
    cena.etapa(2)
    cena.definirValor(0.31)

    expect(cena.estado()).toMatchObject({ etapa: 0, valor: 0.31, textoValor: '0,31' })
    expect(avisos.at(-1)).toMatchObject({ etapa: 0, valor: 0.31 })
  })

  it('leaves the step alone when the preset chosen is the value already set', () => {
    cena.etapa(2)
    cena.definirValor(0.58)

    expect(cena.estado()).toMatchObject({ etapa: 2, valor: 0.58 })
  })

  it('stops the tour when the reader presses the preset it is showing', () => {
    cena.definirValor(0.58)
    quadros(180)

    expect(cena.estado()).toMatchObject({ etapa: 0, valor: 0.58 })
  })

  it('keeps the value in the measured range, on the slider step, and ignores NaN', () => {
    cena.definirValor(0.1)
    expect(cena.estado().valor).toBe(0.31)
    cena.definirValor(0.9)
    expect(cena.estado().valor).toBe(0.58)
    cena.definirValor(0.4449)
    expect(cena.estado().valor).toBe(0.44)
    cena.definirValor(Number.NaN)
    expect(cena.estado()).toMatchObject({ valor: 0.44, textoValor: '0,44' })
  })

  it('tells screen readers what the value means, naming the site when it is one', () => {
    cena.definirValor(0.31)
    expect(cena.estado().descricaoValor).toBe('0,31, Área cristalina: 31 de cada 100 ficam')
    cena.definirValor(0.45)
    expect(cena.estado().descricaoValor).toBe('0,45: 45 de cada 100 ficam')
  })

  it('reports the value its tour sets to the page', () => {
    expect(cena.estado()).toMatchObject({ etapa: 0, valor: 0.58 })

    // The tour moves on after 8.5 s: from 0,58 to 0,31, still on step 0.
    quadros(180)

    expect(avisos.at(-1)).toMatchObject({ etapa: 0, valor: 0.31, textoValor: '0,31' })
  })
})
