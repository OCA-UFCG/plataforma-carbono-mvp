'use client'

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MONTHS } from '@/lib/phenology'
import { mix, readableOn } from '@/lib/color'
import series from '@/lib/ndfi-series.json'

// Each palette carries its own limits, as in ggplot (oob = squish).
// LANDSAT reproduces the original figure in R: same colors, same limits.
const LANDSAT = { cores: ['#8c7a5b', '#d9cdb0', '#f2efe4', '#a6c48a', '#3f7d3f'], min: -0.2, max: 1 }
// CAMPO: the colors observed by the camera installed in the biome, sorted in CIELAB.
const CAMPO = {
  cores: ['#BAAF97', '#B6AC92', '#B3A98C', '#AFA687', '#A7A07F', '#969373',
          '#848667', '#747A5C', '#6C7754', '#6A784F', '#677A4A', '#647B44'],
  min: -0.7, max: 0.8,
}
// Final palette, anchored on the two colors of the observatory logo.
const VIVA = {
  cores: ['#DD8637', '#D38526', '#C78511', '#BA8500', '#AD8500', '#9E8400',
          '#8F8400', '#818300', '#738100', '#667F00', '#5A7C10', '#4F791E'],
  min: -0.7, max: 0.8,
}

// Median color of each month recorded by the field camera.
const TIRA_CAMPO = ['#887e75', '#76844b', '#647b44', '#64784c', '#6f7f50', '#73855a',
                    '#6e7658', '#79895a', '#ada483', '#baaf97', '#8a7e76', '#93877f']

type Paleta = typeof LANDSAT

function corDe(v: number, p: Paleta): string {
  const t = Math.min(1, Math.max(0, (v - p.min) / (p.max - p.min)))
  const x = t * (p.cores.length - 1)
  const i = Math.floor(x)
  return i >= p.cores.length - 1 ? p.cores[p.cores.length - 1] : mix(p.cores[i], p.cores[i + 1], x - i)
}

const ATOS = [
  { rotulo: 'Medir', fonte: 'Landsat, 1985-2024' },
  { rotulo: 'Observar', fonte: 'câmera em campo' },
  { rotulo: 'Reunir', fonte: 'observatório' },
  { rotulo: 'Traduzir', fonte: 'paleta sazonal' },
  { rotulo: 'Aplicar', fonte: 'plataforma' },
]

const FALAS = [
  ['Quarenta anos de Caatinga, um pixel por vez', 'a cor da vegetação nativa vista do espaço, mês a mês'],
  ['No chão, uma câmera confirma o que o satélite registra', 'a cor mediana de cada mês, medida no bioma'],
  ['Duas medidas, um símbolo que já trazia as cores', 'o verde e a terracota do logo do observatório'],
  ['A seca e a chuva convertidas em escala', 'uma paleta ancorada nas cores do OCA'],
  ['A plataforma acompanha o ciclo do bioma', 'cada mês com a cor que a Caatinga tem nele'],
]

const VIDEOS = [
  {
    src: '/videos/cor-real.mp4',
    title: 'Cor real',
    text: 'Composição Sentinel-2 em cor verdadeira, mês a mês, apresentando o bioma tal como seria visto do espaço.',
  },
  {
    src: '/videos/precipitacao.mp4',
    title: 'Precipitação',
    text: 'Climatologia mensal de chuva, evidenciando o pulso que dispara a folha e some por cerca de meio ano.',
  },
  {
    src: '/videos/gpp.mp4',
    title: 'Produtividade',
    text: 'Produtividade primária bruta, na qual se observa a resposta da vegetação à chuva com poucas semanas de atraso.',
  },
]

