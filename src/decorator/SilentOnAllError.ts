import {createActionHandlerDecorator} from "./index";
import {app} from "../app";

/**
 * Do nothing (only create a warning/error log) if any error is thrown.
 * Mainly used for background tasks.
 */
export function SilentOnAllError() {
    return createActionHandlerDecorator(function*(handler) {
        try {
            yield* handler();
        } catch (e) {
            app.logger.exception(e, handler.actionName, {
                params: handler.maskedParams,
                isSilent: "true",
            });
            // Stop propagation
        }
    });
}
