import { ReactNode } from "react";

/**
 * A tap-friendly list row with no bottom separator (replaces the default
 * decky "white bar"). The selectable action is surfaced as a highlighted pill
 * on the right side.
 */
export default function SelectableRow({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        marginBottom: "6px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, marginRight: "12px" }}>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: "12px", opacity: 0.6, marginTop: "2px" }}>{subtitle}</span>
        )}
      </div>
      {right}
    </div>
  );
}

/** The highlighted pill shown on the right side of a SelectableRow. */
export function HighlightButton({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flexShrink: 0,
        padding: "6px 12px",
        borderRadius: "999px",
        background: "var(--gpSystemAccent, #1a9fff)",
        color: "#fff",
        fontSize: "12px",
        fontWeight: 600,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
