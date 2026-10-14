# Territórios Copy in Contentful Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors change the words of the Territórios story (`/territorios`, the "Resumo territorial") in Contentful, with the code's text as the fallback, as the institutional pages already do.

**Architecture:** The story's copy becomes eight Contentful types declared with the existing `defineCopy` model in `lib/content/territorios.ts`: one per tab, one for the presentation over the gallery and one for the shared part of "Sobre os dados". A copy field may declare placeholders (`{anoInicial}`). The copy model refuses an entry that names any other placeholder and uses the code's text for that field; the page fills the declared ones. The server page reads the copy with `loadSiteCopy` and passes plain strings to a client `StoryScriptProvider`, which builds the story's script with `storyScript(copy)` (`config/territorios/storyScript.ts`). `lib/territorios/storyText.ts` then reads every sentence from that script instead of from module constants.

**Tech Stack:** Next.js 16 (App Router), React 19, strict TypeScript, Vitest (node environment), Contentful GraphQL delivery API and the CMA provisioning script `scripts/contentful-provision.mts`.

**Spec:** There is no separate spec document. The scope is the one agreed in conversation on 2026-10-09:
- **Part A (Tasks 1–6)** moves the fixed text: the presentation, each tab's question, the summary card titles and "Sobre os dados". The years in those texts become placeholders.
- **Part B (Tasks 7–8)** moves the answers and the summary sentences, which carry numbers. It ships only if the editors ask to rewrite those sentences; Part A stands on its own.

## Global Constraints

- Code, comments, commits and the PR are in English. UI strings and everything an editor reads in Contentful (type names, descriptions, field names, help texts) are in Portuguese (CLAUDE.md).
- The shipped text must not change by a single byte. `tests/lib/territoriosStoryText.test.ts` asserts today's exact strings and must pass with only the edits listed in Task 4. Keep the no-break spaces (` `) of "t C" in Part B.
- These stay in code, in `config/territorios/`: interface labels (`UI`, `REPORT`, `CHOOSER`, `INTRO.changeType`, `STEP_LABELS`), `MAP_LOCALE`, the chart descriptions (`CHART_SCRIPT`, `RAIN_KIND_LABELS`), the summary's badges (`READING_LABELS` and the flux badges), the grammar tables (`STATE_LOCATIVE`, `FEMININE_TYPES`, `TERRITORY_SCRIPT.rankValue`) and `TERRITORY_SCRIPT.title`.
- Contentful limits, already enforced by `tests/lib/siteCopy.test.ts`: at most 50 fields per type, at most 256 characters in a `line`, one entry per type. Seeding never overwrites an entry.
- Nothing is written to the Contentful space (`npm run contentful:provision -- --apply`, or any MCP write) without the user's go-ahead in the session. `.env.local` has no `CONTENTFUL_MANAGEMENT_TOKEN`, so the user runs the apply.
- CI runs only `npm run build` and `npm run contrast`. Run `npm test`, `npm run lint` and `npm run build` locally before every PR.
- Branch names in English, no co-author trailers in commits, PR title and body in English.
- Two open PRs touch these files:
  - #101 (`feat/public-site`) removes the session check from `app/(territorios)/territorios/page.tsx` and edits a comment line in `lib/content/site/model.ts`. Fetch and rebase before Task 1. If #101 merged first, the page has no redirect, and Task 5's `loadSiteCopy` call goes at the top of the function.
  - #110 (`fix/estados-sem-maranhao`) changes "A Caatinga inteira, em dez estados." to "em nove estados". In Part B, copy the string as `main` has it when you get there.

## Review Focus

1. **An editor writes a placeholder the field does not fill, or leaves a brace unpaired** (`{porcentagem}`, `{percentual`). That field shows the shipped text, never braces, and the space test names the field. Pinned in Task 1 (model), Task 4 (story) and Task 6 (live space).
2. **The page is deployed before the types exist in the space, or Contentful is down.** `/territorios` shows today's text exactly. Pinned in Task 4: the story-text suite runs on the shipped script built from the defaults. The Task 5 rendered check runs before provisioning.
3. **An editor types a line break in a "Sobre os dados" text.** The help text promises a line break, so one shows on screen and on the printed sheet. Pinned in Task 5 (CSS plus the rendered check).
4. **An editor gives two "Sobre os dados" items the same title.** Both items render, and React sees no duplicate key. Pinned in Task 5.
5. **An editor writes a question longer than ten words.** The page shows it anyway, and the live space test flags it. Pinned in Task 6.

## File map

| File | Part | Responsibility |
|---|---|---|
| `lib/content/site/model.ts` | A | Placeholders: declared on a field, checked against an entry, filled by the page |
| `lib/content/site/provision.ts` | A | Lists a field's placeholders in its Contentful help text |
| `lib/content/territorios.ts` (new) | A, B | The eight copy types, `TERRITORIOS_COPY`, `TerritoriosCopy`, `territoriosCopyDefaults()` |
| `lib/content/site/types.ts` | A | Registers the eight types for provisioning and the space test |
| `config/territorios/storyScript.ts` | A, B | `storyScript(copy)`, `StoryScript`, `SHIPPED_STORY_SCRIPT`; keeps the strings that stay in code |
| `config/territorios/chooserScript.ts` | A | `INTRO` keeps only `changeType` |
| `lib/territorios/storyText.ts` | A | Reads the script from its input |
| `components/territorios/StoryScriptContext.tsx` (new) | A | `StoryScriptProvider`, `useStoryScript()` |
| `components/territorios/{TerritoriosApp,TypeCards,ThemeStep,StorySummary}.tsx` | A | Read the script |
| `app/(territorios)/territorios/page.tsx` | A | Loads the copy and provides it |
| `app/territorios-resumo.css` | A | Keeps an editor's line breaks in "Sobre os dados" |
| `tests/lib/siteCopy.test.ts`, `tests/scripts/contentfulProvision.test.ts` | A | Placeholders in the model and in the help text |
| `tests/lib/territoriosCopy.test.ts` (new) | A, B | The types and `storyScript()` |
| `tests/lib/territoriosStoryText.test.ts` | A | Passes the shipped script; one new test |
| `tests/lib/contentfulSpace.test.ts` | A | Placeholders and question length in the live space |
| `CLAUDE.md`, `DOCUMENTACAO.md` | A, B | Where the story's copy lives |

---

## Part A — the fixed text

### Task 0: Workspace

- [ ] **Step 1: Reuse a merged worktree.** The disk is at 92% and every worktree carries about 1.3 GB of `node_modules`. PR #108 is merged, so reuse its worktree:

```bash
cd /home/ezequias/oca/worktrees/territorios-card-photos
git status --short            # must be empty; stop and ask if not
git fetch -q origin
git switch -c feat/territorios-copy-contentful origin/main
npm ci
```

- [ ] **Step 2: Commit this plan on the branch**

```bash
cp /home/ezequias/oca/plataforma-carbono-mvp/docs/superpowers/plans/2026-10-09-territorios-copy-contentful.md docs/superpowers/plans/
git add docs/superpowers/plans/2026-10-09-territorios-copy-contentful.md
git commit -m "docs: add the plan for the Territórios copy in Contentful"
```

Every later command runs in this worktree.

### Task 1: Placeholders in the copy model

**Files:**
- Modify: `lib/content/site/model.ts`
- Test: `tests/lib/siteCopy.test.ts`

**Interfaces:**
- Produces:
  - `type Placeholders = Record<string, string>` maps a placeholder name to what the page puts there, in Portuguese.
  - `CopyField.placeholders?: Placeholders`
  - `line(name, value, placeholders?)` and `paragraph(name, value, placeholders?)`
  - `placeholdersIn(value: string): string[]`
  - `fitsPlaceholders(value: string, placeholders?: Placeholders): boolean`
  - `fillPlaceholders(value: string, values: Record<string, string | number>): string`
  - `rejectedFields(type: CopyType, entry: Record<string, unknown>): string[]`
  - `copyFromEntry` uses the shipped value for a field whose text fails `fitsPlaceholders`.

- [ ] **Step 1: Write the failing tests**

In `tests/lib/siteCopy.test.ts`, extend the model import:

```ts
import {
  LINE_MAX_LENGTH,
  copyDefaults,
  copyFromEntry,
  defineCopy,
  fillPlaceholders,
  fitsPlaceholders,
  line,
  list,
  optionalLine,
  paragraph,
  parseCopy,
  placeholdersIn,
  rejectedFields,
  text,
} from '@/lib/content/site/model'
```

Below `const TIPO = …`, add:

```ts
const MODELO = defineCopy({
  id: 'modelo',
  name: 'Modelo',
  description: 'Tipo de teste com marcadores.',
  fields: {
    frase: line('Frase', 'Eram {percentual} em {ano}.', { percentual: 'percentual', ano: 'ano' }),
    nota: paragraph('Nota', 'De {ano} até hoje.', { ano: 'ano' }),
    livre: line('Livre', 'Sem marcadores declarados.'),
  },
})

describe('placeholders', () => {
  it('lists the placeholders a text names, each once', () => {
    expect(placeholdersIn('De {ano} a {fim}, desde {ano}.')).toEqual(['ano', 'fim'])
    expect(placeholdersIn('Sem marcador.')).toEqual([])
  })

  // Dropping a figure from a sentence is the editor's call.
  it('accepts a text naming only declared placeholders, or leaving some out', () => {
    const declared = { percentual: '', ano: '' }
    expect(fitsPlaceholders('Eram {percentual} em {ano}.', declared)).toBe(true)
    expect(fitsPlaceholders('Eram {percentual}.', declared)).toBe(true)
  })

  it('refuses an unknown placeholder and an unpaired or empty brace', () => {
    const declared = { percentual: '', ano: '' }
    expect(fitsPlaceholders('Eram {porcentagem} em {ano}.', declared)).toBe(false)
    expect(fitsPlaceholders('Eram {percentual em {ano}.', declared)).toBe(false)
    expect(fitsPlaceholders('Eram percentual} em {ano}.', declared)).toBe(false)
    expect(fitsPlaceholders('Eram {} em {ano}.', declared)).toBe(false)
  })

  it('refuses a name every object inherits, which no field declares', () => {
    expect(fitsPlaceholders('{constructor}', {})).toBe(false)
  })

  it('fills every occurrence, a number as written', () => {
    expect(fillPlaceholders('Eram {percentual} em {ano}; {ano}.', { percentual: '34%', ano: 1985 }))
      .toBe('Eram 34% em 1985; 1985.')
  })
})
```

Inside `describe('copyFromEntry', …)`, add:

