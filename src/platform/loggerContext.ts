function generateVisitorId() {
    // A UUID for current visitor, based on:
    // - Current time (in millisecond)
    // - Some random number (around 1000~10000000)
    // E.g: 169e68f80c9-1b4104
    return new Date().getTime().toString(16) + "-" + Math.floor(Math.random() * 9999900 + 1000).toString(16);
}

function getVisitorId() {
    const token = "@@framework-id";
    const previousId = localStorage.getItem(token);
    if (previousId) {
        return previousId;
    } else {
        const newId = generateVisitorId();
        localStorage.setItem(token, newId);
        return newId;
    }
}

export const loggerContext = {
    path: () => location.href,
    visitorId: getVisitorId(),
};
