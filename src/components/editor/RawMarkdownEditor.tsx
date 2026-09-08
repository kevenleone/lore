// Raw mode: the body as text, in a plain textarea.
//
// Deliberately not CodeMirror. This is the escape hatch — the thing you reach
// for when the block editor cannot represent what you need — so it must be the
// component with the fewest moving parts in the app, not another editor with
// its own theming and its own bugs.

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
            className="mt-5 mb-1 min-h-[240px] w-full resize-y rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] text-text2 outline-none"
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            value={value}
        />
    );
}
