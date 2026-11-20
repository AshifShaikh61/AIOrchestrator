import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Bundle Monaco locally so it works hermetically without external CDN fetches
loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'json' | 'typescript' | 'javascript' | 'sql';
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'json',
  height = '180px',
  readOnly = false,
}: CodeEditorProps) {
  return (
    <div className="rounded-[8px] border border-[#E5E7EB] overflow-hidden bg-[#F8FAFC]">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange?.(val ?? '')}
        theme="vs"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 8, bottom: 8 },
          overviewRulerBorder: false,
          renderLineHighlight: 'line',
        }}
        loading={
          <textarea
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full h-full p-3 bg-[#F8FAFC] font-mono text-[12px] text-[#0F172A] focus:outline-none resize-none"
          />
        }
      />
    </div>
  );
}
