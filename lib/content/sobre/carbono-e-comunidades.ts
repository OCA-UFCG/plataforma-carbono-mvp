import { defineCopy, line, list, paragraph, text, type Copy } from '../site/model'

// Content of "Entenda essa relação" (/sobre/carbono-e-comunidades), Figma frame
// 18988:8769, content node 18988:8798, copied verbatim. Three terms carry an
// "ⓘ" in the design ("consulta livre, prévia e informada", "adicionais",
// "permanência") for a glossary it does not define (issue #44, question 3);
// the marker is left out until that content exists, rather than rendering an
// icon that does nothing. Image alt text is not in the design and is written
// here.

export const CARBONO_E_COMUNIDADES = defineCopy({
  id: 'sobreCarbonoComunidades',
  name: 'Sobre · Entenda essa relação',
  description:
    'Textos da página /sobre/carbono-e-comunidades, abaixo da introdução comum às páginas de Sobre. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    // 18988:8799
    antesTitulo: line('Antes de participar · Título', 'Antes de participar de um projeto'),
    antesTexto: text('Antes de participar · Texto', [
      'Os territórios da Caatinga são espaços de vida, trabalho e produção. Neles, agricultores familiares, povos indígenas, comunidades quilombolas, assentamentos e outros povos e comunidades tradicionais conservam a vegetação, manejam os recursos naturais e acumulam conhecimentos sobre a convivência com o Semiárido.',
      'A chegada do mercado de carbono a esses territórios pode gerar novas fontes de renda, mas também envolve decisões sobre a terra, o uso dos recursos naturais e a distribuição dos benefícios e dos riscos.',
    ]),
    antesDestaque: line(
      'Antes de participar · Destaque',
      'Quem conserva o território deve participar das decisões e dos benefícios.',
    ),

    // 18988:8806
    rendaTitulo: line('Renda · Título', 'Como o carbono pode gerar renda?'),
    rendaTexto: text('Renda · Texto', [
      'Projetos de carbono podem remunerar atividades que reduzam emissões ou retirem carbono da atmosfera, como a conservação da vegetação e a recuperação de áreas degradadas.',
      'Essa renda, porém, não é automática nem garantida. Ela depende da quantidade de carbono reconhecida, das regras adotadas, dos custos de certificação, do preço dos créditos e dos acordos estabelecidos entre comunidades, proprietários, empresas e outros participantes.',
      'Por isso, os recursos do mercado de carbono devem ser entendidos como uma fonte complementar de renda, e não como substitutos das políticas públicas de conservação, produção de alimentos e desenvolvimento dos territórios.',
    ]),

    // 18988:8811, text beside the photo
    terraTitulo: line('Direito sobre a terra · Título', 'Por que o direito sobre a terra importa?'),
    terraTexto: text('Direito sobre a terra · Texto', [
      'Para desenvolver um projeto de carbono, é necessário saber quem possui direitos sobre a área, quem utiliza seus recursos e quem será afetado pelas atividades propostas.',
      'Em territórios com conflitos ou insegurança sobre a posse da terra, um projeto pode ampliar disputas existentes. Também pode favorecer agentes com maior capacidade financeira e jurídica, enquanto comunidades e pequenos proprietários enfrentam mais dificuldades para participar.',
      'Reconhecer os direitos territoriais é, portanto, uma condição essencial para que os projetos não aprofundem desigualdades. A expansão de usinas eólicas e solares na Caatinga mostra o risco: benefícios concentrados em poucos agentes e custos ambientais e sociais distribuídos para as comunidades, com contratos de arrendamento de longa duração e prejuízos à agricultura familiar.',
    ]),

    // 18988:8818; the two shares are 18988:8824.
    leiTitulo: line('Lei · Título', 'O que a lei já garante?'),
    leiTexto: text('Lei · Texto', [
      'A Lei nº 15.042/2024, que criou o mercado regulado de carbono no Brasil, reconhece que os créditos gerados em terras indígenas, em territórios de povos e comunidades tradicionais e em lotes de assentamentos pertencem a essas populações.',
      'Para povos indígenas e comunidades tradicionais, os projetos dependem de consulta livre, prévia e informada, e a lei assegura a essas populações no mínimo 50% dos créditos em projetos de remoção e 70% em projetos de redução do desmatamento. Para os assentados, a lei reconhece a titularidade, mas não fixa esses percentuais mínimos nem exige a consulta.',
    ]),
    garantia1Valor: line('Lei · Garantia 1 · Valor', 'mín. 50%'),
    garantia1Rotulo: line('Lei · Garantia 1 · Rótulo', 'créditos de remoção'),
    garantia2Valor: line('Lei · Garantia 2 · Valor', 'mín. 70%'),
    garantia2Rotulo: line('Lei · Garantia 2 · Rótulo', 'redução do desmatamento'),
    leiFechamento: paragraph(
      'Lei · Texto depois das garantias',
      'Essas garantias são importantes, mas não eliminam as diferenças de informação, capacidade técnica e poder de negociação entre comunidades e empresas. Na prática, dependem de assessoria independente, contratos transparentes e possibilidade real de recusa.',
    ),

    // 18988:8842
    decisoesTitulo: line('Decisões · Título', 'Quem decide sobre os projetos?'),
    decisoesTexto: text('Decisões · Texto', [
      'Os povos e as comunidades devem participar desde o início, antes que as principais decisões sejam tomadas. Para isso, precisam ter acesso a informações claras sobre o funcionamento do projeto, sua duração, os resultados esperados, os riscos e as responsabilidades assumidas.',
      'A participação deve incluir tempo adequado para discussão, apoio técnico e jurídico independente e liberdade para aceitar, propor mudanças ou recusar o projeto.',
      'Participar não é apenas ser informado: é poder influenciar a decisão.',
    ]),

    // 18988:8847
    beneficiosTitulo: line('Benefícios · Título', 'Como os benefícios devem ser repartidos?'),
    beneficiosTexto: text('Benefícios · Texto', [
      'A repartição de benefícios deve ser definida de forma transparente e construída com as pessoas envolvidas. Os acordos precisam indicar quem receberá os recursos, como os valores serão distribuídos e quais responsabilidades caberão a cada participante.',
      'Também é necessário considerar quem já conservava o território antes do projeto. As regras do mercado costumam pagar apenas por resultados "adicionais", o que pode excluir ou desvalorizar comunidades que protegem a vegetação há décadas. Da mesma forma, exigências de permanência podem transferir às famílias a responsabilidade por incêndios, secas e outros eventos fora de seu controle.',
      'Uma repartição justa não pode se limitar a pagamentos pontuais. Deve reconhecer o trabalho, os conhecimentos e a contribuição das populações para a conservação do território.',
    ]),

    // 18988:8852, the red card.
    cuidadosTitulo: line('Cuidados · Título', 'Quais cuidados devem ser observados?'),
    cuidadosIntroducao: line('Cuidados · Frase antes da lista', 'Um projeto de carbono não deve:'),
    cuidadosItens: list('Cuidados · Lista', [
      'Restringir os modos de vida e de produção das comunidades',
      'Transferir riscos desproporcionais para as famílias',
      'Retirar das populações o controle sobre seus dados e territórios',
      'Impor contratos de longa duração sem compreensão de suas consequências',
      'Concentrar os recursos em empresas e intermediários',
      'Desconsiderar atividades como a agricultura familiar e a produção de alimentos',
      'Substituir políticas públicas de conservação, combate à desertificação e desenvolvimento dos territórios',
    ]),
    cuidadosFechamento: paragraph(
      'Cuidados · Texto depois da lista',
      'Para ser considerado íntegro, o projeto precisa produzir benefícios reais para o clima e respeitar os direitos, as decisões e as formas de organização das populações envolvidas.',
    ),

    // 18988:8883 (heading) and 18988:8886 (tiles). The heading repeats the
    // first section's title word for word; flagged to the content owner. One
    // field per tile, since each has its own icon (PERGUNTAS_ICONES).
    perguntasTitulo: line('Perguntas · Título', 'Antes de participar de um projeto'),
    perguntasIntroducao: line('Perguntas · Frase antes das perguntas', 'É importante saber:'),
    pergunta1: line('Pergunta 1', 'Quem propõe e quem financia o projeto?'),
    pergunta2: line('Pergunta 2', 'Quem possui direitos sobre a terra e sobre os créditos?'),
    pergunta3: line('Pergunta 3', 'Por quanto tempo o contrato será válido?'),
    pergunta4: line('Pergunta 4', 'Como os benefícios serão calculados e repartidos?'),
    // A no-break space glues "os riscos?" so the line breaks after "e", as
    // Figma 18988:8918 sets it.
    pergunta5: line('Pergunta 5', 'Quem assumirá os custos e os riscos?'),
    pergunta6: line('Pergunta 6', 'Quais atividades poderão ser realizadas no território?'),
    pergunta7: line('Pergunta 7', 'Como será feito o monitoramento e quem controlará os dados?'),
    pergunta8: line('Pergunta 8', 'O que acontece se a comunidade decidir não participar?'),

    // 18988:8941
    fechamento: paragraph(
      'Texto de encerramento',
      'Compreender essas questões ajuda comunidades, gestores e demais interessados a avaliar se um projeto contribui para a conservação da Caatinga e para o bem-estar de quem vive em seus territórios. Em caso de dúvida, procure apoio de organizações do território, da assistência técnica, de universidades ou da Defensoria Pública antes de assinar qualquer acordo.',
    ),
  },
})

