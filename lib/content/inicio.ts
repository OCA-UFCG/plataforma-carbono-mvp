import { defineCopy, line, paragraph } from './site/model'

// Copy of the landing's hero. The Destaques, "Conheça a plataforma" and "Duas
// formas de explorar os dados" sections have their own modules (destaques.ts,
// plataforma.ts, caminhos.ts).

// The hero shows four photos, each with its own card (components/marketing/
// Hero.tsx): the h1 and lead set like Figma nodes 18862:8525 and 18862:8526,
// with the copy of the content doc's 2026-10-05 meeting. The photos, their
// order and where each button leads stay in the component.
export const INICIO_HERO = defineCopy({
  id: 'inicioHero',
  name: 'Início · Hero',
  description:
    'Textos dos quatro cartões do topo da página inicial, um por foto, na ordem em que aparecem. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    foto1Titulo: line('Foto 1 · Título', 'Dados abertos e mapas para entender o carbono na Caatinga'),
    foto1Texto: paragraph(
      'Foto 1 · Texto',
      'Informação aberta para que comunidades e gestores avaliem projetos de carbono e negociem em condições mais justas',
    ),
    foto1Botao: line('Foto 1 · Botão (abre Sobre)', 'Sobre a iniciativa'),
    // Spells out the name.
    foto2Titulo: line('Foto 2 · Título', 'Caativar: Caatinga, Valorização, Autonomia e Renda'),
    foto2Texto: paragraph(
      'Foto 2 · Texto',
      'Informação que valoriza a Caatinga e fortalece autonomia e renda dos territórios',
    ),
    foto2Botao: line('Foto 2 · Botão (abre Comunicação)', 'Acesse os materiais'),
    foto3Titulo: line('Foto 3 · Título', 'Uma forma simplificada de conhecer mais sobre diferentes territórios'),
    foto3Texto: paragraph(
      'Foto 3 · Texto',
      'Obtenha um panorama resumido com dados sobre carbono, pressões ambientais e clima para o território do seu interesse',
    ),
    foto3Botao: line('Foto 3 · Botão (abre o Resumo territorial)', 'Acesse o resumo territorial'),
    foto4Titulo: line('Foto 4 · Título', 'Em breve: Plataforma de dados ambientais'),
    foto4Texto: paragraph(
      'Foto 4 · Texto',
      'Uma plataforma que reúne dados de carbono, vegetação, solo e clima para diferentes áreas da Caatinga',
    ),
    foto4Botao: line('Foto 4 · Botão (abre a plataforma)', 'Acesse a plataforma'),
  },
})
