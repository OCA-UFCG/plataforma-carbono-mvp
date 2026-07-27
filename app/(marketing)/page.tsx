import {
  FaLayerGroup,
  FaScaleBalanced,
  FaBullhorn,
  FaFlaskVial,
  FaShieldHalved,
  FaPeopleGroup,
} from "react-icons/fa6";
import SiteHeader from "@/components/SiteHeader";
import PhotoCarousel from "@/components/PhotoCarousel";
import HeroBackground from "@/components/HeroBackground";
import Sazonalidade from "@/components/Sazonalidade";
import { PLATFORM_URL } from "@/lib/config";

const HERO_FOTOS = [
  "/images/hero/hero1.jpg",
  "/images/hero/hero2.jpg",
  "/images/hero/hero3.jpg",
  "/images/hero/hero4.jpg",
  "/images/hero/hero5.jpg",
];

// As funções do bioma, uma dimensão por card. Os números vêm do levantamento em
// ../Caatinga_Panorama_Revisado.md, com a fonte primária ao pé de cada um.
const DIMENSOES = [
  {
    cor: "#5f7030",
    num: "48%",
    titulo: "Das remoções de carbono do Brasil",
    texto:
      "Em 2022 a Caatinga respondeu por quase metade da remoção bruta de carbono do país, ocupando cerca de 10% do território. A eficiência de uso de carbono da sua vegetação, situada entre 0,31 e 0,58, é a maior já registrada dentre florestas secas áridas e semiáridas, superando a da Amazônia.",
    fonte: "DA COSTA et al. (2025); MENDES et al. (2025)",
  },
  {
    cor: "#4e5d26",
    num: "72%",
    titulo: "Do carbono estocado no solo",
    texto:
      "A Caatinga densa preservada estoca cerca de 125 Mg C por hectare, permanecendo quase três quartos desse total abaixo da superfície, fração que as metodologias tradicionais de REDD+ não contabilizam. O estoque de carbono orgânico do solo do bioma alcança 2,5 gigatoneladas.",
    fonte: "DE OLIVEIRA et al. (2021)",
  },
  {
    cor: "#6b7d34",
    num: "3.347",
    titulo: "Espécies de plantas com flores",
    texto:
      "São 962 gêneros e 153 famílias, com 15% de endemismo na flora. Contudo, 80% das áreas do bioma foram mal amostradas e 41% nunca receberam coleta, indicando endemismo real superior ao catalogado.",
    fonte:
      "FERNANDES; CARDOSO; DE QUEIROZ (2020); SILVA; LEAL; TABARELLI (2017)",
  },
  {
    cor: "#ce8b44",
    num: "93%",
    titulo: "Da potência eólica nacional",
    texto:
      "O Nordeste concentra 1.026 das 1.132 usinas eólicas do país, abrigando a Caatinga 62% das áreas de usinas solares brasileiras. A irradiação média da região, de 5,49 kWh por m² ao dia, é a maior do território nacional.",
    fonte: "ETENE/BNB (2025); MAPBIOMAS (2025); PEREIRA et al. (2017)",
  },
  {
    cor: "#a66a2e",
    num: "62%",
    titulo: "Da uva de mesa do país",
    texto:
      "O Vale do São Francisco produz ainda 61% da manga nacional, permitindo o clima de duas a quatro safras por ano, contra uma no Sul. Quanto à pecuária, o Semiárido concentra cerca de 90% do rebanho nacional de caprinos, liderando o Nordeste as exportações brasileiras de mel.",
    fonte: "CNA; Embrapa; Consórcio Nordeste",
  },
  {
    cor: "#7a4e1e",
    num: "1.000",
    titulo: "Sítios arqueológicos, no mínimo",
    texto:
      "O Parque Nacional Serra da Capivara é Patrimônio Mundial da UNESCO desde 1991 e guarda a maior concentração de sítios pré-históricos das Américas. No bioma vivem cerca de 27 milhões de pessoas, dentre as quais 45 povos indígenas e boa parte das comunidades quilombolas do país.",
    fonte: "UNESCO (2021); IPHAN; CEDEFES; IBGE (2022)",
  },
];

