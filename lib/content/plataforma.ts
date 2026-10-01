// Structure of the "Conheça a plataforma" tabbed section (Plataforma,
// Figma node 18862:8546, "Sobre"). The first tab's copy comes from that node;
// the other three from its variant instances on the same page, 18916:9520
// ("A Caatinga"), 18916:9585 ("Carbono e comunidades") and 18916:9650
// ("Como funciona"). The copy itself (label, title, image alt text, body,
// highlight) lives in translations/<locale>/Plataforma.json under tabs.<key>.
// Image alt text is not in the design and is written there.

export type AbaPlataforma = {
  // Anchor and aria id of the tab.
  id: string
  // Key of the tab in Plataforma.json (tabs.<key>).
  key: 'oQueE' | 'aCaatinga' | 'carbonoEComunidades' | 'comoFunciona'
  imagem: string
}

export const ABAS_PLATAFORMA: AbaPlataforma[] = [
  { id: 'o-que-e', key: 'oQueE', imagem: '/images/plataforma/o-que-e.webp' },
  { id: 'a-caatinga', key: 'aCaatinga', imagem: '/images/plataforma/a-caatinga.webp' },
  {
    id: 'carbono-e-comunidades',
    key: 'carbonoEComunidades',
    imagem: '/images/plataforma/carbono-e-comunidades.webp',
  },
  { id: 'como-funciona', key: 'comoFunciona', imagem: '/images/plataforma/como-funciona.webp' },
]
