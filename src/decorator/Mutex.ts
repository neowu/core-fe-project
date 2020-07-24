import {createActionHandlerDecorator} from "./index";

/**
 * If specified, the action cannot be entered by other sagas during execution.
 * For error handler action, mutex logic is auto added.
 */
export function Mutex() {
    let lockTime: number | null = null;
    return createActionHandlerDecorator(function* (handler, thisModule) {
        if (lockTime) {
            thisModule.logger.info(handler.actionName, {
                actionPayload: handler.maskedParams,
                mutexLocked: "true",
                lockedDuration: (Date.now() - lockTime).toString(),
            });
        } else {
            try {
                lockTime = Date.now();
                yield* handler();
            } finally {
                lockTime = null;
            }
        }
    });
}