```ts
  // Braces on the page would read worse than the shipped wording.
  it('falls back on a text naming a placeholder its field does not fill', () => {
    const copy = copyFromEntry(MODELO, { frase: 'Eram {porcentagem} em {ano}.', nota: 'Desde {ano}.\n\n{fim}' })
    expect(copy.frase).toBe('Eram {percentual} em {ano}.')
    expect(copy.nota).toBe('De {ano} até hoje.')
  })

  it('takes a text that leaves a placeholder out', () => {
    expect(copyFromEntry(MODELO, { frase: 'Eram {percentual}.' }).frase).toBe('Eram {percentual}.')
  })

  it('checks braces only on a field that declares placeholders', () => {
    expect(copyFromEntry(MODELO, { livre: 'Outras {chaves}.' }).livre).toBe('Outras {chaves}.')
  })
```

After the `copyFromEntry` describe, add:

```ts
describe('rejectedFields', () => {
  it('names the fields of an entry the page replaces with the shipped value', () => {
    expect(rejectedFields(MODELO, { frase: 'Eram {porcentagem}.', nota: 'Desde {ano}.', livre: '{x}' })).toEqual(['frase'])
    expect(rejectedFields(MODELO, { frase: null })).toEqual([])
  })
})
```

Inside `describe('the institutional copy', …)`, add:

```ts
  // A declared placeholder the shipped value never uses is one the help text
  // promises and the page may never fill; an undeclared one would be refused.
  it('declares exactly the placeholders each shipped value names', () => {
    for (const type of SITE_COPY_TYPES) {
      for (const [id, field] of Object.entries(type.fields)) {
        expect(placeholdersIn(field.default).sort(), `${type.id}.${id}`)
          .toEqual(Object.keys(field.placeholders ?? {}).sort())
      }
    }
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/siteCopy.test.ts`
Expected: FAIL with `placeholdersIn is not a function`, and the `copyFromEntry` placeholder cases fail.

- [ ] **Step 3: Implement**

In `lib/content/site/model.ts`:

1. After `export type CopyKind = …`, add:

```ts
// What each placeholder of a field becomes, in Portuguese, by name. A field
// the page fills in names them between braces, as in "Eram {percentual} em
// {anoInicial}.", and the help text under it in Contentful lists them.
export type Placeholders = Record<string, string>
```

2. Add a member to `CopyField`, after `optional?: boolean`:

```ts
  // Set on a line or paragraph the page fills in. An entry whose text names
  // any other placeholder, or leaves a brace unpaired, gets the shipped value
  // for this field.
  placeholders?: Placeholders
```

3. Replace `line` and `paragraph`:

```ts
export function line(name: string, value: string, placeholders?: Placeholders): CopyField<'line'> {
  return { kind: 'line', name, default: value, ...(placeholders && { placeholders }) }
}
```

```ts
export function paragraph(name: string, value: string, placeholders?: Placeholders): CopyField<'paragraph'> {
  return { kind: 'paragraph', name, default: value, ...(placeholders && { placeholders }) }
}
```

4. After `parseCopy`, add:

```ts
const PLACEHOLDER = /\{(\w+)\}/g

// The placeholder names a text uses, each once, in the order they first appear.
export function placeholdersIn(value: string): string[] {
  return [...new Set(Array.from(value.matchAll(PLACEHOLDER), (match) => match[1]))]
}

// Whether every brace in the text belongs to a placeholder the field
// declares. Leaving a declared one out is fine.
export function fitsPlaceholders(value: string, placeholders: Placeholders = {}): boolean {
  const rest = value.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(placeholders, name) ? '' : match))

  return !/[{}]/.test(rest)
}

// Fills a text's placeholders. copyFromEntry has already refused a text naming
// one its field does not declare.
export function fillPlaceholders(value: string, values: Record<string, string | number>): string {
  return value.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : match))
}

function fitsField(field: CopyField, value: string | string[]): boolean {
  return !field.placeholders || [value].flat().every((part) => fitsPlaceholders(part, field.placeholders))
}
```

5. In `copyFromEntry`, replace the body of the loop:

```ts
  for (const [id, field] of Object.entries(type.fields)) {
    const raw = entry?.[id]
    const parsed = typeof raw === 'string' ? parseCopy(field.kind, raw) : null

    if (parsed !== null && !fitsField(field, parsed)) {
      values[id] = parseCopy(field.kind, field.default)
    } else if (field.optional && entry) {
      values[id] = parsed ?? parseCopy(field.kind, '')
    } else {
      values[id] = parsed === null || isEmpty(parsed) ? parseCopy(field.kind, field.default) : parsed
    }
  }
```

Also extend the comment above `copyFromEntry` with: `A text naming a placeholder its field does not declare falls back the same way.`

6. After `copyDefaults`, add:

```ts
// The fields of an entry whose text the page refuses for naming a placeholder
// the field does not fill; tests/lib/contentfulSpace.test.ts lists them.
export function rejectedFields(type: CopyType, entry: Record<string, unknown>): string[] {
  return Object.entries(type.fields)
    .filter(([id, field]) => {
      const raw = entry[id]

      return typeof raw === 'string' && !fitsField(field, parseCopy(field.kind, raw))
    })
    .map(([id]) => id)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/siteCopy.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/site/model.ts tests/lib/siteCopy.test.ts
git commit -m "feat: let a copy field name placeholders the page fills in"
```

### Task 2: Placeholders in Contentful's help text

**Files:**
- Modify: `lib/content/site/provision.ts`
- Test: `tests/scripts/contentfulProvision.test.ts`

**Interfaces:**
- Consumes: `Placeholders` and `CopyField.placeholders` (Task 1).
- Produces:
  - `ProvisionedField.placeholders?: Placeholders`
  - `toEditorControl(field).settings.helpText` ends with `Marcadores: {nome} = significado; …` when the field has placeholders.

- [ ] **Step 1: Write the failing test**

In `tests/scripts/contentfulProvision.test.ts`, add `toProvisionedType` to the provision import, add `import { defineCopy, line } from '@/lib/content/site/model'` (merge it into the existing model import), and add inside `describe('the provisioned institutional copy', …)`:

```ts
  // The editor sees the braces in the shipped text; the help says what each
  // one becomes and what happens to a name the page does not know.
  it('tells the editor what each placeholder of a field becomes', () => {
    const type = toProvisionedType(defineCopy({
      id: 'modelo',
      name: 'Modelo',
      description: 'Teste.',
      fields: {
        frase: line('Frase', 'Eram {percentual} em {anoInicial}.', {
          percentual: 'parte da área',
          anoInicial: 'primeiro ano dos dados',
        }),
        titulo: line('Título', 'Sem marcador'),
      },
    }))
    const [frase, titulo] = type.fields.map((field) => toEditorControl(field)?.settings.helpText)

    expect(frase).toBe(
      'Uma linha. Marcadores: {percentual} = parte da área; {anoInicial} = primeiro ano dos dados. Mantenha as chaves; com um marcador desconhecido, a página usa o texto padrão.',
    )
    expect(titulo).toBe('Uma linha.')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scripts/contentfulProvision.test.ts -t "placeholder"`
Expected: FAIL, because the help text is only `'Uma linha.'`.

- [ ] **Step 3: Implement**

In `lib/content/site/provision.ts`:

```ts
import { displayField, type CopyKind, type CopyType, type Placeholders } from './model'
```

Add to `ProvisionedField`, after `copy?: CopyKind`:

```ts
  // Set on a copy field the page fills in: what each placeholder becomes.
  placeholders?: Placeholders
```

In `toProvisionedType`, change the field mapping to:

```ts
    fields: Object.entries(copyType.fields).map(([id, field]) => ({
      id,
      name: field.name,
      type: field.kind === 'line' ? 'Symbol' : 'Text',
      required: !field.optional,
      copy: field.kind,
      ...(field.placeholders && { placeholders: field.placeholders }),
    })),
```

Replace `toEditorControl` and add the helper above it:

```ts
// Appended to the help of a field the page fills in. A name the page does not
// know makes it show the shipped text (lib/content/site/model.ts, copyFromEntry).
function placeholderHelp(placeholders: Placeholders): string {
  const names = Object.entries(placeholders).map(([name, meaning]) => `{${name}} = ${meaning}`).join('; ')

  return ` Marcadores: ${names}. Mantenha as chaves; com um marcador desconhecido, a página usa o texto padrão.`
}

export function toEditorControl(field: ProvisionedField) {
  if (!field.copy) return null

  const help = field.required ? COPY_HELP[field.copy] : OPTIONAL_HELP

  return {
    fieldId: field.id,
    widgetNamespace: 'builtin',
    widgetId: field.copy === 'line' ? 'singleLine' : 'multipleLine',
    settings: { helpText: field.placeholders ? help + placeholderHelp(field.placeholders) : help },
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/scripts/contentfulProvision.test.ts tests/lib/siteCopy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/site/provision.ts tests/scripts/contentfulProvision.test.ts
git commit -m "feat: list a field's placeholders in its Contentful help text"
```

### Task 3: The Territórios copy types

**Files:**
- Create: `lib/content/territorios.ts`
- Modify: `lib/content/site/types.ts`
- Test: `tests/lib/territoriosCopy.test.ts` (new)

**Interfaces:**
- Consumes: `line`, `paragraph`, `defineCopy`, `copyDefaults`, `Copy` (Task 1).
- Produces:
  - `TERRITORIOS_APRESENTACAO`, `TERRITORIOS_TERRITORIO`, `TERRITORIOS_ESTOQUE`, `TERRITORIOS_FLUXO`, `TERRITORIOS_USO`, `TERRITORIOS_FOGO`, `TERRITORIOS_CHUVA`, `TERRITORIOS_SOBRE_DADOS`
  - `TERRITORIOS_COPY = { apresentacao, territorio, estoque, fluxo, uso, fogo, chuva, sobre }`
  - `type TerritoriosCopy`, with each key's values as `Copy<…>`
  - `territoriosCopyDefaults(): TerritoriosCopy`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/territoriosCopy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TERRITORIOS_COPY, territoriosCopyDefaults } from '@/lib/content/territorios'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'