const AMEACAS = [
  {
    num: "8,6 mi ha",
    texto:
      "De vegetação nativa perdidos entre 1985 e 2023, correspondendo a 14,4% do bioma, do qual restam 59,6%. Em 2023, 67,4% da supressão ocorreu em vegetação primária, nunca antes desmatada.",
    fonte: "MAPBIOMAS, Coleção 9 (2025)",
  },
  {
    num: "+9,9%",
    texto:
      "De incremento no desmatamento em 2024 sobre 2023. Junto ao Pantanal, a Caatinga foi o único bioma no qual a supressão aumentou, tendo Amazônia, Cerrado, Mata Atlântica e Pampa registrado queda.",
    fonte: "INPE/PRODES, Programa BiomasBR (2026)",
  },
  {
    num: "99,81%",
    texto:
      "Dos alertas de desmatamento registrados na Caatinga em 2020 apresentavam indícios de ilegalidade.",
    fonte: "MAPBIOMAS / SAD Caatinga (2020)",
  },
  {
    num: "170 mil km²",
    texto:
      "De expansão das áreas suscetíveis à desertificação e do seu entorno entre 2000 e 2020, tendo a área em desertificação severa passado de 74 mil para 107 mil km². Nessas áreas vivem 39 milhões de brasileiros.",
    fonte: "SUDENE, INSA, OCA e UFCG, Boletim Temático: Desertificação (2025)",
  },
  {
    num: "40%",
    texto:
      "Da água de superfície de origem natural do bioma desapareceu ao longo de 35 anos.",
    fonte: "MAPBIOMAS (2021)",
  },
  {
    num: "88%",
    texto:
      "Do domínio da Caatinga já registrou extinções locais de aves florestais endêmicas, estando dez das treze espécies endêmicas avaliadas mais ameaçadas do que sugeria a Lista Vermelha.",
    fonte: "LIMA; PERES; ARAUJO (2025)",
  },
  {
    num: "9%",
    texto:
      "Do bioma sob unidades de conservação, e menos de 2% em proteção integral. Já a Amazônia mantém cerca de metade do território protegido.",
    fonte: "MAPBIOMAS (2025); ICMBio",
  },
  {
    num: "US$ 0,50",
    texto:
      "Por hectare ao ano foi o orçamento médio de 20 unidades de conservação federais da Caatinga entre 2008 e 2014, cerca de treze vezes inferior ao que o próprio MMA declara necessário. Dentre elas, doze não dispunham de conselho gestor e onze não tinham plano de manejo.",
    fonte: "DE OLIVEIRA; BERNARD (2017)",
  },
  {
    num: "1995",
    texto:
      "Ano da proposta de emenda que incluiria a Caatinga dentre os biomas reconhecidos como Patrimônio Nacional, a qual permanece em tramitação. Amazônia, Mata Atlântica, Serra do Mar, Pantanal e Zona Costeira constam do art. 225 da Constituição desde 1988.",
    fonte: "Constituição Federal de 1988; Câmara dos Deputados",
  },
  {
    num: "180 GW",
    texto:
      "Em projetos eólicos e solares planejados sobre o bioma, contra 35,35 GW já instalados. O Ministério Público Federal registra desmatamento, fragmentação territorial, conflitos fundiários e contratos de arrendamento os quais retiram das comunidades o controle efetivo da terra.",
    fonte: "ANEEL; Ministério Público Federal (2024)",
  },
];

