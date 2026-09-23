import { colors, font, radius, spacing } from '../../theme/tokens';

export function CorFormula() {
  return (
    <section aria-label="COR Formula (IPPS 5.C.9)" style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.space4, flexShrink: 0 }}>
      <h2 style={{ fontSize: font.size.body, margin: 0 }}>COR Formula (IPPS 5.C.9)</h2>
      <p><strong>COR = √(H₂ ÷ H₁)</strong></p>
      <div><strong>H₁</strong> = Drop height (fixed at 78 in / 198.1 cm)</div>
      <div><strong>H₂</strong> = Rebound height measured to top of ball (in)</div>
      <p style={{ marginBottom: 0 }}><strong>Example:</strong> If H₂ = 32 in, then COR = √(32 ÷ 78) ≈ <strong>0.64</strong></p>
    </section>
  );
}
