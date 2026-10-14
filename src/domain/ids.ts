import type { Project } from "./types";

const PREFIX = "n_";
const ID_LENGTH = 10;

/**
 * Алфавит для случайной части id.
 * Исключены похожие символы: i, l, o, u.
 * Итого 32 символа — степень двойки, что упрощает равномерное распределение.
 */
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * Генерирует новый уникальный id узла.
 * Формат: префикс `n_` + 10 случайных символов из безопасного алфавита.
 * При коллизии делает до 20 попыток, после чего бросает ошибку.
 *
 * @param nodes — текущая карта узлов; используется только для проверки уникальности.
 * @returns новый id, которого ещё нет в `nodes`.
 */
export function createNodeId(nodes: Record<string, unknown> | Project["nodes"]): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = PREFIX + randomString(ID_LENGTH);
    if (!(id in nodes)) {
      return id;
    }
  }
  throw new Error("createNodeId: не удалось сгенерировать уникальный id за 100 попыток");
}

/** Возвращает случайную строку заданной длины из ALPHABET. */
function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
