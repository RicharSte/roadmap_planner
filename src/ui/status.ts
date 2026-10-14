import type { NodeStatus } from "../domain/types";

/** Порядок статусов в легенде и при выборе. */
export const STATUS_ORDER: NodeStatus[] = ["unstarted", "in progress", "paused", "done"];

/** Человекочитаемые подписи статусов. */
export const STATUS_LABELS: Record<NodeStatus, string> = {
  unstarted: "Не начато",
  "in progress": "В работе",
  paused: "На паузе",
  done: "Готово",
};

/** Возвращает подпись статуса на русском. */
export function statusLabel(status: NodeStatus): string {
  return STATUS_LABELS[status];
}
