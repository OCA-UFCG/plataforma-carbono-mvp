import type { CopyType } from './model'
import { INICIO_HERO } from '../inicio'
import { INICIO_DESTAQUES } from '../destaques'
import { INICIO_PLATAFORMA } from '../plataforma'
import { INICIO_CAMINHOS } from '../caminhos'
import { COMUNICACAO_PAGINA, SOBRE_INTRO } from '../paginas'
import { SOBRE_PLATAFORMA } from '../sobre/plataforma'
import { CAATINGA } from '../sobre/caatinga'
import { CARBONO_E_COMUNIDADES } from '../sobre/carbono-e-comunidades'
import { COMO_FUNCIONA } from '../sobre/como-funciona'

// Every content type of the institutional copy, in the order the site shows
// them. scripts/contentful-provision.mts creates them and seeds each with its
// shipped values.
export const SITE_COPY_TYPES: CopyType[] = [
  INICIO_HERO,
  INICIO_DESTAQUES,
  INICIO_PLATAFORMA,
  INICIO_CAMINHOS,
  SOBRE_INTRO,
  SOBRE_PLATAFORMA,
  CAATINGA,
  CARBONO_E_COMUNIDADES,
  COMO_FUNCIONA,
  COMUNICACAO_PAGINA,
]
