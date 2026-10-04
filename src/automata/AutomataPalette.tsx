import { useTranslation, type TranslationFn } from "../i18n";
import { CA_LABELS, type CAColor } from "./model";

export function getColorLabel(color: CAColor, t: TranslationFn): string {
  return CA_LABELS[color] + " " + t("automata_color_" + color) + " · GRB " + color.toString(2).padStart(3, "0");
}
export function AutomataPalette({ color, onSelect }: { color: CAColor; onSelect: (color: CAColor) => void }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="automata-palette" role="group" aria-label={t("automata_palette")}>
      {CA_LABELS.map((label, index) => {
        const value = index as CAColor,
          name = getColorLabel(value, t);
        return (
          <button
            type="button"
            key={label}
            className={"automata-color automata-color-" + value}
            aria-label={name}
            title={name}
            aria-pressed={color === value}
            onClick={() => onSelect(value)}
          >
            <span aria-hidden="true">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