export const CARBONO_E_COMUNIDADES_IMAGEM = {
  src: '/images/sobre/lago-serra.webp',
  alt: 'Lago de águas calmas ao pé de um morro rochoso coberto de vegetação da Caatinga, sob céu azul',
}

// A question tile's icon, as the design composes it: most are one SVG; "paid"
// and "calendar month" are an empty 85px frame with the glyph inset in it, by
// the percentages of the frame the design gives (vertical, horizontal).
export type IconePergunta = {
  src: string
  glyph?: { src: string; insetY: string; insetX: string }
}

export type Pergunta = { pergunta: string; icone: IconePergunta }

const ICONES = '/icons/sobre'

// One per question, in the order the questions show.
export const PERGUNTAS_ICONES: IconePergunta[] = [
  { src: `${ICONES}/paid.svg`, glyph: { src: `${ICONES}/paid-glyph.svg`, insetY: '8.33%', insetX: '8.33%' } },
  { src: `${ICONES}/home-work.svg` },
  {
    src: `${ICONES}/calendar-month.svg`,
    glyph: { src: `${ICONES}/calendar-month-glyph.svg`, insetY: '8.33%', insetX: '12.5%' },
  },
  { src: `${ICONES}/calculate.svg` },
  { src: `${ICONES}/insert-chart.svg` },
  { src: `${ICONES}/real-estate-agent.svg` },
  { src: `${ICONES}/monitoring.svg` },
  { src: `${ICONES}/group-off.svg` },
]

export function perguntas(copy: Copy<typeof CARBONO_E_COMUNIDADES>): Pergunta[] {
  const textos = [
    copy.pergunta1,
    copy.pergunta2,
    copy.pergunta3,
    copy.pergunta4,
    copy.pergunta5,
    copy.pergunta6,
    copy.pergunta7,
    copy.pergunta8,
  ]

  return textos.map((pergunta, i) => ({ pergunta, icone: PERGUNTAS_ICONES[i] }))
}
