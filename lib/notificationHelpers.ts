export type AppNotification = {
  id: string;
  user_id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  link_url: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export const safeNotificationTime = (created_at: string | null) => {
  const t = created_at ? Date.parse(created_at) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

export const isGenericAcceptedNotif = (n: AppNotification) => {
  const title = (n.title || "").toLowerCase();
  const msg = (n.message || "").toLowerCase();

  return (
    title.includes("entanglement accepted") &&
    (msg.includes("your entanglement request was accepted") ||
      msg.startsWith("your entanglement request"))
  );
};

export const isNamedAcceptedNotif = (n: AppNotification) => {
  const title = (n.title || "").toLowerCase();
  const msg = (n.message || "").toLowerCase();

  return (
    title.includes("entanglement accepted") &&
    msg.includes(" accepted your entanglement request")
  );
};

export const notificationGroupKey = (n: AppNotification) =>
  `${n.user_id || ""}__${n.type || ""}__${n.title || ""}__${n.link_url || ""}`;

export const sameNotificationGroup = (
  a: AppNotification,
  b: AppNotification
) =>
  a.user_id === b.user_id &&
  a.type === b.type &&
  a.title === b.title &&
  a.link_url === b.link_url;

export const dedupeNotifications = (rows: AppNotification[]) => {
  const bestByKey: Record<string, AppNotification> = {};

  for (let i = 0; i < rows.length; i++) {
    const n = rows[i];
    const key = notificationGroupKey(n);

    const cur = bestByKey[key];
    if (!cur) {
      bestByKey[key] = n;
      continue;
    }

    const nUnread = !n.is_read;
    const curUnread = !cur.is_read;

    // Prefer unread representative over read representative
    if (nUnread && !curUnread) {
      bestByKey[key] = n;
      continue;
    }
    if (curUnread && !nUnread) {
      continue;
    }

    const nNamed = isNamedAcceptedNotif(n);
    const curNamed = isNamedAcceptedNotif(cur);
    const nGeneric = isGenericAcceptedNotif(n);
    const curGeneric = isGenericAcceptedNotif(cur);

    // Prefer the named accepted message over the generic accepted one
    if (nNamed && curGeneric) {
      bestByKey[key] = n;
      continue;
    }
    if (curNamed && nGeneric) {
      continue;
    }

    // Otherwise keep newest
    const nTime = safeNotificationTime(n.created_at);
    const curTime = safeNotificationTime(cur.created_at);

    if (nTime >= curTime) bestByKey[key] = n;
  }

  return Object.values(bestByKey).sort(
    (a, b) => safeNotificationTime(b.created_at) - safeNotificationTime(a.created_at)
  );
};