const FRENTES = [
  {
    icon: FaLayerGroup,
    color: "#5f7030",
    title: "Dados espaciais do bioma",
    text: "Carbono do solo, biomassa aérea, GPP, queimadas, precipitação, umidade do solo, fenologia e SIF, com dados de campo e torres de fluxo.",
  },
  {
    icon: FaScaleBalanced,
    color: "#7a4e1e",
    title: "Governança dos mercados",
    text: "Acompanhamento das decisões e normas que afetam a Caatinga, incluindo o SBCE e as resoluções de REDD+ no país.",
  },
  {
    icon: FaBullhorn,
    color: "#ce8b44",
    title: "Comunicação",
    text: "Boletins e cartilhas em linguagem acessível para agricultores familiares, assentamentos e demais territórios.",
  },
  {
    icon: FaFlaskVial,
    color: "#4e5d26",
    title: "Metodologia e MRV digital",
    text: "Método de estimativa desenhado para o semiárido, com sistema digital de mensuração, relato e verificação.",
  },
  {
    icon: FaShieldHalved,
    color: "#a66a2e",
    title: "Integridade dos projetos",
    text: "Avaliação da consistência científica e social dos projetos de carbono em operação no bioma.",
  },
  {
    icon: FaPeopleGroup,
    color: "#6b7d34",
    title: "Formação cidadã",
    text: "Oficinas, participação em eventos e rodas de diálogo que levam formação à sociedade civil e escutam a visão dos territórios.",
  },
];

const FOTOS_FORMACAO = [
  {
    src: "/images/formacao/f1.jpg",
    caption: "Encontro em assentamento da reforma agrária",
    alt: "Grupo de participantes reunido diante da sede de um assentamento",
  },
  {
    src: "/images/formacao/f2.jpg",
    caption: "Apresentação em evento",
    alt: "Palestra com plateia e projeção de um mapa da América do Sul",
  },
  {
    src: "/images/formacao/f3.jpg",
    caption: "Oficina de formação",
    alt: "Pessoa apresentando ao microfone para uma plateia, com projeção ao fundo",
  },
  {
    src: "/images/formacao/f4.jpg",
    caption: "Roda de diálogo",
    alt: "Participantes sentados em círculo durante uma roda de conversa",
  },
  {
    src: "/images/formacao/f6.jpg",
    caption: "Participantes de um encontro de formação",
    alt: "Foto de grupo dos participantes de um encontro",
  },
  {
    src: "/images/formacao/f7.jpg",
    caption: "Oficina com a sociedade civil",
    alt: "Pessoa em pé conduzindo uma atividade com o grupo sentado à mesa",
  },
];

const CARTILHAS = [
  {
    src: "/images/cartilhas/vol1.jpg",
    vol: "Volume 1",
    titulo: "O que é crédito de carbono?",
  },
  {
    src: "/images/cartilhas/vol2.jpg",
    vol: "Volume 2",
    titulo: "Como funciona o mercado de carbono?",
  },
  {
    src: "/images/cartilhas/vol3.jpg",
    vol: "Volume 3",
    titulo: "A Caatinga e o carbono: qual a relação?",
  },
  {
    src: "/images/cartilhas/vol4.jpg",
    vol: "Volume 4",
    titulo: "Desafios e caminhos para um mercado de carbono que beneficia a todos",
  },
];

const FOTOS_CAATINGA = [
  { src: "/images/galeria/cg1.jpg", alt: "Cachoeira entre rochas na mata verde da Caatinga" },
  { src: "/images/galeria/cg2.jpg", alt: "Flamboyant florido em vermelho ao lado de uma casa" },
  { src: "/images/galeria/cg3.jpg", alt: "Colinas verdes com serra ao fundo e um bode" },
  { src: "/images/galeria/cg4.jpg", alt: "Nuvens douradas ao entardecer sobre a vegetação" },
  { src: "/images/galeria/cg8.jpg", alt: "Rio com reflexo do céu na Caatinga" },
  { src: "/images/galeria/cg6.jpg", alt: "Pôr do sol vermelho com árvores em silhueta" },
  { src: "/images/galeria/cg7.jpg", alt: "Açude de águas azuis sob céu de nuvens" },
  { src: "/images/importa/imp1.jpg", alt: "Vegetação verde da Caatinga com palma" },
  { src: "/images/galeria/cg9.jpg", alt: "Formação rochosa com vegetação, um lajedo" },
  { src: "/images/importa/imp2.jpg", alt: "Vale verde da Caatinga visto de um mirante" },
  { src: "/images/galeria/cg5.jpg", alt: "Torre de fluxo entre a vegetação verde do bioma" },
  { src: "/images/importa/imp3.jpg", alt: "Vista panorâmica do semiárido a partir de um mirante" },
];

