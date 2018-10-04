interface InitializationConfig {
    initialModuleRenderCompleted: boolean;
    initialModuleLogicCompleted: boolean;
    userDefinedInitializationCallback: null | (() => void);
}

const initializationInfo: InitializationConfig = {
    initialModuleRenderCompleted: false,
    initialModuleLogicCompleted: false,
    userDefinedInitializationCallback: null,
};

export function completeInitialization(isRenderCompleted: boolean) {
    if ((!isRenderCompleted && initializationInfo.initialModuleLogicCompleted) || (isRenderCompleted && initializationInfo.initialModuleRenderCompleted)) {
        return;
    }

    if (isRenderCompleted) {
        initializationInfo.initialModuleRenderCompleted = true;
        console.timeEnd("[framework] Initial UI Render");
    } else {
        initializationInfo.initialModuleLogicCompleted = true;
        console.timeEnd("[framework] Initial Module Logic");
    }

    if (initializationInfo.initialModuleLogicCompleted && initializationInfo.initialModuleRenderCompleted) {
        if (initializationInfo.userDefinedInitializationCallback) {
            initializationInfo.userDefinedInitializationCallback();
        }
        setTimeout(() => {
            // Separate DOM update into another queue, in case callback execution suspends CSS transition
            const rootElement = document.getElementById("framework-app-root")!;
            rootElement.style.transform = "none";
            rootElement.style.opacity = "1";
        }, 0);
    }
}

export function registerUserDefinedInitializationCallback(callback: null | (() => void)) {
    initializationInfo.userDefinedInitializationCallback = callback;
}