export default function Sazonalidade() {
  const [ato, setAto] = useState(-1)
  const [paleta, setPaleta] = useState<Paleta>(LANDSAT)
  const [reveladas, setReveladas] = useState(0)
  const [secaVisivel, setSecaVisivel] = useState(false)
  const [perto, setPerto] = useState(false)

  const alvo = useRef<HTMLElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const tocou = useRef(false)

  const limpar = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const em = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  // Final state, used by anyone who asked for less motion and by the end of the sequence.
  const final = useCallback(() => {
    limpar()
    setPaleta(VIVA)
    setReveladas(series.values.length)
    setSecaVisivel(true)
    setAto(4)
  }, [limpar])

  const tocar = useCallback(() => {
    limpar()
    setPaleta(LANDSAT)
    setReveladas(0)
    setSecaVisivel(false)
    setAto(0)

    // 1. The series writes itself year by year, in the colors of the original
    //    Landsat figure. It is the longest act on purpose: forty years go by on screen.
    series.values.forEach((_, i) => em(400 + i * 88, () => setReveladas(i + 1)))
    em(4200, () => setSecaVisivel(true))

    // 2. The field camera comes in and the matrix takes on the colors measured on the ground.
    em(6400, () => { setAto(1); setPaleta(CAMPO) })

    // 3. The observatory symbol appears with the two colors that were already its own.
    em(10000, () => setAto(2))

    // 4. The two colors stretch into the seasonal ramp.
    em(13400, () => setAto(3))

    // 5. The same series changes palette and becomes the platform interface.
    em(16400, () => { setAto(4); setPaleta(VIVA) })
  }, [em, limpar])

  // The trigger is a direct measurement of the rectangle on scroll, not an
  // IntersectionObserver: the observer depends on the render cycle and, in a
  // hidden tab or without frame composition, never delivers the callback,
  // leaving the section frozen.
  useEffect(() => {
    const el = alvo.current
    if (!el) return

    const chegou = () => el.getBoundingClientRect().top < window.innerHeight * 0.75

    const disparar = () => {
      if (tocou.current || !chegou()) return
      tocou.current = true
      setPerto(true)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) final()
      else tocar()
      window.removeEventListener('scroll', disparar)
      window.removeEventListener('resize', disparar)
    }

    disparar()
    if (!tocou.current) {
      window.addEventListener('scroll', disparar, { passive: true })
      window.addEventListener('resize', disparar, { passive: true })
    }
    return () => {
      window.removeEventListener('scroll', disparar)
      window.removeEventListener('resize', disparar)
      limpar()
    }
  }, [final, tocar, limpar])

  const anoInicio = series.yearStart
  const anoFim = series.yearEnd
  const nAnos = series.values.length
  // Cut of the 2012 to 2017 drought, the most severe period of the forty years.
  const iSeca = 2012 - anoInicio
  const fSeca = 2017 - anoInicio

  return (
    <section className="secao sazonalidade" id="paleta" ref={alvo}>
      <div className="container">
        <p className="rotulo">A cor vem do dado</p>
        <h2>Quarenta anos de cor da Caatinga, mês a mês</h2>
        <p className="intro">
          A identidade visual desta plataforma foi medida, e não escolhida numa paleta de design. Desde 1985 a
          cor da vegetação nativa do bioma vem sendo acompanhada por imagens do satélite Landsat, sendo essa
          leitura conferida no chão por uma câmera instalada em campo, a qual registra a mesma vegetação ao
          longo do ano. Dessa forma, cada mês do calendário recebeu a cor que a Caatinga efetivamente tem nele,
          abril no auge da folha e outubro no fundo da estiagem.
        </p>

        <div className="ato-palco">
          <nav className="ato-trilha" aria-label="Etapas do estudo">
            {ATOS.map((a, i) => (
              <div key={a.rotulo} className={`ato${i === ato ? ' ato--on' : ''}`}>
                {a.rotulo}
                <b>{a.fonte}</b>
              </div>
            ))}
          </nav>

          <div className="ato-cena">
            <div className="ato-dizer">
              <h3 key={`t${ato}`}>{FALAS[Math.max(0, ato)][0]}</h3>
              <p key={`s${ato}`}>{FALAS[Math.max(0, ato)][1]}</p>
            </div>

            {/* matriz: 12 linhas de mês por 40 colunas de ano */}
            <div className="matriz-grade">
              <div className="matriz-meses" aria-hidden>
                {MONTHS.map((m) => <span key={m.id}>{m.short[0]}</span>)}
              </div>
              <div>
                <div className="matriz-envolto">
                  <div
                    className="matriz"
                    role="img"
                    aria-label={`Doze meses ao longo de ${nAnos} anos, verde quando a Caatinga está enfolhada e laranja quando perde as folhas na estiagem`}
                  >
                    {series.values.map((ano, ai) =>
                      ano.map((v, mi) => (
                        <i
                          key={`${ai}-${mi}`}
                          className={ai < reveladas ? 'on' : undefined}
                          style={{ background: corDe(v, paleta) }}
                          title={`${anoInicio + ai}, ${MONTHS[mi].label.toLowerCase()}`}
                        />
                      )),
                    )}
                  </div>
                  <div
                    className={`matriz-seca${secaVisivel ? ' matriz-seca--on' : ''}`}
                    style={{ left: `${(iSeca / nAnos) * 100}%`, width: `${((fSeca - iSeca + 1) / nAnos) * 100}%` }}
                    aria-hidden
                  >
                    <span>a grande seca</span>
                  </div>
                </div>
                <div className={`matriz-anos${secaVisivel ? ' matriz-anos--on' : ''}`} aria-hidden>
                  <span>{anoInicio}</span><span>1995</span><span>2005</span><span>2015</span><span>{anoFim}</span>
                </div>
              </div>
            </div>

            {/* slot que troca de conteúdo a cada ato */}
            <div className="ato-slot">
              <div className={`cena${ato === 1 ? ' cena--on' : ''}`}>
                <div className="tira-campo">
                  {TIRA_CAMPO.map((c, i) => (
                    <span key={c + i} style={{ background: c, transitionDelay: `${i * 70}ms` }} />
                  ))}
                </div>
                <p className="cena-rot">{MONTHS.map((m) => m.short).join('   ')}</p>
              </div>

              <div className={`cena cena--marca${ato === 2 ? ' cena--on' : ''}`}>
                <img src="/logos/logo_oca.png" alt="Logo do Observatório da Caatinga e Desertificação" />
                <div className="marca-gotas">
                  <span style={{ background: '#597636' }} />
                  <span style={{ background: '#D08C53' }} />
                </div>
                <p className="cena-rot">#597636 verde<br />#D08C53 terracota</p>
              </div>

              <div className={`cena${ato === 3 ? ' cena--on' : ''}`}>
                <div className="rampa">
                  {[...VIVA.cores].reverse().map((c, i) => (
                    <span key={c} style={{ background: c, transitionDelay: `${i * 78}ms` }} />
                  ))}
                </div>
              </div>

              <div className={`cena${ato === 4 ? ' cena--on' : ''}`}>
                <div className="paleta-tira" role="list" aria-label="Paleta mensal da plataforma">
                  {MONTHS.map((m, i) => (
                    <div
                      key={m.id}
                      role="listitem"
                      className="paleta-mes"
                      style={{ background: m.color, color: readableOn(m.color), transitionDelay: `${i * 65}ms` }}
                      title={m.label}
                    >
                      {m.short}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ato-rodape">
              <button type="button" className="ato-rever" onClick={tocar} disabled={!perto}>
                Rever
              </button>
            </div>
          </div>
        </div>

        <p className="paleta-legenda">
          Fonte: série Landsat 5, 7, 8 e 9 sobre a vegetação nativa do bioma, junto às observações da câmera de
          campo do observatório. O recorte destacado abrange o período de 2012 a 2017, no qual foi registrada a
          estiagem mais longa dos 173 anos de monitoramento do semiárido (INMET, 2018). Elaboração do OCA.
        </p>

        {/* as três climatologias mensais */}
        <div className="climatologias">
          {VIDEOS.map((v) => (
            <figure key={v.src} className="clima-item">
              <video
                src={perto ? v.src : undefined}
                muted
                loop
                autoPlay
                playsInline
                preload="none"
                aria-label={`${v.title}, animação da climatologia mensal da Caatinga`}
              />
              <figcaption>
                <strong>{v.title}</strong>
                {v.text}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="paleta-legenda">
          Climatologias mensais do bioma, com um quadro por mês. As três descrevem o mesmo ciclo em ordens
          distintas, no qual a chuva antecede a resposta da folha, a produtividade acompanha e o conjunto recua
          na estiagem.
        </p>
      </div>
    </section>
  )
}