const PARTNERS = [
  { src: "/logos/logo_oca.png", alt: "OCA", height: 42 },
  { src: "/logos/logo_ufcg.png", alt: "UFCG", height: 40 },
  { src: "/logos/logo_insa.png", alt: "INSA", height: 34 },
  { src: "/logos/logo_sudene.png", alt: "SUDENE", height: 36 },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="hero" aria-label="Apresentação">
          <HeroBackground images={HERO_FOTOS} />
          <div className="hero-overlay" aria-hidden />
          <div className="hero-conteudo">
            <div className="hero-inner">
              <h1>
                A Caatinga em anos chuvosos pode responder por quase metade da
                remoção de carbono do Brasil
              </h1>
              <p className="hero-apoio">
                O reconhecimento do bioma costuma parar na condição de único
                inteiramente contido no território brasileiro. Contudo, os seus
                862.818 km² abarcam 3.347 espécies de plantas com flores, 93% da
                potência eólica instalada no país e cerca de 27 milhões de
                pessoas. Já a proteção legal alcança 9% do território, tendo sido
                perdidos 8,6 milhões de hectares de vegetação nativa entre 1985 e
                2023.
              </p>
              <div className="hero-acoes">
                <a href={PLATFORM_URL} className="btn btn--primario">
                  Acessar a plataforma
                </a>
                <a href="#bioma" className="btn btn--contorno-branco">
                  Conhecer o bioma
                </a>
              </div>
            </div>
          </div>
          <span className="hero-credito">Foto: Artur Lourenço</span>
        </section>

        {/* Dimensões do bioma */}
        <section className="secao" id="bioma">
          <div className="container">
            <p className="rotulo">Dimensões do bioma</p>
            <h2>As funções que a Caatinga cumpre para o país</h2>
            <p className="intro">
              A delimitação do IBGE (2019) atribui à Caatinga 862.818 km², cerca
              de 10,1% do território nacional, sendo ela o bioma predominante em
              1.095 municípios (IBGE, 2024). No que diz respeito às funções que o
              bioma desempenha, elas foram medidas por instituições distintas,
              abarcando desde o ciclo do carbono até a matriz elétrica e o
              patrimônio arqueológico nacionais, e raramente aparecem reunidas
              num mesmo panorama.
            </p>
            <div className="dim-grid">
              {DIMENSOES.map((d) => (
                <article
                  className="dim-card"
                  key={d.titulo}
                  style={{ borderTopColor: d.cor }}
                >
                  <div className="dim-num" style={{ color: d.cor }}>
                    {d.num}
                  </div>
                  <h3>{d.titulo}</h3>
                  <p>{d.texto}</p>
                  <p className="dim-fonte">Fonte: {d.fonte}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Perdas e vulnerabilidades */}
        <section className="ameacas" id="ameacas">
          <div className="container">
            <p className="rotulo">Perdas e vulnerabilidades</p>
            <h2>A degradação avança antes de se tornar visível no chão</h2>
            <p className="intro">
              A desertificação em fase inicial é detectável apenas por
              sensoriamento remoto, tornando-se perceptível em campo somente
              quando a recuperação já se inviabilizou (MAPBIOMAS, 2021). Dessa
              forma, os processos descritos a seguir foram medidos por satélite
              antes de serem percebidos pelas populações que habitam o bioma.
            </p>
            <div className="ameaca-lista">
              {AMEACAS.map((a) => (
                <div className="ameaca-item" key={a.num + a.fonte}>
                  <div className="ameaca-num">{a.num}</div>
                  <div>
                    <p>{a.texto}</p>
                    <p className="dim-fonte">Fonte: {a.fonte}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="projecao">
              <p>
                Mantido o ritmo atual de degradação, a modelagem projeta perda de
                até 90% da biodiversidade do bioma em 60 anos, com 87% das
                espécies perdendo habitat até 2060. Trata-se de projeção de
                cenário, dependente do ritmo de degradação e da trajetória de
                emissões globais, e não de medição já realizada, permanecendo por
                isso passível de alteração.
              </p>
              <p className="dim-fonte">
                Fonte: MOURA et al. (2023), citado por MPF (2024)
              </p>
            </div>
          </div>
        </section>

        {/* A plataforma */}
        <section className="secao" id="plataforma">
          <div className="container plataforma-grid">
            <div className="plataforma-quadro">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/plataforma_preview.jpg"
                alt="Mapa da plataforma com a camada de produtividade primária bruta ativa sobre o bioma"
              />
            </div>
            <div className="plataforma-texto">
              <p className="rotulo">A plataforma</p>
              <h2>Medição como condição para a conservação</h2>
              <p className="paragrafo">
                A Caatinga chega ao mercado regulado de carbono sem metodologia
                própria. As abordagens dominantes foram desenhadas para florestas
                tropicais úmidas, desconsiderando a caducifólia da vegetação, a
                dependência dos pulsos de chuva e a permanência de quase três
                quartos do carbono no solo. Diante do exposto, e em curso a
                regulamentação do Sistema Brasileiro de Comércio de Emissões
                instituído pela Lei nº 15.042/2024, a ausência de número
                confiável tende a inserir o bioma como fronteira tardia, com
                crédito barato, pouco verificado e contratos desfavoráveis a quem
                mantém a floresta em pé.
              </p>
              <p className="paragrafo">
                A plataforma reúne carbono do solo, biomassa aérea, produtividade
                primária, fluxo, fogo, precipitação, temperatura e uso da terra
                num mapa único, permitindo o cálculo de estatística por
                município, território ou área desenhada sobre a série do Google
                Earth Engine. Quanto à rastreabilidade, cada crédito carrega o
                registro público da sua origem, em consonância com o modelo de
                Certificação Participativa de Créditos de Carbono Social.
              </p>
              <a href={PLATFORM_URL} className="btn btn--primario">
                Acessar a plataforma
              </a>
            </div>
          </div>
        </section>

        {/* Frentes de atuação */}
        <section className="frentes" id="frentes">
          <div className="container">
            <p className="rotulo">Frentes de atuação</p>
            <h2>Seis frentes complementares</h2>
            <div className="frentes-grid">
              {FRENTES.map((f) => (
                <article
                  className="frente-card"
                  key={f.title}
                  style={{ borderTopColor: f.color }}
                >
                  <div className="frente-icon" style={{ color: f.color }}>
                    <f.icon aria-hidden />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Comunicação (cartilhas) */}
        <section className="comunicacao" id="comunicacao">
          <div className="container">
            <p className="rotulo">Comunicação</p>
            <h2>Materiais para levar o tema às comunidades</h2>
            <p className="intro">
              O projeto produz um boletim temático e uma coleção de cartilhas em
              linguagem acessível, disseminando junto a agricultores familiares,
              assentamentos e demais territórios o entendimento sobre o mercado
              de carbono, de modo a mitigar a exposição a acordos desfavoráveis.
            </p>

            <div className="boletim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cartilhas/boletim.jpg"
                alt="Capa do boletim temático A Aproximação do Mercado de Carbono Florestal no Bioma Caatinga"
              />
              <div className="boletim-texto">
                <p className="subrotulo">Boletim temático</p>
                <h3>
                  A aproximação do mercado de carbono florestal no bioma
                  Caatinga: desafios, ameaças e perspectivas
                </h3>
                <p>
                  Reúne o que a ciência revela, o que a legislação estabelece e o
                  que está em jogo para a Caatinga, em cinco seções que norteiam
                  cidadãos, gestores públicos, organizações e investidores antes
                  de se posicionarem no debate.
                </p>
              </div>
            </div>

            <p className="subrotulo subrotulo--secao">Coleção de cartilhas</p>
            <div className="cartilhas-grid">
              {CARTILHAS.map((c) => (
                <figure className="cartilha" key={c.vol}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.src}
                    alt={`Capa da cartilha ${c.vol}: ${c.titulo}`}
                  />
                  <figcaption>
                    <div className="cartilha-vol">{c.vol}</div>
                    <div className="cartilha-titulo">{c.titulo}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="colecao">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cartilhas/colecao_banner.jpg"
                alt="Os quatro volumes da coleção Mercado de carbono dispostos lado a lado"
              />
              <div className="colecao-texto">
                <h3>A coleção completa, em quatro volumes</h3>
                <p>
                  Material desenvolvido pelo OCA em cooperação com UFCG, INSA e
                  SUDENE, distribuído nas comunidades do semiárido e disponível
                  para leitura pública.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Formação cidadã (carrossel) */}
        <section className="secao formacao" id="formacao">
          <div className="container">
            <p className="rotulo">Formação cidadã</p>
            <h2>Formação e diálogo com a sociedade civil</h2>
            <p className="intro">
              A formação sobre o mercado de carbono vem sendo levada às
              comunidades do semiárido por meio de oficinas, participação em
              eventos e rodas de diálogo, escutando-se ao mesmo tempo a visão dos
              territórios quanto à conservação da Caatinga e ao uso da sua terra.
            </p>
            <PhotoCarousel photos={FOTOS_FORMACAO} />
          </div>
        </section>

        {/* Conheça a Caatinga (galeria) */}
        <section className="secao caatinga" id="caatinga">
          <div className="container">
            <p className="rotulo">Conheça a Caatinga, de verdade</p>
            <h2>A maior floresta tropical sazonalmente seca do planeta</h2>
            <p className="intro">
              Único bioma exclusivamente brasileiro, a Caatinga abarca alta
              biodiversidade e riqueza social e cultural, estocando e ciclando o
              carbono que regula o clima do país e do planeta. Trata-se de uma
              Floresta Tropical Sazonalmente Seca, a maior do mundo. As fotos a
              seguir registram o bioma para além do estereótipo de terra seca e
              vazia.
            </p>
            <div className="galeria">
              {FOTOS_CAATINGA.map((f) => (
                <figure className="galeria-item" key={f.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.src} alt={f.alt} loading="lazy" />
                  <figcaption className="foto-credito">
                    Foto: Artur Lourenço
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="galeria-cta">
              <div>
                <h3>Envie sua foto e ajude a mudar a visão da Caatinga</h3>
                <p>
                  Uma galeria colaborativa para mostrar o bioma por muitos
                  olhares. Envio disponível em breve.
                </p>
              </div>
              <button type="button" className="btn btn--primario" disabled>
                Enviar foto
              </button>
            </div>
          </div>
        </section>

        {/* Sazonalidade e paleta, penúltima seção */}
        <Sazonalidade />

        {/* Faixa CTA */}
        <section className="faixa-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="faixa-cta-bg"
            src="/images/cta_caatinga.jpg"
            alt=""
            aria-hidden
          />
          <div className="faixa-cta-overlay" aria-hidden />
          <div className="container">
            <h2>
              Acompanhe o carbono do bioma sobre o mapa, por município ou por
              área desenhada
            </h2>
            <a href={PLATFORM_URL} className="btn btn--branco">
              Acessar a plataforma
            </a>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="rodape">
        <div className="container">
          <div className="rodape-logos">
            {PARTNERS.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.alt}
                src={p.src}
                alt={p.alt}
                style={{ height: p.height }}
              />
            ))}
          </div>
          <p className="rodape-institucional">
            A Plataforma Carbono Caatinga integra o projeto Floresta em pé, Renda
            justa, financiado pela Superintendência do Desenvolvimento do
            Nordeste (SUDENE), e desenvolvida pelo Observatório da Caatinga e
            Desertificação (OCA), em cooperação entre a Universidade Federal de
            Campina Grande (UFCG) e o Instituto Nacional do Semiárido (INSA).
          </p>
          <div className="rodape-linha">
            <span>Plataforma Carbono Caatinga, 2026</span>
            <span>Dados abertos e rastreabilidade pública</span>
          </div>
        </div>
      </footer>
    </>
  );
}
