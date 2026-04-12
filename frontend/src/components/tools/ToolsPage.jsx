import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  LoaderCircle,
  Sparkles,
  Table2,
  Wrench,
} from "lucide-react";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { cn } from "../ui/utils";

const TOOL_IDS = {
  planning: "planning",
};

const CLASSROOMS = [
  { id: "class_1", code: "C1", nameFr: "Classe 1", nameEn: "Class 1", capacity: 30 },
  { id: "class_2", code: "C2", nameFr: "Classe 2", nameEn: "Class 2", capacity: 33 },
  { id: "intermediate", code: "INT", nameFr: "Intermediaire", nameEn: "Intermediate", capacity: 45 },
];

const PERIODS = [
  { id: "morning", labelFr: "Matin", labelEn: "Morning" },
  { id: "evening", labelFr: "Soir", labelEn: "Evening" },
];

const TOTAL_CAPACITY = CLASSROOMS.reduce((sum, classroom) => sum + classroom.capacity, 0);

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatIsoDate(year, month, day) {
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function parseMonthValue(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return { year, month };
}

function parseIsoDateValue(dateValue) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  return { year, month, day };
}

function getTodayIso() {
  const today = new Date();
  return formatIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function getMonthValue(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  return `${year}-${padNumber(dateValue.getMonth() + 1)}`;
}

function addMonths(monthValue, offset) {
  const { year, month } = parseMonthValue(monthValue);
  const targetDate = new Date(year, month - 1 + offset, 1);
  return getMonthValue(targetDate);
}

function getWindowBounds(monthValue, monthCount = 2) {
  const { year, month } = parseMonthValue(monthValue);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month - 1 + monthCount, 0);
  return {
    startDate: formatIsoDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()),
    endDate: formatIsoDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()),
  };
}