describe('the Territórios copy', () => {
  it('has a type per tab, in the order of the tabs, between the presentation and "Sobre os dados"', () => {
    expect(Object.values(TERRITORIOS_COPY).map((t) => t.id)).toEqual([
      'territoriosApresentacao', 'territoriosTerritorio', 'territoriosEstoque', 'territoriosFluxo',
      'territoriosUso', 'territoriosFogo', 'territoriosChuva', 'territoriosSobreDados',
    ])
  })

  // Provisioning, the round-trip checks and the space test all walk this list.
  it('is provisioned with the institutional copy', () => {
    for (const type of Object.values(TERRITORIOS_COPY)) expect(SITE_COPY_TYPES, type.id).toContain(type)
  })

  it('gives every tab its question and its source in "Sobre os dados"', () => {
    const copy = territoriosCopyDefaults()

    for (const tab of [copy.territorio, copy.estoque, copy.fluxo, copy.uso, copy.fogo, copy.chuva]) {
      expect(tab.pergunta).toMatch(/\?$/)
      expect(tab.sobreTitulo).not.toBe('')
      expect(tab.sobreTexto).not.toBe('')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/territoriosCopy.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/content/territorios"`.

- [ ] **Step 3: Implement**

Create `lib/content/territorios.ts`. Every default is today's string from `config/territorios/storyScript.ts` or `chooserScript.ts`, with each year replaced by its placeholder:

```ts
import { copyDefaults, defineCopy, line, paragraph, type Copy } from './site/model'

// Copy of the Territórios story (/territorios, the "Resumo territorial"). Each
// tab has a content type, so an editor finds a tab's words in one entry: its
// question, the title of its card on the summary and its source in "Sobre os
// dados". The presentation over the gallery of types and the shared part of
// "Sobre os dados" have a type each.
//
// What stays in config/territorios/: interface labels (tabs, buttons, loading
// and error messages), the chart descriptions read by screen readers, the
// summary's badges and the grammar tables ("na Paraíba", "3ª"). The years of
// each series are placeholders, filled from config/territorios/story.ts by
// storyScript(), so that a data update does not leave the copy behind.

const ONE_ENTRY = 'Há uma única entrada deste tipo: edite-a, não crie outra.'

const ANO_INICIAL = { anoInicial: 'primeiro ano dos dados' }
const ANO_FINAL = { anoFinal: 'último ano dos dados' }
const ANOS = { ...ANO_INICIAL, ...ANO_FINAL }

function tabDescription(tab: string): string {
  return `Aba "${tab}" do resumo territorial (/territorios): a pergunta, o título do cartão no resumo e a fonte em "Sobre os dados". ${ONE_ENTRY}`
}

export const TERRITORIOS_APRESENTACAO = defineCopy({
  id: 'territoriosApresentacao',
  name: 'Territórios · Apresentação',
  description: `Abertura do resumo territorial (/territorios): o título, que fica também na escolha do território, o texto abaixo dele e o título da galeria de recortes. ${ONE_ENTRY}`,
  fields: {
    titulo: line('Título', 'Que território você quer conhecer?'),
    chamada: line(
      'Texto abaixo do título',
      'Conheça o território do seu interesse em um panorama rápido e acessível sobre estoque e fluxo de carbono, uso da terra, ocorrência de fogo e chuva.',
    ),
    recortesTitulo: line('Título da galeria de recortes', 'Escolha o recorte'),
  },
})

export const TERRITORIOS_TERRITORIO = defineCopy({
  id: 'territoriosTerritorio',
  name: 'Territórios · Território',
  description: `Aba "Território" do resumo territorial (/territorios): a pergunta e a fonte do limite do bioma em "Sobre os dados". ${ONE_ENTRY}`,
  fields: {
    pergunta: line('Pergunta', 'Onde fica e qual é o tamanho?'),
    sobreTitulo: line('Sobre os dados · Título', 'Território'),
    sobreTexto: paragraph('Sobre os dados · Texto', 'Área dentro do limite da Caatinga, segundo o IBGE (2019).'),
  },
})

export const TERRITORIOS_ESTOQUE = defineCopy({
  id: 'territoriosEstoque',
  name: 'Territórios · Estoque',
  description: tabDescription('Estoque'),
  fields: {
    pergunta: line('Pergunta', 'Quanto carbono a vegetação original guardaria aqui?'),
    resumoTitulo: line('Resumo · Título do cartão', 'Carbono da vegetação original'),
    sobreTitulo: line('Sobre os dados · Título', 'Estoque'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'Quarto Inventário Nacional, em quadrados de 100 m. Carbono que a vegetação original guardaria, sem descontar o uso atual da terra; inclui o carbono do solo.',
    ),
    sobreCobertura: line(
      'Sobre os dados · Cobertura parcial',
      'O inventário cobre {percentual} desta área; o total vale só para essa parte.',
      { percentual: 'parte do território com dado do inventário' },
    ),
  },
})

export const TERRITORIOS_FLUXO = defineCopy({
  id: 'territoriosFluxo',
  name: 'Territórios · Fluxo',
  description: tabDescription('Fluxo'),
  fields: {
    pergunta: line('Pergunta', 'As áreas com árvores tiraram ou lançaram carbono do ar?'),
    resumoTitulo: line('Resumo · Título do cartão', 'Carbono trocado com o ar'),
    sobreTitulo: line('Sobre os dados · Título', 'Fluxo'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'Global Forest Watch, versão 1.4.2, 30 m; saldo de {anoInicial} a {anoFinal}. Áreas com árvores: copas cobrindo mais de 30% do chão em 2000, ou ganho de copas de 2000 a 2020.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_USO = defineCopy({
  id: 'territoriosUso',
  name: 'Territórios · Uso da terra',
  description: tabDescription('Uso da terra'),
  fields: {
    pergunta: line('Pergunta', 'Como mudou a vegetação nativa desde {anoInicial}?', ANO_INICIAL),
    resumoTitulo: line('Resumo · Título do cartão', 'Vegetação nativa'),
    sobreTitulo: line('Sobre os dados · Título', 'Uso da terra'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'MapBiomas, coleção 10.1, 30 m, {anoInicial} e {anoFinal}. Vegetação nativa: formações florestal, savânica e campestre, mangue, floresta alagável, restingas, campo alagado e apicum. Agropecuária inclui áreas de lavoura e pasto misturados.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_FOGO = defineCopy({
  id: 'territoriosFogo',
  name: 'Territórios · Fogo',
  description: tabDescription('Fogo'),
  fields: {
    pergunta: line('Pergunta', 'Quanto daqui já queimou desde {anoInicial}?', ANO_INICIAL),
    resumoTitulo: line('Resumo · Título do cartão', 'Área que já queimou'),
    sobreTitulo: line('Sobre os dados · Título', 'Fogo'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'MapBiomas Fogo, coleção 3, 30 m, {anoInicial} a {anoFinal}. Frequência: número de anos com cicatriz de fogo. Área queimada anual: área com cicatriz de fogo no ano.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_CHUVA = defineCopy({
  id: 'territoriosChuva',
  name: 'Territórios · Chuva',
  description: tabDescription('Chuva'),
  fields: {
    pergunta: line('Pergunta', '{anoFinal} foi um ano seco ou chuvoso aqui?', ANO_FINAL),
    resumoTitulo: line('Resumo · Título do cartão', 'Chuva'),
    sobreTitulo: line('Sobre os dados · Título', 'Chuva'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'CHIRPS, 5,6 km, de {anoInicial} a {anoFinal}. Ano seco ou chuvoso: 10% ou mais abaixo ou acima da média do próprio território; entre os dois, normal.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_SOBRE_DADOS = defineCopy({
  id: 'territoriosSobreDados',
  name: 'Territórios · Sobre os dados',
  description: `Parte comum de "Sobre os dados", no fim do resumo territorial; a fonte de cada aba fica no tipo da aba. As notas entram no fim da fonte de uma aba quando o valor vem de um ponto do território ou foi calculado em quadrados maiores que os da camada. ${ONE_ENTRY}`,
  fields: {
    titulo: line('Título', 'Sobre os dados'),
    unidadesTitulo: line('Unidades · Título', 'Unidades'),
    unidadesTexto: paragraph(
      'Unidades · Texto',
      't C é tonelada de carbono; 1 t C equivale a 3,67 t de CO₂. CO₂e soma ao CO₂ outros gases de efeito estufa, como metano e óxido nitroso.',
    ),
    comparacaoTitulo: line('Comparação · Título', 'Comparação com a Caatinga'),
    comparacaoTexto: paragraph(
      'Comparação · Texto',
      'Mesmas fontes e mesmo cálculo; no bioma, fluxo, uso da terra e fogo a 100 m. Perto: diferença menor que 10%.',
    ),
    ponto: line('Nota · Valor de um ponto', 'Aqui, valor de um ponto do território.'),
    escala: line('Nota · Cálculo em quadrados maiores', 'Aqui, calculado a {metros} m.', {
      metros: 'lado do quadrado usado no cálculo, em metros',
    }),
  },
})

// The story's types under the keys storyScript() reads them by, in the order
// of the tabs; lib/content/site/types.ts registers them for provisioning.
export const TERRITORIOS_COPY = {
  apresentacao: TERRITORIOS_APRESENTACAO,
  territorio: TERRITORIOS_TERRITORIO,
  estoque: TERRITORIOS_ESTOQUE,
  fluxo: TERRITORIOS_FLUXO,
  uso: TERRITORIOS_USO,
  fogo: TERRITORIOS_FOGO,
  chuva: TERRITORIOS_CHUVA,
  sobre: TERRITORIOS_SOBRE_DADOS,
}

export type TerritoriosCopy = { [Key in keyof typeof TERRITORIOS_COPY]: Copy<(typeof TERRITORIOS_COPY)[Key]> }

// The copy the story ships with: what it shows without Contentful.
export function territoriosCopyDefaults(): TerritoriosCopy {
  return Object.fromEntries(
    Object.entries(TERRITORIOS_COPY).map(([key, type]) => [key, copyDefaults(type)]),
  ) as TerritoriosCopy
}
```

Before saving, diff each default against its source with `grep -F` on `config/territorios/storyScript.ts` and `chooserScript.ts`. Task 4's suite catches any drift, but this catches it sooner.

In `lib/content/site/types.ts`, add `import { TERRITORIOS_COPY } from '../territorios'`, then append the types at the end of the array and extend its comment:

```ts
// Every content type of the institutional copy, in the order the site shows
// them, then the Territórios story's. scripts/contentful-provision.mts creates
// them and seeds each with its shipped values.
export const SITE_COPY_TYPES: CopyType[] = [
  INICIO_HERO,
  // … unchanged …
  COMUNICACAO_PAGINA,
  ...Object.values(TERRITORIOS_COPY),
]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/territoriosCopy.test.ts tests/lib/siteCopy.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: PASS. The generic suites now also check the new types: unique names, at most 50 fields, lines of at most 256 characters, the seed round trip, exactly the declared placeholders and the help texts.

Run: `npm run contentful:provision`
Expected: a dry run listing the eight `territorios*` types, without contacting the space (no management token).

- [ ] **Step 5: Commit**

```bash
git add lib/content/territorios.ts lib/content/site/types.ts tests/lib/territoriosCopy.test.ts
git commit -m "feat: declare the Territórios copy as Contentful types"
```

### Task 4: Build the story's script from the copy

Behavior does not change in this task. `storyText` reads a script built from the shipped copy, and the components pass that script explicitly until Task 5 swaps in the provider.

**Files:**
- Modify: `config/territorios/storyScript.ts`
- Modify: `config/territorios/chooserScript.ts`
- Modify: `lib/territorios/storyText.ts`
- Modify: `components/territorios/{TerritoriosApp,TypeCards,ThemeStep,StorySummary}.tsx` (temporary `SHIPPED_STORY_SCRIPT`)
- Test: `tests/lib/territoriosStoryText.test.ts`, `tests/lib/territoriosCopy.test.ts`

**Interfaces:**
- Consumes: `TerritoriosCopy`, `territoriosCopyDefaults` (Task 3); `fillPlaceholders` (Task 1).
- Produces:
  - `storyScript(copy: TerritoriosCopy)` returns `{ intro, questions, territory, answers, summary, about }`.
  - `type StoryScript = ReturnType<typeof storyScript>`
  - `SHIPPED_STORY_SCRIPT: StoryScript`
  - `StepInput.script: StoryScript` and `SummaryInput.script: StoryScript`
  - `territoryIndicators({ territory, type, script })`

- [ ] **Step 1: Write the failing tests**

In `tests/lib/territoriosStoryText.test.ts`:

Add an import: `import { SHIPPED_STORY_SCRIPT } from '@/config/territorios/storyScript'`.

Replace the three helpers (around lines 175–191):

```ts
type Input = Omit<SummaryInput, 'script'>

function step(s: Step, territory: TerritoryPayload, type: TerritoryType, response?: ThemeResponse): StepAnswer {
  const out = stepAnswer(s, { territory, type, response, script: SHIPPED_STORY_SCRIPT })
  answers.push(out)
  return out
}

function sheet(input: Input): SummaryRow[] {
  const out = summaryRows({ ...input, script: SHIPPED_STORY_SCRIPT })
  rows.push(...out)
  return out
}

function about(input: Input): AboutItem[] {
  const out = aboutItems({ ...input, script: SHIPPED_STORY_SCRIPT })
  abouts.push(out)
  return out
}
```

In `describe('territoryIndicators', …)`, add `script: SHIPPED_STORY_SCRIPT` to each of the six calls. For example, line 495 becomes:

```ts
    expect(territoryIndicators({ territory: JUAZEIRO, type: municipio, script: SHIPPED_STORY_SCRIPT })).toEqual([
```

The calls at lines 503, 508, 513, 515 and 520 get the same treatment.

Add at the end of `describe('stepAnswer', …)`:

```ts
  it('reads its words from the script it is given', () => {
    const shipped = SHIPPED_STORY_SCRIPT
    const questions = { ...shipped.questions, estoque: 'Quanto carbono há aqui?' }
    expect(stepAnswer('estoque', { territory: CG, type: municipio, script: { ...shipped, questions } }).question)
      .toBe('Quanto carbono há aqui?')

    const answers = { ...shipped.answers, fogo: { ...shipped.answers.fogo, peak: (year: number) => `Pico em ${year}.` } }
    expect(stepAnswer('fogo', { territory: CG, type: municipio, response: CG_ANSWERS.fogo, script: { ...shipped, answers } }).sentence)
      .toBe('Na Caatinga, 12%. Pico em 1999.')

    const summary = { ...shipped.summary, titles: { ...shipped.summary.titles, chuva: 'Precipitação' } }
    expect(summaryRows({ responses: CG_ANSWERS, territory: CG, type: municipio, script: { ...shipped, summary } }).at(-1)?.title)
      .toBe('Precipitação')

    const aboutScript = { ...shipped.about, units: { title: 'Unidades de medida', text: 'Toneladas.' } }
    expect(aboutItems({ responses: CG_ANSWERS, territory: CG, type: municipio, script: { ...shipped, about: aboutScript } }).at(-2))
      .toEqual({ title: 'Unidades de medida', text: 'Toneladas.' })
  })
```

In `tests/lib/territoriosCopy.test.ts`, add these imports:

```ts
import { FIRE_FIRST_YEAR, FLUX_FIRST_YEAR, FLUX_LAST_YEAR, LAND_USE_YEARS, RAIN_LAST_YEAR } from '@/config/territorios/story'
import { SHIPPED_STORY_SCRIPT, storyScript } from '@/config/territorios/storyScript'
import { copyFromEntry } from '@/lib/content/site/model'
import { TERRITORIOS_COPY, territoriosCopyDefaults, type TerritoriosCopy } from '@/lib/content/territorios'
```

(This replaces the earlier `TERRITORIOS_COPY` import line.) Then add:

```ts
// The shipped copy with one type's entry as an editor left it.
function edited<Key extends keyof TerritoriosCopy>(key: Key, entry: Record<string, unknown>): TerritoriosCopy {
  return { ...territoriosCopyDefaults(), [key]: copyFromEntry(TERRITORIOS_COPY[key], entry) } as TerritoriosCopy
}

describe('storyScript', () => {
  it('fills the years of each series from config/territorios/story.ts', () => {
    expect(SHIPPED_STORY_SCRIPT.questions.uso).toBe(`Como mudou a vegetação nativa desde ${LAND_USE_YEARS[0]}?`)
    expect(SHIPPED_STORY_SCRIPT.questions.fogo).toBe(`Quanto daqui já queimou desde ${FIRE_FIRST_YEAR}?`)
    expect(SHIPPED_STORY_SCRIPT.questions.chuva).toBe(`${RAIN_LAST_YEAR} foi um ano seco ou chuvoso aqui?`)
    expect(SHIPPED_STORY_SCRIPT.about.fluxo.text).toContain(`saldo de ${FLUX_FIRST_YEAR} a ${FLUX_LAST_YEAR}.`)
  })

  it('carries an edited question to the story, with its year filled', () => {
    expect(storyScript(edited('uso', { pergunta: 'O que mudou desde {anoInicial}?' })).questions.uso)
      .toBe('O que mudou desde 1985?')
  })

  it('keeps the shipped question when the edit names a placeholder the tab does not fill', () => {
    expect(storyScript(edited('uso', { pergunta: 'O que mudou desde {ano}?' })).questions.uso)
      .toBe('Como mudou a vegetação nativa desde 1985?')
  })

  it('carries the edited presentation, summary title and source', () => {
    const script = storyScript({
      ...edited('apresentacao', { titulo: 'Escolha um território' }),
      fogo: copyFromEntry(TERRITORIOS_COPY.fogo, { resumoTitulo: 'Queimadas', sobreTexto: 'MapBiomas Fogo, {anoInicial}–{anoFinal}.' }),
    })

    expect(script.intro.title).toBe('Escolha um território')
    expect(script.summary.titles.fogo).toBe('Queimadas')
    expect(script.about.fogo.text).toBe('MapBiomas Fogo, 1985–2023.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/territoriosStoryText.test.ts tests/lib/territoriosCopy.test.ts`
Expected: FAIL. `SHIPPED_STORY_SCRIPT` and `storyScript` are undefined, and "reads its words from the script it is given" fails.

- [ ] **Step 3: Build the script in `config/territorios/storyScript.ts`**

1. Replace the header comment's first paragraph:

```ts
// The strings of the Territórios story.
//
// Editors keep the story's words in Contentful (lib/content/territorios.ts);
// storyScript(), at the end of this file, turns that copy into the templates
// lib/territorios/storyText.ts fills, with the years of each series from
// config/territorios/story.ts. What stays here is what the copy leaves in
// code: interface labels, the answers and summary sentences (for now), the
// chart descriptions read by screen readers, the summary's badges and the
// grammar tables.
```

Keep the paragraph that starts "A step shows a question of at most ten words".

2. Add imports:

```ts
import { fillPlaceholders as fill } from '@/lib/content/site/model'
import { territoriosCopyDefaults, type TerritoriosCopy } from '@/lib/content/territorios'
```

3. Delete the `STEP_QUESTIONS` constant, the `ABOUT_SCRIPT` constant, and the `titles` block inside `SUMMARY_ROW_SCRIPT` (with its `satisfies`). Everything else stays.

4. Append at the end of the file:

```ts
/**
 * The story's words, built from the copy editors keep in Contentful. The
 * server reads the copy and sends plain strings, since functions do not cross
 * into a client component; the client builds this once
 * (components/territorios/StoryScriptContext.tsx).
 */
export function storyScript(copy: TerritoriosCopy) {
  const { apresentacao, territorio, estoque, fluxo, uso, fogo, chuva, sobre } = copy
  return {
    intro: {
      title:     apresentacao.titulo,
      lead:      apresentacao.chamada,
      chooseCut: apresentacao.recortesTitulo,
    },
    /** Shown as soon as the step opens, before its data arrives. */
    questions: {
      territorio: territorio.pergunta,
      estoque:    estoque.pergunta,
      fluxo:      fluxo.pergunta,
      uso:        fill(uso.pergunta, { anoInicial: LAND_USE_FIRST }),
      fogo:       fill(fogo.pergunta, { anoInicial: FIRE_FIRST_YEAR }),
      chuva:      fill(chuva.pergunta, { anoFinal: RAIN_LAST_YEAR }),
    } satisfies Record<Exclude<StepId, 'resumo'>, string>,
    territory: {
      biomeShare: TERRITORY_SCRIPT.biomeShare,
      rankText:   TERRITORY_SCRIPT.rankText,
    },
    answers: ANSWER_SCRIPT,
    summary: {
      ...SUMMARY_ROW_SCRIPT,
      titles: {
        estoque: estoque.resumoTitulo,
        fluxo:   fluxo.resumoTitulo,
        uso:     uso.resumoTitulo,
        fogo:    fogo.resumoTitulo,
        chuva:   chuva.resumoTitulo,
      } satisfies Record<ThemeId, string>,
    },
    /** "Sobre os dados", at the end: everything the steps leave out. */
    about: {
      title: sobre.titulo,
      territorio: { title: territorio.sobreTitulo, text: territorio.sobreTexto },
      estoque: {
        title: estoque.sobreTitulo,
        text:  estoque.sobreTexto,
        /** Where the inventory has no pixel, the total leaves that part out. */
        coverage: (pct: string) => fill(estoque.sobreCobertura, { percentual: pct }),
      },
      fluxo: { title: fluxo.sobreTitulo, text: fill(fluxo.sobreTexto, { anoInicial: FLUX_FIRST_YEAR, anoFinal: FLUX_LAST_YEAR }) },
      uso:   { title: uso.sobreTitulo, text: fill(uso.sobreTexto, { anoInicial: LAND_USE_FIRST, anoFinal: LAND_USE_LAST }) },
      fogo:  { title: fogo.sobreTitulo, text: fill(fogo.sobreTexto, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }) },
      chuva: { title: chuva.sobreTitulo, text: fill(chuva.sobreTexto, { anoInicial: RAIN_FIRST_YEAR, anoFinal: RAIN_LAST_YEAR }) },
      units:      { title: sobre.unidadesTitulo, text: sobre.unidadesTexto },
      comparison: { title: sobre.comparacaoTitulo, text: sobre.comparacaoTexto },
      /** Appended to a theme computed at the pixel under an interior point. */
      point:  sobre.ponto,
      /** Appended to a theme reduced coarser than the layer's own scale. */
      coarse: (m: number) => fill(sobre.escala, { metros: numero(m, 0) }),
    },
  }
}

export type StoryScript = ReturnType<typeof storyScript>

/** The story as the code ships it: what the page shows without Contentful. */
export const SHIPPED_STORY_SCRIPT: StoryScript = storyScript(territoriosCopyDefaults())
```

The 250-word comment on `ABOUT_SCRIPT` goes with the constant. Its test (`stays within 250 words…`) keeps guarding the shipped text.

5. In `config/territorios/chooserScript.ts`, reduce `INTRO` to the label that stays:

```ts
export const INTRO = {
  changeType: 'Trocar tipo',
}
```

Change the file's header comment from "the section's title band, its badges and tabs" to "the section's badges and tabs (its title and lead are copy, in lib/content/territorios.ts)".

- [ ] **Step 4: Thread the script through `lib/territorios/storyText.ts`**

1. Header comment: replace "fills the templates of storyScript.ts" with "fills the templates of the script it is given (storyScript() in config/territorios/storyScript.ts)".
2. Replace the storyScript import with:

```ts
import { FEMININE_TYPES, STATE_LOCATIVE, TERRITORY_SCRIPT, type StoryScript } from '@/config/territorios/storyScript'
```

3. Add a member to `SummaryInput` and to `StepInput`:

```ts
  /** The story's words, as storyScript() builds them from the copy. */
  script:    StoryScript
```

4. Make these exact replacements:

| Where | Old | New |
|---|---|---|
| `territoryAnswer` | `({ territory, type }: StepInput)` / `const s = ANSWER_SCRIPT.territorio` | `({ territory, type, script }: StepInput)` / `const s = script.answers.territorio` |
| `territoryIndicators` signature | `({ territory, type }: { territory: TerritoryPayload; type: TerritoryType }): Indicator[]` | `({ territory, type, script }: { territory: TerritoryPayload; type: TerritoryType; script: StoryScript }): Indicator[]` |
| `territoryIndicators` body | `const s = TERRITORY_SCRIPT` | `const s = script.territory` |
| `territoryIndicators` body | `value: s.rankValue(rank.position, feminine)` | `value: TERRITORY_SCRIPT.rankValue(rank.position, feminine)` |
| `stockAnswer` | `({ response, territory, type }: StepInput)` / `ANSWER_SCRIPT.estoque` | `({ response, territory, type, script }: StepInput)` / `script.answers.estoque` |
| `fluxAnswer` | same pattern, `ANSWER_SCRIPT.fluxo` | `script.answers.fluxo` |
| `landUseAnswer` | same pattern, `ANSWER_SCRIPT.uso` | `script.answers.uso` |
| `fireAnswer` | same pattern, `ANSWER_SCRIPT.fogo` | `script.answers.fogo` |
| `rainYearSentence` | `function rainYearSentence(lastMm: number, meanMm: number): string {` + `const s = ANSWER_SCRIPT.chuva` | `function rainYearSentence(s: StoryScript['answers']['chuva'], lastMm: number, meanMm: number): string {` (delete the `const s` line) |
| `rainAnswer` | same pattern, `ANSWER_SCRIPT.chuva`; `rainYearSentence(lastMm, chart.meanMm)` | `script.answers.chuva`; `rainYearSentence(s, lastMm, chart.meanMm)` |
| `stepAnswer` | `const question = STEP_QUESTIONS[step]` | `const question = input.script.questions[step]` |
| `stockRow` | `({ response, territory, type }: StepInput)` / `SUMMARY_ROW_SCRIPT.estoque` / `ANSWER_SCRIPT.estoque.noData` | `({ response, territory, type, script }: StepInput)` / `script.summary.estoque` / `script.answers.estoque.noData` |
| `fluxRow` | same pattern, `fluxo`, `ANSWER_SCRIPT.fluxo.noForest` | `script.summary.fluxo`, `script.answers.fluxo.noForest` |
| `landUseRow` | same pattern, `uso`, `ANSWER_SCRIPT.uso.noData` | `script.summary.uso`, `script.answers.uso.noData` |
| `fireRow` | same pattern, `fogo`, `ANSWER_SCRIPT.fogo.noData` | `script.summary.fogo`, `script.answers.fogo.noData` |
| `rainRow` | same pattern, `chuva`, `ANSWER_SCRIPT.chuva.noData` | `script.summary.chuva`, `script.answers.chuva.noData` |
| `summaryRows` | `title: SUMMARY_ROW_SCRIPT.titles[id]` | `title: input.script.summary.titles[id]` |
| `summaryRows` | `const row = { response, territory: input.territory, type: input.type }` | `const row = { response, territory: input.territory, type: input.type, script: input.script }` |
| `aboutItems` | `const a = ABOUT_SCRIPT` | `const a = input.script.about` |

Afterwards, `grep -n "ANSWER_SCRIPT\|SUMMARY_ROW_SCRIPT\|ABOUT_SCRIPT\|STEP_QUESTIONS" lib/territorios/storyText.ts` must print nothing.

- [ ] **Step 5: Keep the components compiling, with the shipped script for now**

Task 5 replaces each of these with `useStoryScript()`.

- `TypeCards.tsx`: import `SHIPPED_STORY_SCRIPT` from `@/config/territorios/storyScript` instead of `INTRO`, and render `{SHIPPED_STORY_SCRIPT.intro.chooseCut}`.
- `TerritoriosApp.tsx`: import `{ CHOOSER, REPORT }` from chooserScript and `{ SHIPPED_STORY_SCRIPT, TERRITORY_SCRIPT, UI }` from storyScript. Use `SHIPPED_STORY_SCRIPT.intro.title` in `bandTitle` and `SHIPPED_STORY_SCRIPT.intro.lead` in the `lead` prop.
- `ThemeStep.tsx`: import `{ SHIPPED_STORY_SCRIPT, UI }`. Call `stepAnswer(step, { territory, type, response, script: SHIPPED_STORY_SCRIPT })` and `territoryIndicators({ territory, type, script: SHIPPED_STORY_SCRIPT })`.
- `StorySummary.tsx`: import `{ READING_LABELS, SHIPPED_STORY_SCRIPT, SUMMARY_ROW_SCRIPT, TERRITORY_SCRIPT, UI }` (no `ABOUT_SCRIPT`). Set `const input = { responses, territory, type, script: SHIPPED_STORY_SCRIPT }` and render `{SHIPPED_STORY_SCRIPT.about.title}`.

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run tests/lib/territoriosStoryText.test.ts tests/lib/territoriosCopy.test.ts tests/config/territoriosStory.test.ts`
Expected: PASS. Every assertion of today's exact strings holds, which proves the defaults moved byte for byte.

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add config/territorios lib/territorios/storyText.ts components/territorios tests/lib/territoriosStoryText.test.ts tests/lib/territoriosCopy.test.ts
git commit -m "refactor: read the Territórios story's words from a script built from its copy"
```

### Task 5: Serve the copy from Contentful on /territorios

**Files:**
- Create: `components/territorios/StoryScriptContext.tsx`
- Modify: `app/(territorios)/territorios/page.tsx`
- Modify: `components/territorios/{TerritoriosApp,TypeCards,ThemeStep,StorySummary}.tsx`
- Modify: `app/territorios-resumo.css`

**Interfaces:**
- Consumes: `storyScript`, `StoryScript` (Task 4); `TERRITORIOS_COPY`, `TerritoriosCopy` (Task 3); `loadSiteCopy` (`lib/content/site/fetch.ts`).
- Produces:
  - `StoryScriptProvider({ copy, children })`
  - `useStoryScript(): StoryScript`, which throws outside the provider

The repo has no DOM test environment (Vitest runs in node), so this task is verified by the type check, the build and a rendered check.

- [ ] **Step 1: Create `components/territorios/StoryScriptContext.tsx`**

```tsx
'use client'

import { createContext, useContext, useMemo } from 'react'
import { storyScript, type StoryScript } from '@/config/territorios/storyScript'
import type { TerritoriosCopy } from '@/lib/content/territorios'

const StoryScriptContext = createContext<StoryScript | null>(null)

/**
 * Hands the story's words to its panels. The page reads the copy on the
 * server and sends plain strings, since functions do not cross into a client
 * component; the script, with its templates, is built here once.
 */
export function StoryScriptProvider({ copy, children }: { copy: TerritoriosCopy; children: React.ReactNode }) {
  const script = useMemo(() => storyScript(copy), [copy])
  return <StoryScriptContext.Provider value={script}>{children}</StoryScriptContext.Provider>
}

/**
 * The story's words. No default: a panel outside the provider would show the
 * shipped copy and hide the editors' changes without a trace.
 */
export function useStoryScript(): StoryScript {
  const script = useContext(StoryScriptContext)
  if (!script) throw new Error('useStoryScript needs a StoryScriptProvider above it.')
  return script
}
```

- [ ] **Step 2: Load the copy in the page**

In `app/(territorios)/territorios/page.tsx`, add these imports:

```ts
import { StoryScriptProvider } from '@/components/territorios/StoryScriptContext'
import { loadSiteCopy } from '@/lib/content/site/fetch'
import { TERRITORIOS_COPY } from '@/lib/content/territorios'
```

After the session check (or at the top of the function if PR #101 merged first), add:

```ts
  // Contentful down, or the types not provisioned yet: the story keeps the
  // copy it ships with (lib/content/site/fetch.ts).
  const copy = await loadSiteCopy(TERRITORIOS_COPY)
```

Wrap the app:

```tsx
        <StoryScriptProvider copy={copy}>
          <TerritoriosApp initialRecorte={recorte} initialFeicao={feicao} initialEtapa={etapa} />
        </StoryScriptProvider>
```

- [ ] **Step 3: Read the script from the provider**

Remove every `SHIPPED_STORY_SCRIPT` that Task 4 put in the components:

- `TerritoriosApp.tsx`: `import { useStoryScript } from './StoryScriptContext'`. At the top of the component body, add `const script = useStoryScript()`. Use `script.intro.title` and `script.intro.lead`.
- `TypeCards.tsx`: same import. Add `const script = useStoryScript()` in `TypeCards` and render `{script.intro.chooseCut}`.
- `ThemeStep.tsx`: same import. Add `const script = useStoryScript()` after `const sectionRef = …`. Pass `script` to `stepAnswer(step, { territory, type, response, script })` and to `territoryIndicators({ territory, type, script })`.
- `StorySummary.tsx`: same import. Add `const script = useStoryScript()` after `aboutRef`. Use `const input = { responses, territory, type, script }` and `{script.about.title}`.

Then `grep -rn SHIPPED_STORY_SCRIPT components app` must print nothing.

- [ ] **Step 4: Keep an editor's line breaks, and the items, in "Sobre os dados"**

In `app/territorios-resumo.css`:

```css
.territorios-sobre dd {
  margin: 0;
  /* A source is a Contentful paragraph, whose help text promises that a line
     break stays a line break. */
  white-space: pre-line;
}
```

In `StorySummary.tsx`, the titles are now editor text, and two equal titles would collide as React keys. The list's order is fixed, so key by position:

```tsx
          {about.map((item, i) => (
            <div key={i}>
```

- [ ] **Step 5: Type check, lint, test, build**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass. The build lists `/territorios` as dynamic (ƒ).

- [ ] **Step 6: Rendered check, before provisioning**

Start `npm run dev -- -p 3100` in the background. A localhost session cookie works on any port. Open these pages in the browser (Claude in Chrome, or headless Chrome over CDP):

1. `http://localhost:3100/territorios`: the band reads "Que território você quer conhecer?" with the lead below it, and the gallery heading reads "Escolha o recorte".
2. `/territorios?recorte=municipios&feicao=campina-grande&etapa=uso`: the question reads "Como mudou a vegetação nativa desde 1985?".
3. `etapa=resumo`: the card titles match the shipped ones. Open "Sobre os dados": "Fogo" reads "MapBiomas Fogo, coleção 3, 30 m, 1985 a 2023. …" and `getComputedStyle(document.querySelector('.territorios-sobre dd')).whiteSpace === 'pre-line'`.
4. The dev server log shows `Failed to read the copy of territoriosApresentacao, … from Contentful`. This is expected until Task 6 provisions the types, and the page still shows the shipped copy (Review Focus 2).

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add components/territorios app/territorios-resumo.css "app/(territorios)/territorios/page.tsx"
git commit -m "feat: serve the Territórios copy from Contentful"
```

### Task 6: Space test, docs and provisioning

**Files:**
- Modify: `tests/lib/contentfulSpace.test.ts`
- Modify: `CLAUDE.md`, `DOCUMENTACAO.md`

- [ ] **Step 1: Extend the live space test**

In `tests/lib/contentfulSpace.test.ts`, change the `copyQuery` import and add three more:

```ts
import { copyQuery, loadSiteCopy } from '@/lib/content/site/fetch'
import { SHIPPED_STORY_SCRIPT, storyScript } from '@/config/territorios/storyScript'
import { rejectedFields } from '@/lib/content/site/model'
import { TERRITORIOS_COPY } from '@/lib/content/territorios'
```

Inside the `describe.skipIf(…)` block, add:

```ts
  // The page swaps a text naming an unknown placeholder for the shipped one
  // without a word; here the swap is an error the editor can act on.
  it('names in every template only the placeholders its field fills', async () => {
    const types = Object.fromEntries(SITE_COPY_TYPES.map((type) => [type.id, type]))
    const response = await getContentfulClient()!<Record<string, { items: Record<string, unknown>[] }>>(copyQuery(types))

    for (const type of SITE_COPY_TYPES) {
      const entry = response[type.id]?.items[0]
      if (entry) expect(rejectedFields(type, entry), type.id).toEqual([])
    }
  })

  // tests/lib/territoriosStoryText.test.ts holds the shipped questions to ten
  // words; an editor's question meets that check only here.
  it("keeps the story's questions within ten words", async () => {
    const script = storyScript(await loadSiteCopy(TERRITORIOS_COPY, getContentfulClient()))

    expect(Object.keys(script.questions)).toEqual(Object.keys(SHIPPED_STORY_SCRIPT.questions))
    for (const question of Object.values(script.questions)) {
      expect(question.split(/\s+/).filter(Boolean).length, question).toBeLessThanOrEqual(10)
    }
  })
```

Run: `npx vitest run tests/lib/contentfulSpace.test.ts`
Expected: before provisioning, the two tests that query every copy type FAIL on the missing `territorios*` types: `serves an entry of every institutional copy type` and the new placeholder test. That is the signal for Step 3. The questions test passes on the fallback copy, and the rest pass.

- [ ] **Step 2: Document**

In `CLAUDE.md`, under "Institutional copy in Contentful", add this paragraph after "Published edits reach the pages within the hour …":

```markdown
The Territórios story (`/territorios`) reads its copy the same way: one type per tab, plus the presentation over the gallery and the shared part of "Sobre os dados" (`lib/content/territorios.ts`). The page loads it on the server, and `StoryScriptProvider` (`components/territorios/StoryScriptContext.tsx`) turns it into the script `lib/territorios/storyText.ts` fills, through `storyScript()` in `config/territorios/storyScript.ts`; panels read it with `useStoryScript()`. A copy field may declare placeholders (`line('Pergunta', 'Como mudou a vegetação nativa desde {anoInicial}?', { anoInicial: '…' })`). An entry naming any other placeholder, or leaving a brace unpaired, falls back to the code for that field. The years of each series are always placeholders, so a data update reaches the copy. Interface labels, chart descriptions, the summary's badges and the grammar tables stay in `config/territorios/`.
```

In `DOCUMENTACAO.md`, add this paragraph at the end of "## Conteúdo editorial da landing", just before "## Camadas":

```markdown
**Textos do resumo territorial.** Os textos da história de `/territorios` vêm do Contentful do mesmo jeito que os das páginas institucionais: um tipo por aba (`territoriosTerritorio`, `territoriosEstoque`, `territoriosFluxo`, `territoriosUso`, `territoriosFogo`, `territoriosChuva`), mais `territoriosApresentacao` (o título e o texto sobre a galeria de recortes) e `territoriosSobreDados` (a parte comum de "Sobre os dados"), declarados em `lib/content/territorios.ts`. Os anos de cada série entram como marcadores (`{anoInicial}`, `{anoFinal}`), preenchidos a partir de `config/territorios/story.ts`, para que uma atualização dos dados não deixe o texto para trás; um texto com um marcador que o campo não conhece cai no texto do código, e `tests/lib/contentfulSpace.test.ts` aponta o campo. Ficam no código os rótulos de interface (abas, botões, mensagens de carregamento e de erro), as descrições dos gráficos para leitores de tela, os selos do resumo e as tabelas gramaticais ("na Paraíba", "3ª").
```

```bash
git add tests/lib/contentfulSpace.test.ts CLAUDE.md DOCUMENTACAO.md
git commit -m "docs: say where the Territórios copy lives, and check it in the live space"
```

- [ ] **Step 3: Provision (with the user's go-ahead)**

Provisioning is safe before or after the merge: the seeded entries hold exactly the shipped copy. It also re-PUTs the existing types unchanged, since none of their fields declares placeholders.

1. Ask the user to run the apply from the worktree. The management token is not in `.env.local`:
   `! CONTENTFUL_MANAGEMENT_TOKEN=<token> npm run contentful:provision -- --apply`
   Expected output: `created and published territorios…` for the eight types and `Seeded and published an entry of territorios…` for each. A 422 names the field Contentful refused; fix it and rerun.
2. Run `npx vitest run tests/lib/contentfulSpace.test.ts`. Expected: PASS, including the two new tests.
3. Repeat the rendered check of Task 5, Step 6. The `Failed to read the copy` log is gone and the page reads the same.

- [ ] **Step 4: Finish the branch**

Use superpowers:finishing-a-development-branch. Fetch first (the user merges quickly), rebase on `origin/main` if #101 or #110 landed, and run `npm test && npm run lint && npm run build`. Open the PR titled "feat: serve the Territórios copy from Contentful". The body lists the eight types and what stays in code, and links this plan.

---

## Part B — the answers and the summary sentences

Start only after the user confirms the editors want these. Branch `feat/territorios-answers-contentful` from `origin/main` once Part A is merged. If Part A is still open, stack the branch on it and retarget to `main` before merging; stacked PRs do not retarget here on their own. Copy every default from `config/territorios/storyScript.ts` as `main` has it then. If #110 merged, the biome's answer says "nove estados".

### Task 7: The answers and summary sentences in Contentful

**Files:**
- Modify: `lib/content/territorios.ts`
- Modify: `config/territorios/storyScript.ts`
- Modify: `components/territorios/StorySummary.tsx`
- Modify: `tests/config/territoriosStory.test.ts` (one comment)
- Test: `tests/lib/territoriosCopy.test.ts`

**Interfaces:**
- Consumes: everything from Part A.
- Produces:
  - `storyScript(copy).territory`, `.answers` and `.summary`, now built from the copy, with the same shape as before
  - `FLUX_READING_LABELS: Record<Reading, string>`
  - `ANSWER_SCRIPT`, `SUMMARY_ROW_SCRIPT`, `READING_OPENING`, `TERRITORY_SCRIPT.biomeShare` and `TERRITORY_SCRIPT.rankText` are gone

A sentence that compares with the Caatinga gets one field per reading (`comparacaoAcima`, `comparacaoAbaixo`, `comparacaoPerto`). Each field is a whole sentence, so nothing is capitalized or agreed in code, and an editor sees exactly what shows.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/territoriosCopy.test.ts`:

```ts
describe('storyScript, answers and summary', () => {
  it('picks the comparison an editor wrote for each reading', () => {
    const script = storyScript(edited('estoque', { comparacaoAcima: 'Mais que a Caatinga ({caatinga} t por hectare).' }))

    expect(script.answers.estoque.compare('acima', '55')).toBe('Mais que a Caatinga (55 t por hectare).')
    expect(script.answers.estoque.compare('perto', '55')).toBe('Perto da Caatinga (55 t por hectare).')
  })

  it('fills the figures and the years into an edited answer', () => {
    expect(storyScript(edited('uso', { respostaAntes: 'Em {anoInicial}, {percentual}.' })).answers.uso.before('34%'))
      .toBe('Em 1985, 34%.')
  })

  it('agrees the rank card with the gender of the type', () => {
    const script = storyScript(edited('territorio', { posicaoFeminino: 'maior das {total} {tipos}' }))

    expect(script.territory.rankText(50, 'terras indígenas', true)).toBe('maior das 50 terras indígenas')
    expect(script.territory.rankText(1210, 'municípios', false)).toBe('maior entre os 1.210 municípios')
  })

  it('keeps the shipped summary sentence when the edit names an unknown placeholder', () => {
    expect(storyScript(edited('chuva', { resumoChuvoso: '{ano} foi chuvoso, com {chuva} mm.' })).summary.chuva.year.chuvoso('751'))
      .toBe('2024 foi chuvoso, com 751 mm.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/territoriosCopy.test.ts`
Expected: FAIL. The comparison and the rank keep the shipped text, because those fields do not exist yet and `copyFromEntry` ignores them.

- [ ] **Step 3: Add the fields to `lib/content/territorios.ts`**

Add these constants beside `ANOS`:

```ts
const CAATINGA = { caatinga: 'o mesmo número na Caatinga inteira' }
const POSICAO = { total: 'quantos territórios do tipo há', tipos: 'o tipo no plural, como "municípios"' }
const COBERTURA = { percentual: 'parte do território com árvores', caatinga: 'a mesma parte na Caatinga inteira' }
const SALDO = { toneladas: 'o saldo abreviado, como "462 mil t"' }
const ANTES = { percentual: 'vegetação nativa no primeiro ano', ...ANO_INICIAL }
const PICO = { ano: 'o ano com mais área queimada' }
const DESVIO = { percentual: 'quanto o último ano se afastou da média', media: 'chuva média por ano do território' }
const ULTIMO_ANO = { ...ANO_FINAL, chuva: 'chuva do último ano, em mm' }
```

Change `tabDescription` to read `… a pergunta, as respostas, o cartão no resumo e a fonte em "Sobre os dados". …`. In `TERRITORIOS_TERRITORIO`'s description, change "a pergunta e a fonte" to "a pergunta, as respostas, os cartões e a fonte".

Insert the fields below. Each default is the current template from `storyScript.ts`, with `${…}` turned into the placeholder named here.

`TERRITORIOS_TERRITORIO`, after `pergunta`:

```ts
    respostaLocal: line('Resposta · Com o estado', 'Área dentro da Caatinga, {local}.', {
      local: 'estado ou estados onde fica, como "na Paraíba"',
    }),
    respostaSemLocal: line('Resposta · Sem o estado', 'Área dentro da Caatinga.'),
    respostaEstado: line('Resposta · Estado', 'Área dentro da Caatinga, {percentual} do bioma.', {
      percentual: 'parte do bioma dentro do estado',
    }),
    // Count of features in the estados layer (tests/config/territoriosStory.test.ts).
    respostaBioma: line('Resposta · Bioma', 'A Caatinga inteira, em dez estados.'),
    parteDoBioma: line('Cartão · Parte do bioma', 'da área da Caatinga'),
    posicaoMasculino: line('Cartão · Posição (os municípios…)', 'maior entre os {total} {tipos}', POSICAO),
    posicaoFeminino: line('Cartão · Posição (as terras indígenas)', 'maior entre as {total} {tipos}', POSICAO),
```

`TERRITORIOS_ESTOQUE`, after `pergunta`:

```ts
    respostaUnidade: line('Resposta · Unidade do número', 't de carbono por hectare'),
    comparacaoAcima: line('Resposta · Acima da Caatinga', 'Acima da Caatinga ({caatinga} t por hectare).', CAATINGA),
    comparacaoAbaixo: line('Resposta · Abaixo da Caatinga', 'Abaixo da Caatinga ({caatinga} t por hectare).', CAATINGA),
    comparacaoPerto: line('Resposta · Perto da Caatinga', 'Perto da Caatinga ({caatinga} t por hectare).', CAATINGA),
    respostaTotal: line('Resposta · Total', 'No total, {toneladas} de carbono.', {
      toneladas: 'o total por extenso, como "2,7 milhões de toneladas"',
    }),
    semDado: line('Sem dado', 'Sem dado de carbono para esta área.'),
```

and after `resumoTitulo`:

```ts
    // No-break spaces keep "t C" and its number on one line.
    resumoUnidade: line('Resumo · Unidade do número', 't C por hectare'),
    resumoTotal: line('Resumo · Total', 'No total, {toneladas} C.', { toneladas: 'o total abreviado, como "2,7 milhões de t"' }),
    resumoCaatinga: line('Resumo · Caatinga', 'Na Caatinga, {caatinga} t C por hectare.', CAATINGA),
```

`TERRITORIOS_FLUXO`, after `pergunta`:

```ts
    respostaUnidade: line('Resposta · Unidade do número', '{toneladas} de CO₂e', { toneladas: 'a grandeza do número, como "mil t"' }),
    respostaRemocao: line('Resposta · Tiraram mais', 'Tiraram mais carbono do que lançaram.'),
    respostaEmissao: line('Resposta · Lançaram mais', 'Lançaram mais carbono do que tiraram.'),
    respostaEquilibrio: line('Resposta · Equilíbrio', 'Tiraram e lançaram no ar a mesma quantidade de carbono.'),
    comparacaoAcima: line('Resposta · Árvores acima da Caatinga', 'Cobrem {percentual} da área, acima dos {caatinga} da Caatinga.', COBERTURA),
    comparacaoAbaixo: line('Resposta · Árvores abaixo da Caatinga', 'Cobrem {percentual} da área, abaixo dos {caatinga} da Caatinga.', COBERTURA),
    comparacaoPerto: line('Resposta · Árvores perto da Caatinga', 'Cobrem {percentual} da área, perto dos {caatinga} da Caatinga.', COBERTURA),
    respostaCobertura: line('Resposta · Árvores, sem comparação', 'Cobrem {percentual} da área.', { percentual: COBERTURA.percentual }),
    semArvores: line('Sem áreas com árvores', 'Não há áreas com árvores mapeadas aqui.'),
```

and after `resumoTitulo`:

```ts
    resumoUnidade: line('Resumo · Unidade do número', 't de CO₂e por hectare com árvores'),
    resumoRemocao: line('Resumo · Tiraram mais', 'No saldo, as áreas com árvores tiraram do ar {toneladas} de CO₂e.', SALDO),
    resumoEmissao: line('Resumo · Lançaram mais', 'No saldo, as áreas com árvores lançaram no ar {toneladas} de CO₂e.', SALDO),
    resumoEquilibrio: line('Resumo · Equilíbrio', 'No saldo, as áreas com árvores tiraram e lançaram a mesma quantidade.'),
    resumoCaatinga: line('Resumo · Caatinga', 'Na Caatinga, {caatinga} t por hectare com árvores.', CAATINGA),
    resumoCaatingaRemocao: line('Resumo · Caatinga tirou mais', 'Na Caatinga, tiraram mais do que lançaram.'),
    resumoCaatingaEmissao: line('Resumo · Caatinga lançou mais', 'Na Caatinga, lançaram mais do que tiraram.'),
    resumoCaatingaEquilibrio: line('Resumo · Caatinga em equilíbrio', 'Na Caatinga, ficaram em equilíbrio.'),
```

`TERRITORIOS_USO`, after `pergunta`:

```ts
    respostaUnidade: line('Resposta · Unidade do número', 'de vegetação nativa em {anoFinal}', ANO_FINAL),
    respostaAntes: line('Resposta · Primeiro ano', 'Eram {percentual} em {anoInicial}.', ANTES),
    comparacaoAcima: line('Resposta · Acima da Caatinga', 'A Caatinga tem {caatinga}; aqui fica acima.', CAATINGA),
    comparacaoAbaixo: line('Resposta · Abaixo da Caatinga', 'A Caatinga tem {caatinga}; aqui fica abaixo.', CAATINGA),
    comparacaoPerto: line('Resposta · Perto da Caatinga', 'A Caatinga tem {caatinga}; aqui fica perto.', CAATINGA),
    semDado: line('Sem dado', 'Sem dado de uso da terra aqui.'),
```

and after `resumoTitulo`:

```ts
    resumoUnidade: line('Resumo · Unidade do número', 'da área em {anoFinal}', ANO_FINAL),
    resumoAntes: line('Resumo · Primeiro ano', 'Eram {percentual} em {anoInicial}.', ANTES),
    resumoCaatinga: line('Resumo · Caatinga', 'Na Caatinga, de {inicio} para {fim}.', {
      inicio: 'vegetação nativa da Caatinga no primeiro ano',
      fim: 'vegetação nativa da Caatinga no último ano',
    }),
```

`TERRITORIOS_FOGO`, after `pergunta`:

```ts
    respostaUnidade: line('Resposta · Unidade do número', 'da área queimou ao menos uma vez'),
    respostaCaatinga: line('Resposta · Caatinga', 'Na Caatinga, {caatinga}.', CAATINGA),
    respostaPico: line('Resposta · Ano com mais fogo', 'O ano com mais fogo aqui foi {ano}.', PICO),
    respostaNenhum: line('Resposta · Nenhum fogo', 'Nenhuma área queimada registrada de {anoInicial} a {anoFinal}.', ANOS),
    semDado: line('Sem dado', 'Sem dado de fogo aqui.'),
```

and after `resumoTitulo`:

```ts
    resumoUnidade: line('Resumo · Unidade do número', 'da área queimou ao menos uma vez'),
    resumoCaatinga: line('Resumo · Caatinga', 'Na Caatinga, {caatinga}.', CAATINGA),
    resumoPico: line('Resumo · Ano com mais fogo', 'Mais fogo em {ano}.', PICO),
    resumoNenhum: line('Resumo · Nenhum fogo', 'Nenhum fogo de {anoInicial} a {anoFinal}.', ANOS),
```

`TERRITORIOS_CHUVA`, after `pergunta`:

```ts
    respostaUnidade: line('Resposta · Unidade do número', 'mm em {anoFinal}', ANO_FINAL),
    respostaUnidadeMedia: line('Resposta · Unidade da média', 'mm por ano, em média'),
    respostaChuvoso: line('Resposta · Ano chuvoso', 'Chuvoso, {percentual} acima da média daqui ({media} mm).', DESVIO),
    respostaSeco: line('Resposta · Ano seco', 'Seco, {percentual} abaixo da média daqui ({media} mm).', DESVIO),
    respostaNormal: line('Resposta · Ano normal', 'Perto da média daqui ({media} mm).', { media: DESVIO.media }),
    respostaSemAno: line('Resposta · Sem o último ano', 'Sem dado de {anoFinal} aqui.', ANO_FINAL),
    comparacaoAcima: line('Resposta · Média acima da Caatinga', 'Essa média fica acima da Caatinga ({caatinga} mm).', CAATINGA),
    comparacaoAbaixo: line('Resposta · Média abaixo da Caatinga', 'Essa média fica abaixo da Caatinga ({caatinga} mm).', CAATINGA),
    comparacaoPerto: line('Resposta · Média perto da Caatinga', 'Essa média fica perto da Caatinga ({caatinga} mm).', CAATINGA),
    semDado: line('Sem dado', 'Sem dado de chuva aqui.'),
```

and after `resumoTitulo`:

```ts
    resumoUnidade: line('Resumo · Unidade do número', 'mm por ano, em média'),
    resumoCaatinga: line('Resumo · Caatinga', 'Na Caatinga, {caatinga} mm.', CAATINGA),
    resumoChuvoso: line('Resumo · Ano chuvoso', '{anoFinal} foi chuvoso, com {chuva} mm.', ULTIMO_ANO),
    resumoSeco: line('Resumo · Ano seco', '{anoFinal} foi seco, com {chuva} mm.', ULTIMO_ANO),
    resumoNormal: line('Resumo · Ano normal', '{anoFinal} ficou perto da média, com {chuva} mm.', ULTIMO_ANO),
    resumoSemAno: line('Resumo · Sem o último ano', 'Sem dado de {anoFinal}.', ANO_FINAL),
```

- [ ] **Step 4: Build the answers and the summary from the copy**

In `config/territorios/storyScript.ts`:

1. Delete `READING_OPENING`, `ANSWER_SCRIPT` and `SUMMARY_ROW_SCRIPT`. Remove `biomeShare` and `rankText` from `TERRITORY_SCRIPT`, which keeps `title` and `rankValue`.
2. Add, where `SUMMARY_ROW_SCRIPT` was:

```ts
/** The flux card's badge: it compares per hectare with trees, not the share the step compares. */
export const FLUX_READING_LABELS: Record<Reading, string> = {
  acima:  'Acima da Caatinga por hectare com árvores',
  abaixo: 'Abaixo da Caatinga por hectare com árvores',
  perto:  'Perto da Caatinga por hectare com árvores',
}

/** The field of a tab's copy that compares the territory with the Caatinga, per reading. */
const COMPARISON = {
  acima:  'comparacaoAcima',
  abaixo: 'comparacaoAbaixo',
  perto:  'comparacaoPerto',
} as const satisfies Record<Reading, string>
```

3. In `storyScript()`, replace `territory`, `answers` and `summary` with:

```ts
    territory: {
      /** The territory's share of the biome, under its area (Figma 19254:37460). */
      biomeShare: territorio.parteDoBioma,
      /** Its place by area among the territories of its type (19254:37461). */
      rankText: (total: number, plural: string, feminine: boolean) =>
        fill(feminine ? territorio.posicaoFeminino : territorio.posicaoMasculino, { total: numero(total, 0), tipos: plural }),
    },
    /**
     * Answers while the story runs. The question already names the subject, so
     * the answers start from the figure.
     */
    answers: {
      territorio: {
        located: (where: string) => fill(territorio.respostaLocal, { local: where }),
        plain:   territorio.respostaSemLocal,
        state:   (biomePct: string) => fill(territorio.respostaEstado, { percentual: biomePct }),
        biome:   territorio.respostaBioma,
      },
      estoque: {
        unit:    estoque.respostaUnidade,
        compare: (reading: Reading, biome: string) => fill(estoque[COMPARISON[reading]], { caatinga: biome }),
        total:   (tonnes: string) => fill(estoque.respostaTotal, { toneladas: tonnes }),
        noData:  estoque.semDado,
      },
      fluxo: {
        unit:      (tonnes: string) => fill(fluxo.respostaUnidade, { toneladas: tonnes }),
        removal:   fluxo.respostaRemocao,
        emission:  fluxo.respostaEmissao,
        balance:   fluxo.respostaEquilibrio,
        share:     (pct: string, reading: Reading, biome: string) =>
          fill(fluxo[COMPARISON[reading]], { percentual: pct, caatinga: biome }),
        shareOnly: (pct: string) => fill(fluxo.respostaCobertura, { percentual: pct }),
        noForest:  fluxo.semArvores,
      },
      uso: {
        unit:    fill(uso.respostaUnidade, { anoFinal: LAND_USE_LAST }),
        before:  (pct: string) => fill(uso.respostaAntes, { percentual: pct, anoInicial: LAND_USE_FIRST }),
        compare: (biome: string, reading: Reading) => fill(uso[COMPARISON[reading]], { caatinga: biome }),
        noData:  uso.semDado,
      },
      fogo: {
        unit:    fogo.respostaUnidade,
        compare: (biome: string) => fill(fogo.respostaCaatinga, { caatinga: biome }),
        peak:    (year: number) => fill(fogo.respostaPico, { ano: year }),
        none:    fill(fogo.respostaNenhum, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }),
        noData:  fogo.semDado,
      },
      chuva: {
        unit:     fill(chuva.respostaUnidade, { anoFinal: RAIN_LAST_YEAR }),
        meanUnit: chuva.respostaUnidadeMedia,
        chuvoso:  (pct: string, mean: string) => fill(chuva.respostaChuvoso, { percentual: pct, media: mean }),
        seco:     (pct: string, mean: string) => fill(chuva.respostaSeco, { percentual: pct, media: mean }),
        normal:   (mean: string) => fill(chuva.respostaNormal, { media: mean }),
        missing:  fill(chuva.respostaSemAno, { anoFinal: RAIN_LAST_YEAR }),
        compare:  (biome: string, reading: Reading) => fill(chuva[COMPARISON[reading]], { caatinga: biome }),
        noData:   chuva.semDado,
      },
    },
    /** Lines of the final sheet, where the stock unit shortens to "t C". */
    summary: {
      titles: {
        estoque: estoque.resumoTitulo,
        fluxo:   fluxo.resumoTitulo,
        uso:     uso.resumoTitulo,
        fogo:    fogo.resumoTitulo,
        chuva:   chuva.resumoTitulo,
      } satisfies Record<ThemeId, string>,
      estoque: {
        unit:  estoque.resumoUnidade,
        total: (tonnes: string) => fill(estoque.resumoTotal, { toneladas: tonnes }),
        biome: (biome: string) => fill(estoque.resumoCaatinga, { caatinga: biome }),
      },
      fluxo: {
        unit:     fluxo.resumoUnidade,
        removal:  (tonnes: string) => fill(fluxo.resumoRemocao, { toneladas: tonnes }),
        emission: (tonnes: string) => fill(fluxo.resumoEmissao, { toneladas: tonnes }),
        balance:  fluxo.resumoEquilibrio,
        biome:    (biome: string) => fill(fluxo.resumoCaatinga, { caatinga: biome }),
        /** When the Caatinga went the other way, or stayed even, and no length compares. */
        biomeDirection: {
          removal:  fluxo.resumoCaatingaRemocao,
          emission: fluxo.resumoCaatingaEmissao,
          neutral:  fluxo.resumoCaatingaEquilibrio,
        },
      },
      uso: {
        unit:   fill(uso.resumoUnidade, { anoFinal: LAND_USE_LAST }),
        before: (pct: string) => fill(uso.resumoAntes, { percentual: pct, anoInicial: LAND_USE_FIRST }),
        biome:  (from: string, to: string) => fill(uso.resumoCaatinga, { inicio: from, fim: to }),
      },
      fogo: {
        unit:  fogo.resumoUnidade,
        biome: (biome: string) => fill(fogo.resumoCaatinga, { caatinga: biome }),
        peak:  (year: number) => fill(fogo.resumoPico, { ano: year }),
        none:  fill(fogo.resumoNenhum, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }),
      },
      chuva: {
        unit:  chuva.resumoUnidade,
        biome: (biome: string) => fill(chuva.resumoCaatinga, { caatinga: biome }),
        year: {
          chuvoso: (mm: string) => fill(chuva.resumoChuvoso, { anoFinal: RAIN_LAST_YEAR, chuva: mm }),
          seco:    (mm: string) => fill(chuva.resumoSeco, { anoFinal: RAIN_LAST_YEAR, chuva: mm }),
          normal:  (mm: string) => fill(chuva.resumoNormal, { anoFinal: RAIN_LAST_YEAR, chuva: mm }),
        } satisfies Record<RainYearKind, (mm: string) => string>,
        missing: fill(chuva.resumoSemAno, { anoFinal: RAIN_LAST_YEAR }),
      },
    },
```

4. In the header comment, drop "the answers and summary sentences (for now), ". Remove any import `npm run lint` reports as unused.
5. In `components/territorios/StorySummary.tsx`, import `FLUX_READING_LABELS` instead of `SUMMARY_ROW_SCRIPT` and render `FLUX_READING_LABELS[row.reading]` for the flux badge.
6. In `tests/config/territoriosStory.test.ts`, change the comment `// ANSWER_SCRIPT.territorio.biome: "…"` to `// territoriosTerritorio.respostaBioma (lib/content/territorios.ts): "…"`, keeping the quoted sentence as `main` has it.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/territoriosCopy.test.ts tests/lib/territoriosStoryText.test.ts tests/lib/siteCopy.test.ts tests/scripts/contentfulProvision.test.ts tests/config/territoriosStory.test.ts`
Expected: PASS. Every story-text assertion of today's strings is unchanged, so the move is byte for byte.

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/content/territorios.ts config/territorios/storyScript.ts components/territorios/StorySummary.tsx tests
git commit -m "feat: serve the Territórios answers and summary sentences from Contentful"
```

### Task 8: Roll out Part B

- [ ] **Step 1: Document.** In `CLAUDE.md`'s Territórios paragraph, add after the placeholder sentence: `A sentence comparing with the Caatinga has one field per reading (comparacaoAcima, comparacaoAbaixo, comparacaoPerto), so the code neither capitalizes nor agrees it.` In `DOCUMENTACAO.md`'s "Textos do resumo territorial", change "Os textos da história" to "Os textos da história, inclusive as respostas de cada aba e as frases do resumo,". Commit with `docs: note the answers and summary sentences in the Territórios copy`.
- [ ] **Step 2: Provision (with the user's go-ahead).** Ask the user to run `! CONTENTFUL_MANAGEMENT_TOKEN=<token> npm run contentful:provision -- --apply`. It updates the six tab types with the new fields and leaves the entries alone. Until the entries get the new fields, the GraphQL API answers them with `null` and the page shows the shipped text for each, so nothing breaks in between.
- [ ] **Step 3: Fill the new fields of the six existing entries (with the user's go-ahead).** The fields are required, so an editor could not republish an entry until they are filled. Print the shipped values:

```bash
npx tsx -e "import('./lib/content/territorios.ts').then(({ TERRITORIOS_COPY }) => { for (const t of Object.values(TERRITORIOS_COPY)) console.log(t.id, JSON.stringify(Object.fromEntries(Object.entries(t.fields).map(([id, f]) => [id, f.default])))) })"
```

For each of `territoriosTerritorio`, `territoriosEstoque`, `territoriosFluxo`, `territoriosUso`, `territoriosFogo` and `territoriosChuva`, use the Contentful MCP tools (load them with ToolSearch):
1. `search_entries` by content type, to find the entry.
2. `get_entry`. If the entry has unpublished changes (`sys.version > sys.publishedVersion + 1`), stop and ask the user: publishing would also publish the editor's draft.
3. `update_entry`, passing every field the entry already has plus each missing field with its shipped value, in the space's default locale.
4. `publish_entry`.

- [ ] **Step 4: Verify.** Run `npx vitest run tests/lib/contentfulSpace.test.ts` (expected: PASS) and repeat the rendered check of Task 5, Step 6 on a story tab and on the summary.
- [ ] **Step 5: Finish the branch** with superpowers:finishing-a-development-branch. Fetch first, then run `npm test && npm run lint && npm run build`. Open the PR titled "feat: serve the Territórios answers and summary sentences from Contentful".
