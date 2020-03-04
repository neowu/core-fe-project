import {app} from "../app";
import {createActionHandlerDecorator} from "./index";

/**
 * To add a log item for action, with execution duration, action name, and masked action parameters.
 */
export function Log() {
    return createActionHandlerDecorator(function*(handler) {
        const startTime = Date.now();
        try {
            yield* handler();
        } finally {
            app.logger.info(handler.actionName, {actionPayload: handler.maskedParams}, Date.now() - startTime);
        }
    });
}
