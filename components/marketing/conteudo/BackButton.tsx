import Link from "next/link";
import styles from "./ConteudoHeader.module.css";

// "Voltar", Figma node 19015:13061: always the Comunicação listing. Stepping
// back through history instead walked a reader who had hopped along the
// "Conteúdos Relacionados" cards back through every publication they had
// opened, when what they wanted was to leave the publications; the browser's
// own back button still offers that step-by-step history.
export default function BackButton() {
  return (
    <Link href="/comunicacao" className={`${styles.back} text-ui-medium`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
      <img src="/icons/conteudo/arrow-back.svg" alt="" width={16} height={16} />
      Voltar
    </Link>
  );
}