function getMonthDays(monthValue) {
  const { year, month } = parseMonthValue(monthValue);
  const dayCount = new Date(year, month, 0).getDate();

  return Array.from({ length: dayCount }, (_, index) => {
    const currentDate = new Date(year, month - 1, index + 1);
    return {
      iso: formatIsoDate(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()),
      dayNumber: index + 1,
      weekday: currentDate.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });
}

function parsePositiveInt(value) {
  if (!/^\d+$/.test(String(value).trim())) {
    return Number.NaN;
  }
  return Number.parseInt(String(value).trim(), 10);
}

function getAuthHeaders(accessToken, headers = {}) {
  return accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;
}

function getClassroomById(classroomId) {
  return CLASSROOMS.find((classroom) => classroom.id === classroomId) ?? null;
}

function getClassroomLabel(classroomId, tr) {
  const classroom = getClassroomById(classroomId);
  return classroom ? tr(classroom.nameFr, classroom.nameEn) : classroomId;
}

function getPeriodLabel(periodId, tr) {
  const period = PERIODS.find((item) => item.id === periodId);
  return period ? tr(period.labelFr, period.labelEn) : periodId;
}

function formatReservationDate(dateValue) {
  const { year, month, day } = parseIsoDateValue(dateValue);
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getMonthLabel(monthValue) {
  const { year, month } = parseMonthValue(monthValue);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function buildDraftsFromAllocations(allocations = []) {
  return CLASSROOMS.reduce((drafts, classroom) => {
    const allocation = allocations.find((item) => item.classroom === classroom.id);
    drafts[classroom.id] = allocation ? String(allocation.assigned_count) : "";
    return drafts;
  }, {});
}

function summarizeRooms(allocations) {
  return allocations
    .map((allocation) => {
      const classroom = getClassroomById(allocation.classroom);
      return `${classroom?.code ?? allocation.classroom} ${allocation.assigned_count}`;
    })
    .join(" - ");
}

function buildCalendarEntries(reservations) {
  return reservations.reduce((map, reservation) => {
    const key = `${reservation.reservation_date}:${reservation.period}`;
    map[key] = map[key] ?? [];
    map[key].push(reservation);
    return map;
  }, {});
}

function sortReservations(items) {
  const periodRank = { morning: 0, evening: 1 };
  return [...items].sort((left, right) => {
    const dateCompare = left.reservation_date.localeCompare(right.reservation_date);
    if (dateCompare !== 0) return dateCompare;

    const periodCompare = (periodRank[left.period] ?? 99) - (periodRank[right.period] ?? 99);
    if (periodCompare !== 0) return periodCompare;

    return left.id - right.id;
  });
}

function ToolCard({ icon, title, description, badge, disabled = false, onClick }) {
  const Icon = icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[28px] border bg-white/92 p-6 text-left shadow-[0_24px_60px_rgba(23,47,36,0.08)] transition-all",
        disabled
          ? "cursor-not-allowed border-dashed border-[#d8e1db] opacity-70"
          : "border-[#dce8df] hover:-translate-y-0.5 hover:border-[#b8d8c0]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8e6fb] bg-[#eef5ff] text-[#0f63f2]">
          <Icon className="h-5 w-5" />
        </div>
        {badge ? (
          <Badge className="rounded-full bg-[#edf9f3] px-3 py-1 text-[#157347]">{badge}</Badge>
        ) : null}
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-[#1d2a21]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#617067]">{description}</p>
    </button>
  );
}

function PlanningCalendar({ monthValues, reservations, tr }) {
  const reservationMap = useMemo(() => buildCalendarEntries(reservations), [reservations]);

  return (
    <div className="space-y-6">
      {monthValues.map((monthValue) => {
        const days = getMonthDays(monthValue);

        return (
          <div key={monthValue} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#203026]">{getMonthLabel(monthValue)}</h3>
              <Badge className="rounded-full bg-[#eef5ff] px-3 py-1 text-[#0f63f2]">
                {days.length} {tr("jours", "days")}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {days.map((day) => (
                <div key={day.iso} className="rounded-[22px] border border-[#e4ece7] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold text-[#1f2d24]">{day.dayNumber}</p>
                    <span className="text-xs uppercase tracking-[0.14em] text-[#728078]">{day.weekday}</span>
                  </div>

                  {PERIODS.map((period) => {
                    const periodReservations = reservationMap[`${day.iso}:${period.id}`] ?? [];
                    return (
                      <div key={period.id} className="mt-3 rounded-2xl bg-[#f7faf8] px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6d66]">
                            {tr(period.labelFr, period.labelEn)}
                          </p>
                          <span className="text-xs text-[#6d7b73]">{periodReservations.length}</span>
                        </div>
                        {periodReservations.length ? (
                          <div className="mt-2 space-y-2">
                            {periodReservations.map((reservation) => (
                              <div key={reservation.id} className="rounded-xl bg-white px-2.5 py-2 text-xs text-[#31443a]">
                                <p className="font-semibold">{reservation.reference}</p>
                                <p className="mt-1">{summarizeRooms(reservation.allocations)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[#819087]">{tr("Libre", "Free")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToolsPage({ currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const [activeTool, setActiveTool] = useState(null);
  const [reservationMonth, setReservationMonth] = useState(getMonthValue());
  const [plannerForm, setPlannerForm] = useState({
    reservation_date: getTodayIso(),
    period: "morning",
    effectif: "",
  });
  const [suggestion, setSuggestion] = useState(null);
  const [allocationDrafts, setAllocationDrafts] = useState(() => buildDraftsFromAllocations());
  const [reservations, setReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservationsError, setReservationsError] = useState("");
  const [plannerError, setPlannerError] = useState("");
  const [plannerSuccess, setPlannerSuccess] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState(null);
  const [editingReservationPeriod, setEditingReservationPeriod] = useState("morning");
  const [isUpdatingReservation, setIsUpdatingReservation] = useState(false);
  const [reservationActionError, setReservationActionError] = useState("");
  const [reservationActionSuccess, setReservationActionSuccess] = useState("");

  const isObserver = currentUser?.role === "observer";
  const parsedEffectif = parsePositiveInt(plannerForm.effectif);
  const calendarMonthValues = useMemo(
    () => [reservationMonth, addMonths(reservationMonth, 1)],
    [reservationMonth],
  );
  const currentWindowBounds = useMemo(() => getWindowBounds(reservationMonth, 2), [reservationMonth]);

  useEffect(() => {
    if (!accessToken || activeTool !== TOOL_IDS.planning) {
      return;
    }

    let cancelled = false;

    const loadReservations = async () => {
      setIsLoadingReservations(true);
      setReservationsError("");

      try {
        const searchParams = new URLSearchParams({
          start_date: currentWindowBounds.startDate,
          end_date: currentWindowBounds.endDate,
        });
        const response = await fetch(apiUrl(`/planning/reservations?${searchParams.toString()}`), {
          headers: getAuthHeaders(accessToken),
        });
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(
            data?.detail || tr("Impossible de charger les reservations.", "Failed to load reservations."),
          );
        }

        if (!cancelled) {
          setReservations(Array.isArray(data) ? sortReservations(data) : []);
        }
      } catch (error) {
        if (!cancelled) {
          setReservationsError(
            error?.message || tr("Impossible de charger les reservations.", "Failed to load reservations."),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReservations(false);
        }
      }
    };

    loadReservations();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeTool, currentWindowBounds.endDate, currentWindowBounds.startDate, tr]);

  const classroomsFromSuggestion = suggestion?.classrooms ?? [];
  const classroomAvailability = CLASSROOMS.map((classroom) => {
    const availability = classroomsFromSuggestion.find((item) => item.classroom === classroom.id);
    return {
      ...classroom,
      isAvailable: availability ? availability.is_available : true,
    };
  });

  const manualAllocations = classroomAvailability
    .map((classroom) => ({
      classroom: classroom.id,
      assigned_count: parsePositiveInt(allocationDrafts[classroom.id]),
    }))
    .filter((allocation) => Number.isInteger(allocation.assigned_count) && allocation.assigned_count > 0);

  const totalAssigned = manualAllocations.reduce((sum, allocation) => sum + allocation.assigned_count, 0);
  const hasCapacityError = manualAllocations.some((allocation) => {
    const classroom = getClassroomById(allocation.classroom);
    return classroom && allocation.assigned_count > classroom.capacity;
  });
  const usesUnavailableRoom = manualAllocations.some((allocation) => {
    const classroom = classroomAvailability.find((item) => item.id === allocation.classroom);
    return classroom ? !classroom.isAvailable : false;
  });
  const canConfirmPlan =
    Boolean(suggestion) &&
    manualAllocations.length > 0 &&
    totalAssigned === parsedEffectif &&
    !hasCapacityError &&
    !usesUnavailableRoom &&
    !isObserver;

  const resetPlanner = () => {
    setPlannerForm({
      reservation_date: getTodayIso(),
      period: "morning",
      effectif: "",
    });
    setSuggestion(null);
    setAllocationDrafts(buildDraftsFromAllocations());
    setPlannerError("");
    setPlannerSuccess("");
  };

  const handleSuggestPlan = async () => {
    if (!accessToken) {
      return;
    }
    if (!plannerForm.reservation_date) {
      setPlannerError(tr("Choisissez une date.", "Choose a date."));
      return;
    }
    if (!Number.isInteger(parsedEffectif) || parsedEffectif <= 0) {
      setPlannerError(tr("Saisissez un effectif valide.", "Enter a valid headcount."));
      return;
    }

    setIsSuggesting(true);
    setPlannerError("");
    setPlannerSuccess("");

    try {
      const response = await fetch(apiUrl("/planning/suggestions"), {
        method: "POST",
        headers: getAuthHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          reservation_date: plannerForm.reservation_date,
          period: plannerForm.period,
          effectif: parsedEffectif,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || tr("Suggestion impossible.", "Failed to build suggestion."));
      }

      setSuggestion(data);
      setAllocationDrafts(buildDraftsFromAllocations(data.suggested_allocations));
    } catch (error) {
      setSuggestion(null);
      setAllocationDrafts(buildDraftsFromAllocations());
      setPlannerError(error?.message || tr("Suggestion impossible.", "Failed to build suggestion."));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!accessToken || !canConfirmPlan) {
      return;
    }

    setIsSaving(true);
    setPlannerError("");
    setPlannerSuccess("");

    try {
      const response = await fetch(apiUrl("/planning/reservations"), {
        method: "POST",
        headers: getAuthHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          reservation_date: plannerForm.reservation_date,
          period: plannerForm.period,
          effectif: parsedEffectif,
          allocations: manualAllocations,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || tr("Enregistrement impossible.", "Failed to save reservation."));
      }

      setPlannerSuccess(
        tr("Le plan a ete confirme et sauvegarde.", "The plan was confirmed and saved."),
      );
      setSuggestion(null);
      setAllocationDrafts(buildDraftsFromAllocations());
      setReservationMonth(plannerForm.reservation_date.slice(0, 7));
      setReservationActionError("");
      setReservationActionSuccess("");
      setReservations((prev) => sortReservations([...prev, data]));
    } catch (error) {
      setPlannerError(error?.message || tr("Enregistrement impossible.", "Failed to save reservation."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartReservationEdit = (reservation) => {
    setEditingReservationId(reservation.id);
    setEditingReservationPeriod(reservation.period);
    setReservationActionError("");
    setReservationActionSuccess("");
  };

  const handleCancelReservationEdit = () => {
    setEditingReservationId(null);
    setEditingReservationPeriod("morning");
    setReservationActionError("");
  };

  const handleUpdateReservationPeriod = async (reservationId) => {
    if (!accessToken || !editingReservationPeriod) {
      return;
    }

    setIsUpdatingReservation(true);
    setReservationActionError("");
    setReservationActionSuccess("");

    try {
      const response = await fetch(apiUrl(`/planning/reservations/${reservationId}/period`), {
        method: "PATCH",
        headers: getAuthHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ period: editingReservationPeriod }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail || tr("Mise a jour impossible.", "Failed to update reservation period."),
        );
      }

      setReservations((prev) =>
        sortReservations(prev.map((reservation) => (reservation.id === reservationId ? data : reservation))),
      );
      setReservationActionSuccess(
        tr("La periode a ete mise a jour.", "The reservation period was updated."),
      );
      setEditingReservationId(null);
      setEditingReservationPeriod("morning");
    } catch (error) {
      setReservationActionError(
        error?.message || tr("Mise a jour impossible.", "Failed to update reservation period."),
      );
    } finally {
      setIsUpdatingReservation(false);
    }
  };

  const planningSummaryLabel = suggestion
    ? tr(
        `${suggestion.summary.rooms_used} salle(s) - ${suggestion.summary.unused_seats} place(s) libres`,
        `${suggestion.summary.rooms_used} room(s) - ${suggestion.summary.unused_seats} free seat(s)`,
      )
    : tr("Aucune suggestion pour le moment.", "No suggestion yet.");

  if (activeTool !== TOOL_IDS.planning) {
    return (
      <section className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(122,224,148,0.14),_transparent_34%),linear-gradient(180deg,#f7faf8_0%,#eff6f1_100%)] px-6 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="space-y-3">
            <Badge className="rounded-full border border-[#d6e4da] bg-white/90 px-3 py-1 text-[12px] uppercase tracking-[0.16em] text-[#50625a]">
              {tr("Tools", "Tools")}
            </Badge>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="leoni-display-lg text-3xl font-semibold text-[#1d2a21] md:text-4xl">
                  {tr("Choisir un outil", "Choose a tool")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607066]">
                  {tr(
                    "Cette page accueillera plusieurs outils. Pour l'instant, le module Planing est disponible.",
                    "This page will host several tools. For now, the Planning module is available.",
                  )}
                </p>
              </div>
              <Badge className="rounded-full bg-[#edf9f3] px-3 py-1 text-[#157347]">
                {tr("1 outil actif", "1 active tool")}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ToolCard
              icon={Sparkles}
              title={tr("Planing", "Planning")}
              description={tr(
                "Saisir un effectif, choisir une date et une periode, obtenir un plan optimal puis reserver les classes dans la base.",
                "Enter a headcount, choose a date and period, get an optimal plan, then reserve classrooms in the database.",
              )}
              badge={tr("Disponible", "Available")}
              onClick={() => setActiveTool(TOOL_IDS.planning)}
            />
            <ToolCard
              icon={LayoutGrid}
              title={tr("Tool a venir", "Upcoming tool")}
              description={tr(
                "Emplacement reserve pour un prochain outil.",
                "Reserved spot for a future tool.",
              )}
              disabled
            />
            <ToolCard
              icon={Wrench}
              title={tr("Tool a venir", "Upcoming tool")}
              description={tr(
                "D'autres modules pourront etre ajoutes ici sans charger la page principale.",
                "Other modules can be added here without crowding the main page.",
              )}
              disabled
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(122,224,148,0.14),_transparent_34%),linear-gradient(180deg,#f7faf8_0%,#eff6f1_100%)] px-6 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              className="mt-1 h-10 rounded-xl border-[#d5ded7] bg-white"
              onClick={() => setActiveTool(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              {tr("Retour", "Back")}
            </Button>
            <div>
              <h1 className="leoni-display-lg text-3xl font-semibold text-[#1d2a21] md:text-4xl">
                {tr("Planing", "Planning")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#607066]">
                {tr(
                  "Saisissez l'effectif et le slot a reserver, ajustez le plan propose, puis confirmez pour bloquer les classes.",
                  "Enter the headcount and slot to reserve, adjust the suggested plan, then confirm to block the classrooms.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="rounded-full bg-[#e8f1fb] px-3 py-1 text-[#005ca9]">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {tr("2.5 jours pratique", "2.5 practical days")}
            </Badge>
            <Badge className="rounded-full bg-[#fff1e7] px-3 py-1 text-[#c85d00]">
              <CalendarDays className="mr-1 h-3.5 w-3.5" />
              {tr("2.5 jours theorique", "2.5 theoretical days")}
            </Badge>
            <Badge className="rounded-full bg-[#edf9f3] px-3 py-1 text-[#157347]">
              {tr(`Capacite totale ${TOTAL_CAPACITY}`, `Total capacity ${TOTAL_CAPACITY}`)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[28px] border border-[#dce8df] bg-white/92 p-6 shadow-[0_22px_60px_rgba(24,48,37,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#627168]">
                  {tr("Demande", "Request")}
                </p>
                <h2 className="mt-2 text-[28px] font-semibold text-[#1f2d24]">
                  {tr("Construire un plan", "Build a plan")}
                </h2>
              </div>
              <Badge className="rounded-full bg-[#eef5ff] px-3 py-1 text-[#0f63f2]">{planningSummaryLabel}</Badge>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1.35fr_0.95fr_0.8fr]">
              <div className="space-y-2">
                <label htmlFor="planning-date" className="text-sm font-medium text-[#223128]">
                  {tr("Date", "Date")}
                </label>
                <Input
                  id="planning-date"
                  type="date"
                  value={plannerForm.reservation_date}
                  onChange={(event) =>
                    setPlannerForm((prev) => ({ ...prev, reservation_date: event.target.value }))
                  }
                  className="h-11 rounded-xl border-[#d5dce0] px-4 text-[15px]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="planning-period" className="text-sm font-medium text-[#223128]">
                  {tr("Periode", "Period")}
                </label>
                <Select
                  value={plannerForm.period}
                  onValueChange={(value) => setPlannerForm((prev) => ({ ...prev, period: value }))}
                >
                  <SelectTrigger id="planning-period" className="h-11 rounded-xl border-[#d5dce0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {tr(period.labelFr, period.labelEn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="planning-effectif" className="text-sm font-medium text-[#223128]">
                  {tr("Nombre de personnes", "Number of people")}
                </label>
                <Input
                  id="planning-effectif"
                  type="text"
                  inputMode="numeric"
                  placeholder="28"
                  value={plannerForm.effectif}
                  onChange={(event) =>
                    setPlannerForm((prev) => ({
                      ...prev,
                      effectif: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  className="h-11 rounded-xl border-[#d5dce0]"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                className="h-10 rounded-xl bg-[#005ca9] px-5 text-white hover:bg-[#004a87]"
                onClick={handleSuggestPlan}
                disabled={isSuggesting}
              >
                {isSuggesting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {tr("Suggérer un plan", "Suggest plan")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[#d5ded7] bg-white"
                onClick={resetPlanner}
              >
                {tr("Reinitialiser", "Reset")}
              </Button>
            </div>

            {plannerError ? (
              <div className="mt-5 rounded-2xl border border-[#f4c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#b03131]">
                {plannerError}
              </div>
            ) : null}
            {plannerSuccess ? (
              <div className="mt-5 rounded-2xl border border-[#cfe9d8] bg-[#edf9f3] px-4 py-3 text-sm text-[#1b6f43]">
                {plannerSuccess}
              </div>
            ) : null}

            <div className="mt-6 rounded-[24px] border border-[#e4ece7] bg-[#f7faf8] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5f6d66]">
                    {tr("Plan editable", "Editable plan")}
                  </p>
                  <p className="mt-1 text-sm text-[#65736a]">
                    {tr(
                      "Le plan suggere remplit ce tableau. Vous pouvez ensuite redistribuer l'effectif avant confirmation.",
                      "The suggested plan fills this table. You can then redistribute the headcount before confirmation.",
                    )}
                  </p>
                </div>
                {suggestion ? (
                  <Badge className="rounded-full bg-[#edf9f3] px-3 py-1 text-[#157347]">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    {tr("Suggestion chargee", "Suggestion ready")}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {classroomAvailability.map((classroom) => (
                  <div
                    key={classroom.id}
                    className={cn(
                      "grid grid-cols-1 gap-3 rounded-2xl border px-4 py-4 md:grid-cols-[1.1fr_0.7fr_0.7fr]",
                      classroom.isAvailable ? "border-[#e0e8e3] bg-white" : "border-[#f1d6d6] bg-[#fff6f6]",
                    )}
                  >
                    <div>
                      <p className="text-base font-semibold text-[#203026]">
                        {getClassroomLabel(classroom.id, tr)}
                      </p>
                      <p className="mt-1 text-sm text-[#66746c]">
                        {tr(`Capacite ${classroom.capacity}`, `Capacity ${classroom.capacity}`)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Badge
                        className={cn(
                          "rounded-full px-3 py-1",
                          classroom.isAvailable
                            ? "bg-[#eef5ff] text-[#0f63f2]"
                            : "bg-[#fdeeee] text-[#c53030]",
                        )}
                      >
                        {classroom.isAvailable ? tr("Disponible", "Available") : tr("Reservee", "Reserved")}
                      </Badge>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={allocationDrafts[classroom.id] ?? ""}
                      onChange={(event) =>
                        setAllocationDrafts((prev) => ({
                          ...prev,
                          [classroom.id]: event.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                      disabled={!classroom.isAvailable}
                      placeholder="0"
                      className="h-11 rounded-xl border-[#d5dce0]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[#e0e8e3] bg-white px-4 py-3">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#6d7b73]">
                    {tr("Total affecte", "Total assigned")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[#1f2d24]">{totalAssigned || 0}</p>
                </div>
                <div className="rounded-2xl border border-[#e0e8e3] bg-white px-4 py-3">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#6d7b73]">
                    {tr("Effectif cible", "Target headcount")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[#1f2d24]">
                    {Number.isInteger(parsedEffectif) ? parsedEffectif : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e0e8e3] bg-white px-4 py-3">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[#6d7b73]">
                    {tr("Etat", "Status")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1f2d24]">
                    {canConfirmPlan
                      ? tr("Pret a confirmer", "Ready to confirm")
                      : tr("Ajustez la repartition", "Adjust the split")}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-[#157347] px-5 text-white hover:bg-[#0f5b34]"
                  onClick={handleConfirmPlan}
                  disabled={!canConfirmPlan || isSaving}
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {tr("Confirmer la reservation", "Confirm reservation")}
                </Button>
                {suggestion ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-[#d5ded7] bg-white"
                    onClick={() => setAllocationDrafts(buildDraftsFromAllocations(suggestion.suggested_allocations))}
                  >
                    {tr("Reprendre la suggestion", "Use suggestion again")}
                  </Button>
                ) : null}
              </div>

              {isObserver ? (
                <p className="mt-3 text-sm text-[#8a5d00]">
                  {tr(
                    "Le profil observateur peut consulter le planing mais ne peut pas confirmer une reservation.",
                    "Observer accounts can review planning but cannot confirm a reservation.",
                  )}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-[28px] border border-[#dce8df] bg-white/92 p-6 shadow-[0_22px_60px_rgba(24,48,37,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#627168]">
                  {tr("Reservations sauvegardees", "Saved reservations")}
                </p>
                <h2 className="mt-2 text-[28px] font-semibold text-[#1f2d24]">
                  {tr("Calendrier des classes", "Classroom calendar")}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Input
                  type="month"
                  value={reservationMonth}
                  onChange={(event) => setReservationMonth(event.target.value)}
                  className="h-10 w-[210px] rounded-xl border-[#d5dce0] px-4"
                />
                <Badge className="rounded-full bg-[#eef5ff] px-3 py-1 text-[#0f63f2]">
                  {tr("Fenetre 2 mois", "2-month window")}
                </Badge>
              </div>
            </div>

            {reservationsError ? (
              <div className="mt-5 rounded-2xl border border-[#f4c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#b03131]">
                {reservationsError}
              </div>
            ) : null}
            {reservationActionError ? (
              <div className="mt-5 rounded-2xl border border-[#f4c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#b03131]">
                {reservationActionError}
              </div>
            ) : null}
            {reservationActionSuccess ? (
              <div className="mt-5 rounded-2xl border border-[#cfe9d8] bg-[#edf9f3] px-4 py-3 text-sm text-[#1b6f43]">
                {reservationActionSuccess}
              </div>
            ) : null}

            <div className="mt-6">
              {isLoadingReservations ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#e4ece7] bg-[#f7faf8] px-4 py-4 text-sm text-[#5f6d66]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {tr("Chargement du calendrier...", "Loading calendar...")}
                </div>
              ) : (
                <PlanningCalendar monthValues={calendarMonthValues} reservations={reservations} tr={tr} />
              )}
            </div>

            <div className="mt-6 rounded-[24px] border border-[#e4ece7] bg-[#f7faf8] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Table2 className="h-4 w-4 text-[#005ca9]" />
                <p className="text-sm font-semibold text-[#24342a]">
                  {tr("Table des reservations", "Reservations table")}
                </p>
              </div>

              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("Ref", "Ref")}</TableHead>
                    <TableHead>{tr("Date", "Date")}</TableHead>
                    <TableHead>{tr("Periode", "Period")}</TableHead>
                    <TableHead>{tr("Classes", "Classrooms")}</TableHead>
                    <TableHead>{tr("Effectif", "Headcount")}</TableHead>
                    <TableHead>{tr("Cree par", "Created by")}</TableHead>
                    <TableHead>{tr("Action", "Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.length ? (
                    reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-semibold text-[#203026]">{reservation.reference}</TableCell>
                        <TableCell>{formatReservationDate(reservation.reservation_date)}</TableCell>
                        <TableCell>
                          {editingReservationId === reservation.id ? (
                            <Select
                              value={editingReservationPeriod}
                              onValueChange={setEditingReservationPeriod}
                            >
                              <SelectTrigger className="h-9 w-[150px] rounded-xl border-[#d5dce0]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PERIODS.map((period) => (
                                  <SelectItem key={period.id} value={period.id}>
                                    {tr(period.labelFr, period.labelEn)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            getPeriodLabel(reservation.period, tr)
                          )}
                        </TableCell>
                        <TableCell>{summarizeRooms(reservation.allocations)}</TableCell>
                        <TableCell>{reservation.effectif}</TableCell>
                        <TableCell>{reservation.created_by_name}</TableCell>
                        <TableCell>
                          {isObserver ? (
                            <span className="text-xs text-[#7a8880]">{tr("Lecture seule", "Read only")}</span>
                          ) : editingReservationId === reservation.id ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 rounded-lg bg-[#005ca9] px-3 text-white hover:bg-[#004a87]"
                                onClick={() => handleUpdateReservationPeriod(reservation.id)}
                                disabled={isUpdatingReservation}
                              >
                                {isUpdatingReservation ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  tr("Sauver", "Save")
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg border-[#d5ded7] bg-white px-3"
                                onClick={handleCancelReservationEdit}
                                disabled={isUpdatingReservation}
                              >
                                {tr("Annuler", "Cancel")}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg border-[#d5ded7] bg-white px-3"
                              onClick={() => handleStartReservationEdit(reservation)}
                            >
                              {tr("Changer periode", "Change period")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-[#708077]">
                        {tr("Aucune reservation sur ce mois.", "No reservations for this month.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
