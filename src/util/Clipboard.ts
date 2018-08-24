export class Clipboard {
    static copy(text: string) {
        const element = document.createElement("textarea");
        element.value = text;
        element.style.position = "absolute";
        element.style.left = "-9999px";
        element.setAttribute("readonly", "");
        document.body.appendChild(element);

        // In case there is already some text selection by user, store the previous selection & recover later
        const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
        element.select();
        document.execCommand("copy");
        document.body.removeChild(element);

        if (selected) {
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(selected);
        }
    }
}
