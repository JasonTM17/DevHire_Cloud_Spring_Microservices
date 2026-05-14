"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import { readIdeState } from "@/lib/ide/persistence";

import "@/styles/components/code-editor.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MonacoEditorComponent = typeof import("@monaco-editor/react").default;
type MonacoType = typeof import("monaco-editor");

export interface CandidateCodeEditorProps {
  value: string;
  language: string;
  /** Whether the editor is read-only. Alias for `disabled`. */
  readOnly?: boolean;
  /** @deprecated Use `readOnly` instead. */
  disabled?: boolean;
  placeholder?: string;
  /** @deprecated Line numbers are now auto-generated from value. Kept for backward compatibility. */
  lineNumbers?: number[];
  onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONACO_LOAD_TIMEOUT_MS = 8_000;
const DEFAULT_FONT_SIZE = 14;

// ---------------------------------------------------------------------------
// Theme definition using --dh-color-* tokens
// ---------------------------------------------------------------------------

function getComputedToken(token: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function registerDevhireDarkTheme(monaco: MonacoType) {
  const bg = getComputedToken("--dh-color-bg-canvas") || "#0f1419";
  const surface = getComputedToken("--dh-color-bg-surface") || "#1a2332";
  const elevated = getComputedToken("--dh-color-bg-elevated") || "#243044";
  const fgPrimary = getComputedToken("--dh-color-fg-primary") || "#f0f4f8";
  const fgSecondary = getComputedToken("--dh-color-fg-secondary") || "#c9d7e8";
  const fgMuted = getComputedToken("--dh-color-fg-muted") || "#8a97aa";
  const accent = getComputedToken("--dh-color-accent") || "#60a5fa";
  const brand = getComputedToken("--dh-color-brand") || "#2dd4bf";
  const success = getComputedToken("--dh-color-success") || "#34d399";
  const warn = getComputedToken("--dh-color-warn") || "#fbbf24";
  const danger = getComputedToken("--dh-color-danger") || "#f87171";
  const borderDefault = getComputedToken("--dh-color-border-default") || "#2d3d52";
  const focusRing = getComputedToken("--dh-color-border-focus") || "#60a5fa";

  monaco.editor.defineTheme("devhire-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: fgPrimary.replace("#", "") },
      { token: "comment", foreground: fgMuted.replace("#", ""), fontStyle: "italic" },
      { token: "keyword", foreground: accent.replace("#", "") },
      { token: "string", foreground: success.replace("#", "") },
      { token: "number", foreground: warn.replace("#", "") },
      { token: "type", foreground: brand.replace("#", "") },
      { token: "function", foreground: fgSecondary.replace("#", "") },
      { token: "variable", foreground: fgPrimary.replace("#", "") },
      { token: "operator", foreground: danger.replace("#", "") },
      { token: "delimiter", foreground: fgMuted.replace("#", "") },
      { token: "annotation", foreground: warn.replace("#", "") },
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fgPrimary,
      "editor.lineHighlightBackground": surface,
      "editor.selectionBackground": elevated,
      "editorCursor.foreground": accent,
      "editorLineNumber.foreground": fgMuted,
      "editorLineNumber.activeForeground": fgSecondary,
      "editor.selectionHighlightBackground": `${elevated}80`,
      "editorIndentGuide.background": borderDefault,
      "editorIndentGuide.activeBackground": fgMuted,
      "editorBracketMatch.background": `${elevated}60`,
      "editorBracketMatch.border": focusRing,
      "minimap.background": bg,
      "scrollbarSlider.background": `${borderDefault}80`,
      "scrollbarSlider.hoverBackground": `${borderDefault}cc`,
    },
  });
}

// ---------------------------------------------------------------------------
// Language normalization
// ---------------------------------------------------------------------------

function normalizeLanguage(language: string): string {
  const lower = language.toLowerCase();
  if (lower.includes("typescript") || lower === "ts") return "typescript";
  if (lower.includes("sql")) return "sql";
  return "java";
}

// ---------------------------------------------------------------------------
// Textarea Fallback with line-number gutter
// ---------------------------------------------------------------------------

