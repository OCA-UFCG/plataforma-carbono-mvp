import { defineCopy, line, list, paragraph, text } from '../site/model'

// Content of "Entenda essa relação" (/sobre/carbono-e-comunidades), Figma frame
// 18988:8769, content node 18988:8798, copied verbatim. "Consulta livre,
// prévia e informada" carries an "ⓘ" in the design for a glossary it does not
// define (issue #44, question 3); the marker is left out until that content
// exists, rather than rendering an icon that does nothing. Image alt text is
// not in the design and is written here.

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

    // 18988:8818
    leiTitulo: line('Lei · Título', 'O que a lei já garante?'),
    leiTexto: text('Lei · Texto', [
      'A Lei nº 15.042/2024, que criou o mercado regulado de carbono no Brasil, reconhece que os créditos gerados em terras indígenas, em territórios de povos e comunidades tradicionais e em lotes de assentamentos pertencem a essas populações.',
      'Para povos indígenas e comunidades tradicionais, os projetos dependem de consulta livre, prévia e informada, e a lei assegura a essas populações no mínimo 50% dos créditos em projetos de remoção e 70% em projetos de redução do desmatamento. Para os assentados, a lei reconhece a titularidade, mas não fixa esses percentuais mínimos nem exige a consulta.',
    ]),
    leiFechamento: paragraph(
      'Lei · Texto depois das garantias',
      'Essas garantias são importantes, mas não eliminam as diferenças de informação, capacidade técnica e poder de negociação entre comunidades e empresas. Na prática, dependem de assessoria independente, contratos transparentes e possibilidade real de recusa.',
    ),

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
  },
})

export const CARBONO_E_COMUNIDADES_IMAGEM = {
  src: '/images/sobre/lago-serra.webp',
  alt: 'Lago de águas calmas ao pé de um morro rochoso coberto de vegetação da Caatinga, sob céu azul',
}
