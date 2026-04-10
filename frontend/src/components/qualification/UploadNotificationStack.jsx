import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarRange,
  Clock3,
  X,
} from "lucide-react";

const NOTIFICATION_STYLES = {
  error: {
    Icon: AlertTriangle,
    cardClassName: "border-[#f4c2c2] bg-[#fff4f4] text-[#8a1d1d]",
    iconClassName: "bg-[#fde2e2] text-[#c92a2a]",
    actionClassName: "text-[#8a1d1d]",
  },
  absence: {
    Icon: Clock3,
    cardClassName: "border-[#f5d1ad] bg-[#fff7ef] text-[#8a4b00]",
    iconClassName: "bg-[#ffe8cc] text-[#c45a00]",
    actionClassName: "text-[#8a4b00]",
  },
  return: {
    Icon: ArrowRightLeft,
    cardClassName: "border-[#bfd9f1] bg-[#f3f9ff] text-[#0f4f85]",
    iconClassName: "bg-[#dcecff] text-[#005ca9]",
    actionClassName: "text-[#0f4f85]",
  },
  consecutive: {
    Icon: CalendarRange,
    cardClassName: "border-[#d6c6f7] bg-[#f7f3ff] text-[#5f3ca5]",
    iconClassName: "bg-[#e9e0ff] text-[#7b35e8]",
    actionClassName: "text-[#5f3ca5]",
  },
};

export function UploadNotificationStack({ tr, notifications, signature }) {
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    setDismissedIds([]);
  }, [signature]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedIds.includes(notification.id)),
    [dismissedIds, notifications],
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-40 flex w-[min(92vw,380px)] flex-col gap-3">
      {visibleNotifications.map((notification) => {
        const styles = NOTIFICATION_STYLES[notification.tone] || NOTIFICATION_STYLES.error;
        const Icon = styles.Icon;

        const handleDismiss = () => {
          setDismissedIds((prev) => [...prev, notification.id]);
        };

        const handleOpen = () => {
          notification.onClick?.();
          handleDismiss();
        };

        return (
          <div
            key={notification.id}
            className={`pointer-events-auto rounded-[22px] border p-4 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur ${styles.cardClassName}`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handleOpen}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${styles.iconClassName}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-5">
                    {notification.title}
                  </span>
                  {notification.description ? (
                    <span className="mt-1 block text-[13px] leading-5 opacity-90">
                      {notification.description}
                    </span>
                  ) : null}
                  {notification.actionLabel ? (
                    <span className={`mt-2 inline-flex text-[12px] font-semibold ${styles.actionClassName}`}>
                      {notification.actionLabel}
                    </span>
                  ) : null}
                </span>
              </button>

              <button
                type="button"
                aria-label={tr("Fermer la notification", "Dismiss notification")}
                onClick={handleDismiss}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-current/70 transition hover:bg-black/5 hover:text-current"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