function TextareaFallback({
  value,
  language,
  readOnly,
  disabled,
  placeholder,
  onChange,
}: CandidateCodeEditorProps) {
  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const isReadOnly = readOnly ?? disabled ?? false;

  return (
    <div className="dh-code-editor__fallback">
      <div className="dh-code-editor__gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <span key={i + 1} className="dh-code-editor__line-number">
            {i + 1}
          </span>
        ))}
      </div>
      <textarea
        data-editor-mode="textarea-fallback"
        className="dh-code-editor__textarea"
        aria-label="Candidate code submission"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        disabled={isReadOnly}
        readOnly={isReadOnly}
        data-language={normalizeLanguage(language)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CandidateCodeEditor({
  value,
  language,
  readOnly,
  disabled = false,
  placeholder = "",
  lineNumbers: _lineNumbers,
  onChange,
}: CandidateCodeEditorProps) {
  const isReadOnly = readOnly ?? disabled;
  const [MonacoEditor, setMonacoEditor] = useState<MonacoEditorComponent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const themeRegistered = useRef(false);
  const mountedRef = useRef(true);

  // Read persisted font size from IDE state
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  useEffect(() => {
    const ideState = readIdeState();
    if (ideState?.fontSize && ideState.fontSize > 0) {
      setFontSize(ideState.fontSize);
    }
  }, []);

  // Dynamic import with 8s timeout
  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadMonaco = async () => {
      try {
        const result = await Promise.race([
          import("@monaco-editor/react"),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error("Monaco load timeout")),
              MONACO_LOAD_TIMEOUT_MS
            );
          }),
        ]);

        if (mountedRef.current) {
          setMonacoEditor(() => (result as { default: MonacoEditorComponent }).default);
          setIsLoading(false);
        }
      } catch {
        if (mountedRef.current) {
          setLoadFailed(true);
          setIsLoading(false);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    loadMonaco();

    return () => {
      mountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Monaco beforeMount callback to register theme
  const handleBeforeMount = useCallback((monaco: MonacoType) => {
    if (!themeRegistered.current) {
      registerDevhireDarkTheme(monaco);
      themeRegistered.current = true;
    }
  }, []);

  // Monaco onChange handler
  const handleEditorChange = useCallback(
    (nextValue: string | undefined) => {
      onChange(nextValue ?? "");
    },
    [onChange]
  );

  const normalizedLang = normalizeLanguage(language);

  // Loading state — show skeleton
  if (isLoading && !loadFailed) {
    return (
      <div className="dh-code-editor" aria-label="Code editor region" role="region">
        <SkeletonLoader
          shape="rect"
          width="100%"
          height="100%"
          aria-label="Loading code editor..."
        />
      </div>
    );
  }

  // Fallback state — Monaco failed or timed out
  if (loadFailed || !MonacoEditor) {
    return (
      <div className="dh-code-editor" aria-label="Code editor region" role="region">
        <TextareaFallback
          value={value}
          language={language}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          placeholder={placeholder}
          onChange={onChange}
        />
      </div>
    );
  }

  // Monaco editor loaded successfully
  return (
    <div
      className="dh-code-editor"
      aria-label="Code editor region"
      role="region"
      data-editor-mode="monaco"
    >
      <MonacoEditor
        height="100%"
        language={normalizedLang}
        theme="devhire-dark"
        value={value}
        beforeMount={handleBeforeMount}
        onChange={handleEditorChange}
        loading={
          <SkeletonLoader
            shape="rect"
            width="100%"
            height="100%"
            aria-label="Preparing editor..."
          />
        }
        options={{
          ariaLabel: "Candidate code submission",
          readOnly: isReadOnly,
          fontSize,
          fontFamily: "var(--dh-font-mono, 'Fira Code', 'SFMono-Regular', Consolas, monospace)",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          minimap: { enabled: true },
          autoIndent: "full",
          bracketPairColorization: { enabled: true },
          folding: true,
          foldingStrategy: "indentation",
          matchBrackets: "always",
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
        }}
      />
    </div>
  );
}
