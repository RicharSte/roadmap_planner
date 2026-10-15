import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@uiw/react-codemirror";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReadDescriptionResult } from "../storage/projectStorage";

const AUTOSAVE_DELAY_MS = 800;

export interface DescriptionEditorProps {
  path: string;
  onLoad: (path: string) => Promise<ReadDescriptionResult>;
  onSave: (path: string, content: string) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  hasSaveError?: boolean;
}

type EditorStatus = "loading" | "ready" | "missing" | "error";

/**
 * Редактор описания ноды: CodeMirror для Markdown + переключатель «Редактор/Просмотр».
 *
 * Загружает файл при монтировании, сохраняет при потере фокуса, при размонтировании
 * и автоматически через 800 мс после последнего изменения (debounce).
 * При ошибке чтения редактор доступен только для чтения, при отсутствии файла —
 * пустой редактор с пояснением, что файл будет создан при сохранении.
 */
export function DescriptionEditor({
  path,
  onLoad,
  onSave,
  onDirtyChange,
  hasSaveError = false,
}: DescriptionEditorProps) {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [errorMessage, setErrorMessage] = useState("");

  const pathRef = useRef(path);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const mountedRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  /**
   * Сохраняет текущий черновик, если он отличается от сохранённой версии.
   * При успехе синхронизирует `saved` с актуальным `draft`.
   */
  const flush = useCallback(async (): Promise<void> => {
    if (draftRef.current === savedRef.current) {
      return;
    }

    const content = draftRef.current;
    const ok = await onSave(pathRef.current, content);

    if (ok && mountedRef.current) {
      setSaved(content);
    }
  }, [onSave]);

  /**
   * Сбрасывает таймер debounce при изменении текста и перезапускает
   * автосохранение через `AUTOSAVE_DELAY_MS`.
   */
  const handleChange = useCallback(
    (value: string): void => {
      setDraft(value);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        void flush();
      }, AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    mountedRef.current = true;

    async function load(): Promise<void> {
      const result = await onLoad(path);

      if (!mountedRef.current) {
        return;
      }

      if (result.kind === "loaded") {
        setDraft(result.content);
        setSaved(result.content);
        setStatus("ready");
        setMode(result.content.length > 0 ? "preview" : "edit");
        return;
      }

      if (result.kind === "missing") {
        setDraft("");
        setSaved("");
        setStatus("missing");
        setMode("edit");
        return;
      }

      setDraft("");
      setSaved("");
      setErrorMessage(result.message);
      setStatus("error");
    }

    void load();

    return () => {
      mountedRef.current = false;

      if (draftRef.current !== savedRef.current) {
        void onSave(pathRef.current, draftRef.current);
      }
    };
  }, [path, onLoad, onSave]);

  /** Очищает debounce-таймер при размонтировании компонента. */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /** Сообщает родителю, есть ли несохранённые правки в редакторе. */
  useEffect(() => {
    const dirty = draft !== saved;
    onDirtyChange?.(dirty);

    return () => {
      onDirtyChange?.(false);
    };
  }, [draft, saved, onDirtyChange]);

  const handleBlur = async (): Promise<void> => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await flush();
  };

  const isEditable = status === "ready" || status === "missing";
  const showDirty = draft !== saved || hasSaveError;

  return (
    <div className="description-editor" data-testid="description-editor" onBlur={handleBlur}>
      {status === "loading" && <p className="description-loading">Загрузка описания…</p>}

      {status === "error" && (
        <div className="description-error" role="alert">
          <strong>Не удалось загрузить описание</strong>
          <span className="description-error-code">{errorMessage}</span>
        </div>
      )}

      {(status === "ready" || status === "missing" || status === "error") && (
        <div className="description-editor-body">
          <div className="description-mode-switch" role="tablist" aria-label="Режим описания">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "edit"}
              disabled={mode === "edit"}
              onClick={() => setMode("edit")}
              data-testid="description-mode-edit"
            >
              Редактор
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "preview"}
              disabled={mode === "preview"}
              onClick={() => setMode("preview")}
              data-testid="description-mode-preview"
            >
              Просмотр
            </button>
            {showDirty && (
              <span className="description-dirty" data-testid="description-dirty-indicator">
                Не сохранено
              </span>
            )}
          </div>

          {mode === "edit" ? (
            <div className="description-editor-wrapper">
              {status === "missing" && (
                <p className="description-missing">Файл не найден, будет создан при сохранении.</p>
              )}
              <CodeMirror
                value={draft}
                onChange={handleChange}
                extensions={[markdown(), EditorView.lineWrapping]}
                basicSetup={false}
                editable={isEditable}
                className="description-codemirror"
                data-testid="description-codemirror"
              />
            </div>
          ) : (
            <div className="description-preview" data-testid="description-preview">
              {draft.length === 0 ? (
                <p className="description-empty-preview">Нет текста для предпросмотра</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ children }) => <span>{children}</span>,
                    img: ({ alt }) => <span>{alt}</span>,
                  }}
                >
                  {draft}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
