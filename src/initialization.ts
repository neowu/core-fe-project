const initializationMap: {[module: string]: boolean} = {};
let initializationCallback: (() => void) | undefined;
let hasInitialized = false;

export function setInitializationCallback(callback: () => void) {
    initializationCallback = callback;
}

export function markModuleAsInitialized(moduleName: string) {
    initializationMap[moduleName] = true;
    if (!hasInitialized && Object.values(initializationMap).every(_ => _)) {
        hasInitialized = true;
        if (initializationCallback) {
            initializationCallback();
        }
    }
}
