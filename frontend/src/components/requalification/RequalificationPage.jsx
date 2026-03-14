import { useAppPreferences } from "../../context/AppPreferencesContext";
import { Card } from "../ui/card";

export function RequalificationPage() {
  const { tr } = useAppPreferences();

  return (
    <section className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(122,224,148,0.18),_transparent_40%),linear-gradient(180deg,#f7faf8_0%,#eff5f0_100%)] px-6 py-8 md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-[#d7e5db] bg-white/90 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.16em] text-[#4e5f57]">
            {tr("Module en pause", "Module on hold")}
          </span>
          <div className="space-y-2">
            <h1 className="leoni-display-lg text-3xl font-semibold text-[#1d2a21] md:text-4xl">
              {tr("Gestion des Requalifications", "Requalification Management")}
            </h1>
            <p className="max-w-2xl text-sm text-[#5f6d66] md:text-base">
              {tr(
                "La page de requalification sera bientot disponible. Cette page reste volontairement vide pour le moment.",
                "The requalification page is coming soon. This page is intentionally empty for now.",
              )}
            </p>
          </div>
        </div>

        <Card className="rounded-[28px] border border-[#dce8df] bg-white/92 p-8 shadow-[0_20px_60px_rgba(26,54,39,0.08)]">
          <div className="flex flex-col gap-4">
            <div className="h-2 w-24 rounded-full bg-[#7ae094]" />
            <p className="text-lg font-semibold text-[#223128]">
              {tr("Coming soon", "Coming soon")}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-[#627067]">
              {tr(
                "Le frontend de requalification a ete retire en attente d'une nouvelle version.",
                "The requalification frontend has been removed pending a new version.",
              )}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
