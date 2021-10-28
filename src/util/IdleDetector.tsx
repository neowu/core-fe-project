import React from "react";
import {idleStartingTimeAction} from "../reducer";
import {app} from "../app";

interface Props {
    idleTime: number;
}

interface State {
    idleStartingTime: number | null;
}

export const IdleDetectorContext = React.createContext<number | null>(null);

export class IdleDetector extends React.PureComponent<Props, State> {
    private static createTimer(time: number, callback: (idleAt: number | null) => void) {
        let timer: number;

        function start() {
            timer = window.setTimeout(() => callback(Date.now()), time);
        }

        function reset() {
            clearTimeout(timer);
            callback(null);
            start();
        }

        function clear() {
            clearTimeout(timer);
        }

        return {start, reset, clear};
    }

    private idleTimer;

    constructor(props: Props) {
        super(props);
        this.state = {
            idleStartingTime: null,
        };
        this.idleTimer = IdleDetector.createTimer(props.idleTime, (_) => app.store.dispatch(idleStartingTimeAction(_)));
        this.idleTimer.start();
    }

    override componentDidMount() {
        window.addEventListener("click", this.idleTimer.reset);
        window.addEventListener("touchmove", this.idleTimer.reset);
        window.addEventListener("keydown", this.idleTimer.reset);
        window.addEventListener("mousemove", this.idleTimer.reset);
    }

    override componentWillUnmount() {
        window.removeEventListener("click", this.idleTimer.reset);
        window.removeEventListener("touchmove", this.idleTimer.reset);
        window.removeEventListener("keydown", this.idleTimer.reset);
        window.removeEventListener("mousemove", this.idleTimer.reset);
        this.idleTimer.clear();
    }

    override render() {
        const {idleStartingTime} = this.state;
        return <IdleDetectorContext.Provider value={idleStartingTime}>{this.props.children}</IdleDetectorContext.Provider>;
    }
}
