import {compose, StoreEnhancer} from "redux";
import {DEV_TOOLS_LOG_ACTION, LOADING_ACTION} from "./action/reducer";
import {State} from "./state";
import {Action} from "./type";

export function composeWithDevTools(enhancer: StoreEnhancer): StoreEnhancer {
    let composeEnhancers = compose;
    const production = process.env.NODE_ENV === "production";
    if (!production) {
        const extension = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
        if (extension) {
            composeEnhancers = extension({
                // Ref: https://github.com/zalmoxisus/redux-devtools-extension/blob/master/docs/API/Arguments.md
                actionsBlacklist: [DEV_TOOLS_LOG_ACTION, LOADING_ACTION],
                predicate: (state: State, action: Action<any>) => state.shouldLogToReduxDevTools,
            });
        }
    }
    return composeEnhancers(enhancer);
}
