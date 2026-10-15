import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@uiw/react-codemirror";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReadDescriptionResult } from "../storage/projectStorage";

export interface DescriptionEditorProps {
  path: string;
  onLoad: (path: string) => Promise<ReadDescriptionResult>;
  onSave: (path: string, content: string) => Promise<boolean>;
}

type EditorStatus = "loading" | "ready" | "missing" | "error";

/**
 * Редактор описания ноды: CodeMirror для Markdown + переключатель «Редактор/Просмотр».
 *
 * Загружает файл при монтировании, сохраняет при потере фокуса и при размонтировании.
 * При ошибке чтения редактор доступен только для чтения, при отсутствии файла —
 * пустой редактор с пояснением, что файл будет создан при сохранении.
 */
export function DescriptionEditor({ path, onLoad, onSave }: DescriptionEditorProps) {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [errorMessage, setErrorMessage] = useState("");

  const pathRef = useRef(path);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const mountedRef = useRef(true);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

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

  const handleBlur = async (): Promise<void> => {
    if (draft !== saved) {
      const ok = await onSave(path, draft);
      if (ok) {
        setSaved(draft);
      }
    }
  };

  const isEditable = status === "ready" || status === "missing";

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
          </div>

          {mode === "edit" ? (
            <div className="description-editor-wrapper">
              {status === "missing" && (
                <p className="description-missing">Файл не найден, будет создан при сохранении.</p>
              )}
              <CodeMirror
                value={draft}
                onChange={(value) => setDraft(value)}
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
