import styles from "./MediaText.module.css";

export type MediaTextProps = {
  image: string;
  imageAlt: string;
  imageSide: "left" | "right";
  // 'large' is the 464x341 photo of 18988:8641 and 18988:8811, top-aligned
  // with the text; 'small' the 298x219 one of 18988:8734, centred on it.
  imageSize?: "large" | "small";
  children: React.ReactNode;
};

// A text column beside a rounded photo, Figma 18988:8641, 18988:8734 and
// 18988:8811; the text is usually a Section. The photo comes first in the DOM
// whichever side it sits on, so it stacks on top below 640px.
export default function MediaText({
  image,
  imageAlt,
  imageSide,
  imageSize = "large",
  children,
}: MediaTextProps) {
  const large = imageSize === "large";

  return (
    <div
      className={`${styles.mediaText} ${imageSide === "right" ? styles.right : ""} ${
        large ? styles.large : styles.small
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, matches Plataforma.tsx */}
      <img
        src={image}
        alt={imageAlt}
        width={large ? 464 : 298}
        height={large ? 341 : 219}
        className={styles.image}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.text}>{children}</div>
    </div>
  );
}
