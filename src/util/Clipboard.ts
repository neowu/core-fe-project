export class Clipboard {
    static copy(text: string) {
        const element = document.createElement("textarea");
        element.value = text;
        element.style.position = "absolute";
        element.style.left = "-9999px";
        element.setAttribute("readonly", "");
        document.body.appendChild(element);

        // In case there is already some text selection by user, store the previous selection & recover later
        const selection = document.getSelection();
        const selected = selection != null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        element.select();
        document.execCommand("copy");
        document.body.removeChild(element);

        if (selection && selected) {
            selection.removeAllRanges();
            selection.addRange(selected);
        }
    }
}
