import { Check } from "lucide-react";
import { themeOptions } from "./themeOptions";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { cn } from "../components/ui/utils";

export function ThemePicker({ compact = false, className }) {
  const { theme, setTheme, tr } = useAppPreferences();

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3",
        className,
      )}
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              "group rounded-[24px] border p-4 text-left transition-all duration-300",
              "bg-card/85 backdrop-blur-sm hover:-translate-y-1",
              "shadow-[0_18px_40px_var(--panel-shadow)]",
              isActive
                ? "border-primary/40 bg-card shadow-[0_22px_48px_var(--panel-shadow-strong)]"
                : "border-border/80 hover:border-primary/25 hover:bg-card",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/40 shadow-sm"
                  style={{
                    background: `${option.preview}`,
                    color: option.accent,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-card-foreground">
                    {tr(option.nameFr, option.nameEn)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {tr(option.descriptionFr, option.descriptionEn)}
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  isActive
                    ? "border-primary/15 bg-primary/10 text-primary"
                    : "border-border/80 bg-background/70 text-muted-foreground",
                )}
              >
                {isActive ? <Check className="h-3.5 w-3.5" /> : null}
                {isActive ? tr("Actif", "Active") : tr("Appliquer", "Apply")}
              </span>
            </div>

            <div
              className={cn(
                "mt-4 overflow-hidden rounded-[20px] border border-white/40 p-3 shadow-inner",
                compact ? "min-h-[92px]" : "min-h-[116px]",
              )}
              style={{ background: option.preview }}
            >
              <div className="grid grid-cols-[1.3fr_0.8fr] gap-2">
                <div
                  className="rounded-[18px] border border-white/45 p-3 shadow-sm"
                  style={{ background: option.surface }}
                >
                  <div className="h-2.5 w-16 rounded-full bg-white/75" />
                  <div className="mt-2 h-2 w-24 rounded-full bg-white/55" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-12 rounded-[14px] bg-white/70" />
                    <div className="h-12 rounded-[14px] bg-white/45" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div
                    className="h-8 rounded-[14px] border border-white/35 shadow-sm"
                    style={{ background: option.surface }}
                  />
                  <div
                    className="h-[62px] rounded-[18px] border border-white/35 shadow-sm"
                    style={{ background: option.surface }}
                  />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
