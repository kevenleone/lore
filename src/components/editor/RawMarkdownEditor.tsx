interface RawMarkdownEditorProps {
    onChange: (markdown: string) => void;
    placeholder?: string;
    value: string;
}

export function RawMarkdownEditor({
    onChange,
    placeholder,
    value,
}: RawMarkdownEditorProps): React.JSX.Element {
    return (
        <textarea
            autoFocus
            className="mt-5 mb-1 min-h-[240px] w-full resize-y rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] text-text2"
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            value={value}
        />
    );
}
