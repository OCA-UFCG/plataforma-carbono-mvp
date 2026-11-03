import type { Termo } from "@/lib/glossario/termos";
import CenaAnimada from "./CenaAnimada";
import styles from "./TermoAberto.module.css";

// The open term of the Glossário, in the column beside the sidebar (Figma
// 19507:16686): its title (in the global .text-h3) and text, its animation
// with the control panel, then the way into the platform and the sources.
// Glossario.tsx wraps it in the tab panel, which spaces these blocks 24px
// apart.
export default function TermoAberto({ termo }: { termo: Termo }) {
  return (
    <>
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h3`}>{termo.titulo}</h2>
        {termo.paragrafos.map((p, i) => (
          <p key={i} className={`${styles.paragrafo} text-body`}>{p}</p>
        ))}
      </div>
      {termo.animacao && (
        <CenaAnimada key={termo.slug} id={termo.animacao.id} titulo={termo.animacao.titulo} descricao={termo.animacao.descricao} />
      )}
      {termo.acesso && (
        // The platform is another root layout: a plain link, a full page load.
        <a className={styles.acesso} href={termo.acesso.href}>{termo.acesso.rotulo}</a>
      )}
      {termo.fontes && termo.fontes.length > 0 && (
        <div className={styles.fontesBloco}>
          <h3 className={styles.fontesTitulo}>Fontes</h3>
          <ol className={styles.fontes}>
            {termo.fontes.map((f) => <li key={f}>{f}</li>)}
          </ol>
        </div>
      )}
    </>
  );
}
