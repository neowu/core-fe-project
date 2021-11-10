import React from "react";
import {State, idleStateActions, IdleState} from "../reducer";
import {useDispatch, useSelector} from "react-redux";

export const DEFAULT_IDLE_TIMEOUT = 300;

interface Props {
    children: React.ReactNode;
}

export const IdleDetectorContext = React.createContext<IdleState>({
    timeout: DEFAULT_IDLE_TIMEOUT,
    state: "active",
});

function createTimer(time: number, callback: (idleState: IdleState["state"]) => void) {
    let timer: number;

    function start() {
        timer = window.setTimeout(() => callback("idle"), time * 1000);
    }

    function reset() {
        clearTimeout(timer);
        callback("active");
        start();
    }

    function clear() {
        clearTimeout(timer);
    }

    return {start, reset, clear};
}

export function IdleDetector(props: Props) {
    const {children} = props;
    const {timeout, state} = useSelector((state: State) => state.idle);
    const stateRef = React.useRef(state);
    stateRef.current = state;

    const dispatch = useDispatch();

    React.useEffect(() => {
        if (timeout > 0) {
            const idleTimer = createTimer(timeout, (newIdleState) => {
                if (newIdleState !== stateRef.current) {
                    dispatch(idleStateActions(newIdleState));
                }
            });
            idleTimer.start();
            window.addEventListener("click", idleTimer.reset);
            window.addEventListener("touchmove", idleTimer.reset);
            window.addEventListener("keydown", idleTimer.reset);
            window.addEventListener("mousemove", idleTimer.reset);

            return () => {
                window.removeEventListener("click", idleTimer.reset);
                window.removeEventListener("touchmove", idleTimer.reset);
                window.removeEventListener("keydown", idleTimer.reset);
                window.removeEventListener("mousemove", idleTimer.reset);
                idleTimer.clear();
            };
        }
    }, [timeout]);

    return <IdleDetectorContext.Provider value={{state, timeout}}>{children}</IdleDetectorContext.Provider>;
}
