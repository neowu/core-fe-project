import {NetworkConnectionException} from "../Exception";
import {app} from "../app";
import {delay} from "redux-saga/effects";
import {createActionHandlerDecorator} from "./index";

/**
 * Re-execute the action if NetworkConnectionException is thrown.
 * A warning log will be also created, for each retry.
 */
export function RetryOnNetworkConnectionError(retryIntervalSecond: number = 3) {
    return createActionHandlerDecorator(function*(handler) {
        let retryTime = 0;
        while (true) {
            const currentRoundStartTime = Date.now();
            try {
                yield* handler();
                break;
            } catch (e) {
                if (e instanceof NetworkConnectionException) {
                    retryTime++;
                    app.logger.warn({
                        action: handler.actionName,
                        errorCode: "NETWORK_FAILURE_RETRY",
                        errorMessage: `Retry #${retryTime} after ${retryIntervalSecond} seconds: ${e.message}`,
                        info: {
                            url: e.requestURL,
                            params: handler.maskedParams,
                            originalErrorMessage: e.originalErrorMessage,
                        },
                        elapsedTime: Date.now() - currentRoundStartTime,
                    });
                    yield delay(retryIntervalSecond * 1000);
                } else {
                    throw e;
                }
            }
        }
    });
}
