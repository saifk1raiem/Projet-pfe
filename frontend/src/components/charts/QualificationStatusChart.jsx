import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { Card } from "../ui/card";

const STATUS_DEFINITION = [
  {
    key: "qualifie",
    nameFr: "Qualifie",
    nameEn: "Qualified",
    aliases: ["qualifie", "qualifiee", "qualifies", "qualified"],
    color: "#005ca9",
  },
  {
    key: "en_cours",
    nameFr: "En cours",
    nameEn: "In progress",
    aliases: ["en cours", "in progress"],
    color: "#fc6200",
  },
  {
    key: "non_associee",
    nameFr: "Non associee",
    nameEn: "Not associated",
    aliases: ["non associe", "non associee", "not associated"],
    color: "#ea3737",
  },
  {
    key: "depassement",
    nameFr: "Depassement",
    nameEn: "Overdue",
    aliases: ["depassement", "overdue"],
    color: "#7b35e8",
  },
];

const sanitizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const resolveStatusKey = (value) => {
  const normalized = sanitizeStatus(value);
  if (!normalized) return "non_associee";

  const status = STATUS_DEFINITION.find((entry) => entry.aliases.includes(normalized));
  return status ? status.key : null;
};

const buildInitialData = (tr) =>
  STATUS_DEFINITION.map((status) => ({
    key: status.key,
    name: tr(status.nameFr, status.nameEn),
    value: 0,
    color: status.color,
  }));

export function QualificationStatusChart({ accessToken }) {
  const { tr } = useAppPreferences();
  const [data, setData] = useState(() => buildInitialData(tr));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStatusData = async () => {
      if (!accessToken) {
        setData(buildInitialData(tr));
        setLoadError("");
        return;
      }

      try {
        const response = await fetch(apiUrl("/qualification"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const rows = await response.json().catch(() => []);
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(tr("Impossible de charger les statuts de qualification.", "Failed to load qualification statuses."));
            setData(buildInitialData(tr));
          }
          return;
        }

        const countsByStatus = {
          qualifie: 0,
          en_cours: 0,
          non_associee: 0,
          depassement: 0,
        };

        if (Array.isArray(rows)) {
          rows.forEach((row) => {
            const key = resolveStatusKey(row?.statut);
            if (key && Object.prototype.hasOwnProperty.call(countsByStatus, key)) {
              countsByStatus[key] += 1;
            }
          });
        }

        if (!cancelled) {
          setData(
            STATUS_DEFINITION.map((status) => ({
              key: status.key,
              name: tr(status.nameFr, status.nameEn),
              value: countsByStatus[status.key],
              color: status.color,
            })),
          );
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les statuts de qualification.", "Failed to load qualification statuses."));
          setData(buildInitialData(tr));
        }
      }
    };

    loadStatusData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const total = useMemo(
    () => data.reduce((sum, entry) => sum + entry.value, 0),
    [data],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Statut de Qualification</h3>
        <p className="text-[15px] text-[#5f6777]">Etat actuel des qualifications des collaborateurs</p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="52%"
            labelLine={false}
            label={({ name, percent }) => {
              const percentage = total > 0 && Number.isFinite(percent) ? (percent * 100).toFixed(0) : "0";
              return `${name} ${percentage}%`;
            }}
            outerRadius={124}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const statusName = item?.payload?.name ?? "";
              return [`${value}`, statusName];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
