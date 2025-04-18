import {NetworkConnectionException} from "../Exception";
import {createActionHandlerDecorator} from "./createActionHandlerDecorator";
import {app} from "../app";

/**
 * Do nothing (only create a warning log) if NetworkConnectionException is thrown.
 * Mainly used for background tasks.
 */
export function SilentOnNetworkConnectionError() {
    return createActionHandlerDecorator(function* (handler) {
        try {
            yield* handler();
        } catch (e) {
            if (e instanceof NetworkConnectionException) {
                app.logger.exception(e, {
                    action: handler.actionName,
                    info: {
                        payload: handler.maskedParams,
                        process_method: "silent",
                    },
                });
            } else {
                throw e;
            }
        }
    });
}
