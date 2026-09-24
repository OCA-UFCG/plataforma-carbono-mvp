import styles from "./IndicatorCard.module.css";

export type IndicatorCardProps = {
  label: string;
  value: string;
  // Set at body size beside the value. Write sub/superscripts as the Unicode
  // characters ("t CO₂/ha/ano", "km²"), never "CO2". A unit set at display
  // size, as the Sobre cards do ("1,5–5tCO₂/ha/ano"), goes in `value` instead.
  unit?: string;
  description: string;
  // Defaults to the component's own "Map" glyph (Figma I18808:5943), the only
  // icon any instance of it uses so far.
  icon?: string;
  // 'raised': white card with a shadow, on the landing's grey band (Figma
  // 18862:8542..8545). 'outlined': cream fill inside a 1px border, on the page
  // background of the Sobre pages (18988:8714, 18988:8731).
  variant?: "raised" | "outlined";
};

// "Cards de indicadores em destaque", Figma component 8689:52527 (variant
// "formato2", 18808:5911): a green header with icon and label over the figure
// and its description. Renders a <div>; a caller listing several cards wraps
// each in its own <li>, as Destaques does.
export default function IndicatorCard({
  label,
  value,
  unit,
  description,
  icon = "/icons/indicator-card/map.svg",
  variant = "raised",
}: IndicatorCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        {/* Decorative: the icon repeats what `label` already says in text,
            so it carries no information of its own. A plain <img>, not
            next/image, matches Hero.tsx: these are small static SVGs, not
            photos worth the optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" width={18} height={18} className={styles.icon} />
        <p className={`${styles.label} text-subtle-semibold`}>{label}</p>
      </div>
      <div className={styles.body}>
        {/* The visible value/unit/description are split across three
            elements for layout (value at display size, unit and description
            at body/subtle size), so they are hidden from assistive tech and
            replaced by one combined statement below, read as a single
            coherent phrase. */}
        <p className={styles.statLine} aria-hidden="true">
          <span className={`${styles.value} text-h2`}>{value}</span>
          {unit && <span className={`${styles.unit} text-body`}>{unit}</span>}
        </p>
        <p className={`${styles.description} text-subtle`} aria-hidden="true">
          {description}
        </p>
        <span className="sr-only">{[value, unit, description].filter(Boolean).join(" ")}</span>
      </div>
    </div>
  );
}
