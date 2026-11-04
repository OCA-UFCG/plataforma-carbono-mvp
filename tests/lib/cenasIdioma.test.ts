import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControleCena, CriarCena } from '@/lib/cenas/tipos'
import type { AnimacaoId } from '@/lib/glossario/termos'

// Runs every glossary scene on a stand-in canvas and gathers all the text a
// reader meets: what the scene draws (fillText), the names of its steps,
// phases and presets, what screen readers hear (textoEtapa, textoValor,
// descricaoValor) and what it writes in the page's panel. In English none of
// it may read as Portuguese.

const CENAS: Record<AnimacaoId, () => Promise<{ criarCena: CriarCena }>> = {
  cicloAnual: () => import('@/lib/cenas/gerado/cicloAnual'),
  torreFluxo: () => import('@/lib/cenas/gerado/torreFluxo'),
  estoques: () => import('@/lib/cenas/gerado/estoques'),
  cisterna: () => import('@/lib/cenas/gerado/cisterna'),
  fluxos: () => import('@/lib/cenas/gerado/fluxos'),
  cue: () => import('@/lib/cenas/gerado/cue'),
  degradacao: () => import('@/lib/cenas/gerado/degradacao'),
  agroecologia: () => import('@/lib/cenas/gerado/agroecologia'),
  medirCarbono: () => import('@/lib/cenas/gerado/medirCarbono'),
}

// A 2D context that draws nothing and keeps every string it is asked to draw.
function contexto(textos: string[]) {
  const alvo: Record<string | symbol, unknown> = {}
  const gradiente = { addColorStop() {} }

  return new Proxy(alvo, {
    get(t, p) {
      if (p in t) return t[p]
      if (p === 'measureText') return (s: unknown) => ({ width: String(s).length * 7, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 3 })
      if (p === 'fillText' || p === 'strokeText') return (s: unknown) => void textos.push(String(s))
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createConicGradient') return () => gradiente
      if (p === 'createPattern') return () => ({})
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      if (p === 'isPointInPath' || p === 'isPointInStroke') return () => false
      if (p === 'getLineDash') return () => []
      return () => {}
    },
    set(t, p, v) {
      t[p] = v
      return true
    },
  })
}

function tela(textos: string[]) {
  return {
    width: 960,
    height: 540,
    style: {},
    getContext: () => contexto(textos),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    addEventListener() {},
    removeEventListener() {},
  }
}

// The element under the control panel where a scene writes text of its own:
// its markup's text and aria-labels, and every textContent it sets later.
function painel(textos: string[]) {
  const elementos = new Map<string, Record<string, unknown>>()
  let html = ''

  return {
    get innerHTML() {
      return html
    },
    set innerHTML(valor: string) {
      html = valor
      for (const [, rotulo] of valor.matchAll(/aria-label="([^"]+)"/g)) textos.push(rotulo)
      textos.push(...valor.split(/<[^>]+>/).map((s) => s.trim()).filter(Boolean))
    },
    querySelector(seletor: string) {
      if (!elementos.has(seletor)) {
        let texto = ''
        elementos.set(seletor, {
          hidden: false,
          style: {},
          classList: { add() {}, remove() {}, toggle() {} },
          setAttribute() {},
          get textContent() {
            return texto
          },
          set textContent(v: string) {
            texto = String(v)
            textos.push(texto)
          },
        })
      }
      return elementos.get(seletor)
    },
  }
}

let quadro: ((agora: number) => void) | null = null
let agora = 0

function desenhar(vezes = 3) {
  for (let i = 0; i < vezes; i++) {
    agora += 50
    const f = quadro
    quadro = null
    f?.(agora)
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 })
  vi.stubGlobal('requestAnimationFrame', (f: (agora: number) => void) => {
    quadro = f
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal(
    'Path2D',
    class {
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      ellipse() {}
      rect() {}
      closePath() {}
      addPath() {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  quadro = null
})

// Every text of one scene in one language, across its steps, its presets and
// the year.
async function textosDa(id: AnimacaoId, idioma: 'pt' | 'en' | undefined): Promise<string[]> {
  const textos: string[] = []
  // The scenes draw some labels at random; the same seed every run keeps the
  // gathered text the same.
  let semente = 20261103
  vi.spyOn(Math, 'random').mockImplementation(() => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  })
  agora = 0
  vi.stubGlobal('document', { createElement: () => tela(textos), hidden: false })
  const { criarCena } = await CENAS[id]()
  const cena: ControleCena = criarCena(tela(textos) as unknown as HTMLCanvasElement, {
    idioma,
    painel: painel(textos) as unknown as HTMLElement,
  })
  const anotar = () => {
    const e = cena.estado()
    textos.push(e.fase, e.textoEtapa ?? '', e.textoValor ?? '', e.descricaoValor ?? '')
  }

  desenhar()
  anotar()
  for (const f of cena.fases()) textos.push(f.nome)
  cena.etapas()?.forEach((etapa, i) => {
    textos.push(etapa.nome)
    cena.etapa(i)
    desenhar()
    anotar()
  })
  const valor = cena.valor()
  if (valor) {
    textos.push(valor.rotulo)
    for (const p of valor.predefinidos) {
      textos.push(p.rotulo)
      cena.definirValor(p.valor)
      desenhar()
      anotar()
    }
  }
  if (cena.tempo()) {
    for (const p of [0.05, 0.25, 0.45, 0.65, 0.85]) {
      cena.posicao(p)
      desenhar()
      anotar()
    }
  }
  cena.encerrar()

  return [...new Set(textos.map((t) => t.trim()).filter(Boolean))]
}

// Proper names that keep their Portuguese spelling in English: places, people
// and the vernacular names of the species, which have no English ones.
const NOMES_PROPRIOS =
  /\b(Paraíba|Ceará|Piauí|Pará|Seridó|São|João|Lourenço|Nóbrega|Pérez|Ipê-roxo|Ipê)\b/g

// Accented letters and the commonest Portuguese function words, which English
// does not use; and a decimal comma.
const PORTUGUES = /[ãõçâêôàáéíóú]|\b(de|da|das|dos|que|com|para|uma|em|na|nas|nos|ao|aos|pela|pelo|pelas|pelos|são|não|mais|chuvas?|seca|folhas|solo|carbono)\b/i
const VIRGULA_DECIMAL = /\d,\d{1,2}(?!\d)/

function soaPortugues(texto: string): boolean {
  const semNomes = texto.replace(NOMES_PROPRIOS, '')
  return PORTUGUES.test(semNomes) || VIRGULA_DECIMAL.test(semNomes)
}

describe('glossary scenes in English', () => {
  for (const id of Object.keys(CENAS) as AnimacaoId[]) {
    it(`${id} shows no Portuguese to an English reader`, async () => {
      const portugues = (await textosDa(id, 'en')).filter(soaPortugues)

      expect(portugues).toEqual([])
    })
  }

  it('names the phases of the year in English', async () => {
    const textos = await textosDa('cicloAnual', 'en')

    for (const fase of ['End of the dry season', 'First rains', 'Peak of the rains', 'End of the rains', 'Dry season']) {
      expect(textos).toContain(fase)
    }
  })
})

describe('glossary scenes in Portuguese', () => {
  // Without a language the scene speaks Portuguese, as it always has.
  it('keeps Portuguese as the default', async () => {
    for (const idioma of [undefined, 'pt'] as const) {
      const textos = await textosDa('cicloAnual', idioma)

      expect(textos).toContain('Primeiras chuvas')
      expect(textos).not.toContain('First rains')
    }
  })
})
