import {createActionHandlerDecorator} from "./index";

/**
 * To add performance trace till this action's completion.
 * It will add a warning log, if this action takes longer (since page navigation start) than threshold.
 *
 * Only add this decorator to initial module's onEnter, or some single page's onEnter.
 */

const PERFORMANCE_TRACE_ACTION = "@@framework/performance";

export function PerformanceTrace(warningThresholdSecond: number = 5) {
    return createActionHandlerDecorator(function* (handler, thisModule) {
        // For performance timing API, please refer: https://www.w3.org/blog/2012/09/performance-timing-information/
        if (performance && performance.timing) {
            const perfTiming = performance.timing;
            const baseTime = perfTiming.navigationStart;
            const relativeTiming: {[key: string]: number} = {};

            const createTimingTrack = (key: string, time?: number) => {
                if (time === undefined) {
                    relativeTiming[key] = Date.now() - baseTime;
                } else if (time >= baseTime) {
                    relativeTiming[key] = time - baseTime;
                }
            };

            try {
                createTimingTrack("business_start");
                yield* handler();
            } finally {
                const duration = Date.now() - baseTime;
                createTimingTrack("business_end");
                createTimingTrack("request_start", perfTiming.requestStart);
                createTimingTrack("response_end", perfTiming.responseEnd);
                createTimingTrack("dom_start", perfTiming.domLoading);
                createTimingTrack("dom_end", perfTiming.loadEventEnd);

                if (duration / 1000 >= warningThresholdSecond) {
                    thisModule.logger.warn({
                        action: PERFORMANCE_TRACE_ACTION,
                        info: {traced_action: handler.actionName},
                        stats: relativeTiming,
                        errorCode: "POOR_PERFORMANCE",
                        errorMessage: `Performance of [${handler.actionName}] took ${(duration / 1000).toFixed(2)} sec, longer than ${warningThresholdSecond}`,
                    });
                } else {
                    thisModule.logger.info({
                        action: PERFORMANCE_TRACE_ACTION,
                        info: {traced_action: handler.actionName},
                        stats: relativeTiming,
                    });
                }
            }
        } else {
            thisModule.logger.warn({
                action: PERFORMANCE_TRACE_ACTION,
                info: {traced_action: handler.actionName},
                errorCode: "PERFORMANCE_API_UNSUPPORTED",
                errorMessage: "Browser does not support performance timing API",
            });
            yield* handler();
        }
    });
}
