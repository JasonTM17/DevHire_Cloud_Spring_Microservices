"use client";

import { useEffect, useState } from "react";

type MonacoEditorComponent = typeof import("@monaco-editor/react").default;

type CandidateCodeEditorProps = {
  value: string;
  language: string;
  disabled: boolean;
  placeholder: string;
  lineNumbers: number[];
  onChange: (value: string) => void;
};

export function CandidateCodeEditor({
  value,
  language,
  disabled,
  placeholder,
  lineNumbers,
  onChange
}: CandidateCodeEditorProps) {
  const [MonacoEditor, setMonacoEditor] = useState<MonacoEditorComponent | null>(null);
  const [monacoFailed, setMonacoFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("@monaco-editor/react")
      .then((module) => {
        if (mounted) {
          setMonacoEditor(() => module.default);
        }
      })
      .catch(() => {
        if (mounted) {
          setMonacoFailed(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!MonacoEditor || monacoFailed) {
    return (
      <>
        <div className="assessment-line-numbers" aria-hidden="true">
          {lineNumbers.map((line) => <span key={line}>{line}</span>)}
        </div>
        <textarea
          className="assessment-code-input"
          aria-label="Candidate code submission"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          disabled={disabled}
          data-editor-mode={monacoFailed ? "textarea-fallback" : "textarea-loading"}
        />
      </>
    );
  }

  return (
    <div className="assessment-monaco-frame" data-editor-mode="monaco">
      <MonacoEditor
        height="100%"
        language={monacoLanguage(language)}
        theme="vs-dark"
        value={value}
        loading={<div className="assessment-editor-preparing">Preparing Java editor</div>}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "\"Fira Code\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16, bottom: 16 }
        }}
      />
      <textarea
        className="assessment-code-input assessment-code-input-shadow"
        aria-label="Candidate code submission"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        tabIndex={-1}
      />
    </div>
  );
}

function monacoLanguage(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.includes("typescript")) {
    return "typescript";
  }
  if (normalized.includes("sql")) {
    return "sql";
  }
  return "java";
}
