import { useLocale, useTranslations } from "next-intl";
import { formatEventoDate, type Evento } from "@/lib/content/eventos";
import { readSiteLocale } from "@/lib/locale";
import EventoCard from "./EventoCard";
import styles from "./Eventos.module.css";

// The "Eventos e articulações" panel of the Comunicação page, Figma node
// 19254:16068: the heading, then one card per event, newest first
// (lib/content/eventos.ts). No id on the wrapper, as in Publicacoes.tsx: it
// is not a landing section.
export default function Eventos({ eventos }: { eventos: Evento[] }) {
  const t = useTranslations("Eventos");
  const locale = readSiteLocale(useLocale());

  return (
    <section className={styles.eventos} aria-labelledby="eventos-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="eventos-heading" className={styles.heading}>
          {t("heading")}
        </h2>
        <ul className={styles.lista} role="list">
          {eventos.map((evento, i) => (
            <li key={`${evento.date}-${i}`}>
              <EventoCard evento={evento} data={formatEventoDate(evento.date, locale)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
