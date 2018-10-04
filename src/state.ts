import {RouterState} from "connected-react-router";

export interface LoadingState {
    [loading: string]: number; // use number to track loading status, because for global action type, there may be multiple effects listen to it, hide loading component when status reduce to 0
}

export interface State {
    shouldLogToReduxDevTools: boolean;
    router: RouterState | null;
    loading: LoadingState;
    app: {};
}

export const initialState: State = {
    shouldLogToReduxDevTools: true,
    router: null,
    loading: {},
    app: {},
};

export function showLoading(state: State, identifier: string) {
    return state.loading[identifier] > 0;
}
