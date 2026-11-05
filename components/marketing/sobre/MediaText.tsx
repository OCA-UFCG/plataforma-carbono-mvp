import styles from "./MediaText.module.css";

const SIZES = {
  // The 464x341 photo of 18988:8811 and 19538:11076, top-aligned with the text.
  large: { width: 464, height: 341 },
  // The 298x219 one of 18988:8734, centred on the text.
  small: { width: 298, height: 219 },
  // The 464x200 one of 19551:11428, centred on the text.
  wide: { width: 464, height: 200 },
} as const;

export type MediaTextProps = {
  image: string;
  imageAlt: string;
  imageSide: "left" | "right";
  imageSize?: keyof typeof SIZES;
  // 12px on most Sobre frames; the rebuilt "Conheça a plataforma"
  // (19538:11039) rounds both its photos at 8px.
  imageRadius?: 8 | 12;
  children: React.ReactNode;
};

// A text column beside a rounded photo, Figma 18988:8734, 18988:8811,
// 19538:11070 and 19551:11427; the text is usually a Section. The photo comes
// first in the DOM whichever side it sits on, so it stacks on top below 640px.
export default function MediaText({
  image,
  imageAlt,
  imageSide,
  imageSize = "large",
  imageRadius = 12,
  children,
}: MediaTextProps) {
  const { width, height } = SIZES[imageSize];

  return (
    <div
      className={`${styles.mediaText} ${imageSide === "right" ? styles.right : ""} ${styles[imageSize]} ${
        imageRadius === 8 ? styles.radius8 : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, matches Plataforma.tsx */}
      <img
        src={image}
        alt={imageAlt}
        width={width}
        height={height}
        className={styles.image}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.text}>{children}</div>
    </div>
  );
}
