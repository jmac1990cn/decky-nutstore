import { ButtonItem } from "decky-frontend-lib";
import { ReactNode } from "react";

/**
 * A tap- and gamepad-friendly list row.
 *
 * Built on `ButtonItem` so Steam's focus manager can move the gamepad cursor
 * up/down across entries and activate them with the A button (with a built-in
 * focus highlight). `bottomSeparator="none"` removes the default decky white
 * bar, and the selectable action is surfaced as a highlighted pill on the
 * right side (passed via `right`).
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
    <ButtonItem
      bottomSeparator="none"
      highlightOnFocus
      onClick={onClick}
      label={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            marginRight: "12px",
          }}
        >
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
            <span style={{ fontSize: "12px", opacity: 0.6, marginTop: "2px" }}>
              {subtitle}
            </span>
          )}
        </div>
      }
    >
      {right}
    </ButtonItem>
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
