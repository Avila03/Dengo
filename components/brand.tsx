type BrandProps = { compact?: boolean; tagline?: boolean };

/** Approved Dengo identity: variation 2, D with a curved heart/ribbon. */
export function Brand({ compact = false, tagline = false }: BrandProps) {
  return (
    <span className={`dengo-brand${compact ? " dengo-brand-compact" : ""}`}>
      <img
        className="dengo-brand-symbol"
        src="/brand/dengo-icon-192-v2.png"
        alt=""
        width={44}
        height={44}
      />
      <span className="dengo-brand-copy">
        <span className="dengo-brand-name">Dengo</span>
        {tagline ? (
          <span className="dengo-brand-tagline">um lugar para nós</span>
        ) : null}
      </span>
    </span>
  );
}
