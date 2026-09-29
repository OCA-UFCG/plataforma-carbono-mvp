// Shared frame of the internal pages: the grey intro band at the top and the
// photo band above the footer. Taken from the Figma frames "Sobre" (18988:8611,
// the same intro on all four Sobre pages) and "Comunicação" (18978:2048). The
// copy lives in translations/<locale>/: SobreIntro.json (Sobre intro),
// SobrePlataformaPage.json (band), ComunicacaoPage.json (intro and band). Each
// page's own content lives in its own module.

// What PageIntro renders, already translated.
export type PageIntroContent = {
  eyebrow: string
  title: string
  intro: string
}

// What PhotoBand renders, already translated.
export type PhotoBandContent = {
  image: string
  eyebrow?: string
  title: string
  items?: string[]
}

// The Comunicação intro (Figma node 18978:2050): its paragraph repeats the
// landing's description of the platform word for word; it looks like
// placeholder copy, and is an open question to the content owner (issue #44,
// question 4).

// Figma node 18988:8651, at the foot of "Conheça a plataforma" only. `itens`
// are the keys of the list under band.items in SobrePlataformaPage.json.
export const SOBRE_FAIXA = {
  image: '/images/faixas/sobre.webp',
  itens: ['noSale', 'noCertification', 'noSubstitution'],
}

// Figma node 18978:2080. The band's text is band.{eyebrow,title} in
// ComunicacaoPage.json.
export const COMUNICACAO_FAIXA = {
  image: '/images/faixas/comunicacao.webp',
}
