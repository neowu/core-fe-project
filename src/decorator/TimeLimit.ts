import {delay, call} from "redux-saga/effects";
import {NetworkConnectionException} from "../Exception";
import {createActionHandlerDecorator} from "./index";
import {race} from "../typed-saga";

/**
 * Throws NetworkConnectionException if the action executes longer than specified second.
 */
export function TimeLimit(second: number) {
    return createActionHandlerDecorator(function*(handler) {
        // Auto cancelled if lost in race
        const raceResult = yield* race({
            actionExecution: call(handler),
            timerExecution: delay(second * 1000),
        });
        if (raceResult.timerExecution) {
            throw new NetworkConnectionException(`[${handler.actionName}] time-out (${second} seconds)`, "[No URL]");
        }
    });
}
