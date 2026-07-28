export default function Logo({ size = 56 }) {
  return (
    <svg
      className="sugar-logo"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sugar Store"
    >
      <circle cx="60" cy="60" r="58" fill="var(--brand-pink)" />
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
        fontSize="16"
        letterSpacing="-0.3"
        fontStyle="italic"
        fill="#ffffff"
      >
        SugarStore
      </text>
    </svg>
  );
}
