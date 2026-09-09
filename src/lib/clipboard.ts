/**
 * Writes to the system clipboard, reporting whether it landed. The API rejects
 * when the document is not focused, which a menu click can leave it.
 */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
