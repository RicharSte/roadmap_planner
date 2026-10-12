# 0006. Markdown editor: CodeMirror 6 + react-markdown preview
Status: accepted
Date: 2026-10-13

## Decision
Source editing with CodeMirror 6 via `@uiw/react-codemirror` + `@codemirror/lang-markdown`.
Preview via `react-markdown` (toggle or split). No WYSIWYG editors (they rewrite markdown on save).

## Consequences
- Autosave is debounced; editor content is the source, file is written atomically.
- react-markdown must not render raw HTML (default; do not enable `rehype-raw`).
