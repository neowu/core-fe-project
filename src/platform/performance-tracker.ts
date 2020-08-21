import {getCLS, getFCP, getFID, getLCP, getTTFB, Metric} from "web-vitals";
import {logger} from "../app";

// Ref: https://wicg.github.io/event-timing/#sec-performance-event-timing
interface PerformanceEventTiming extends PerformanceEntry {
    processingStart: DOMHighResTimeStamp;
    cancelable?: boolean;
    target?: Element;
}

export const GLOBAL_PERFORMANCE_ACTION = "@@framework/performance";

export function registerPerformanceTracker(): void {
    /**
     * Ref:
     *  https://web.dev/vitals/
     *  https://web.dev/time-to-first-byte/
     *  https://web.dev/time-to-first-byte/
     *  https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
     *  https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API
     *  https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming
     *  https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API/Using_the_Resource_Timing_API
     *  https://stackoverflow.com/questions/16808486/explanation-of-window-performance-javascript
     */
    getLCP(logWebVital);
    getFID(logWebVital);
    getCLS(logWebVital);
    getTTFB(logWebVital);
    getFCP(logWebVital);
    setTimeout(logPagePerformance, 5000); // Reserve enough time for page load completion
}

function logPagePerformance(): void {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart; // How quickly the page is visible
    const pageRenderTime = perfData.domComplete - perfData.domLoading; // How quickly the page is usable
    const performanceResourceTimingEntries = window.performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const pageTransferSize = sumByKey(performanceResourceTimingEntries, "transferSize");
    logger.info(GLOBAL_PERFORMANCE_ACTION, {
        name: "Page Load Performance",
        pageLoadTime: pageLoadTime.toString(),
        pageRenderTime: pageRenderTime.toString(),
        pageTransferSize: pageTransferSize.toString() + " bytes",
    });
}

function logWebVital(metric: Metric): void {
    let metricEntriesString;
    try {
        metricEntriesString = JSON.stringify(metric.entries);
    } catch (e) {
        const enhancedEvent = metric.entries[0] as PerformanceEventTiming;
        if (enhancedEvent && enhancedEvent.target) {
            metricEntriesString = "[FID-Specific Entry]\n" + JSON.stringify(enhancedEvent.target.outerHTML);
        } else {
            metricEntriesString = `No valid entry, length: ${metric.entries.length}`;
        }
    } finally {
        logger.info(GLOBAL_PERFORMANCE_ACTION, {
            name: `Web Vital (${metric.name})`,
            value: metric.value.toString(),
            rating: webVitalRating(metric.name, metric.value),
            performanceEntries: metricEntriesString,
        });
    }
}

function sumByKey<T>(array: ReadonlyArray<T>, key: keyof T): number {
    let sum = 0;
    array.forEach((_) => (sum = sum + (Number(_[key]) || 0)));
    return sum;
}

function webVitalRating(type: Metric["name"], value: number): string {
    switch (type) {
        case "CLS":
            if (value <= 0.1) {
                return "GOOD";
            } else if (value <= 0.25) {
                return "NEEDS IMPROVEMENT";
            } else {
                return "POOR";
            }
        case "FCP":
            if (value <= 1000) {
                return "GOOD";
            } else {
                return "NEEDS IMPROVEMENT";
            }
        case "FID":
            if (value <= 0.1) {
                return "GOOD";
            } else if (value <= 0.3) {
                return "NEEDS IMPROVEMENT";
            } else {
                return "POOR";
            }
        case "LCP":
            if (value <= 2500) {
                return "GOOD";
            } else if (value <= 4000) {
                return "NEEDS IMPROVEMENT";
            } else {
                return "POOR";
            }
        case "TTFB":
            if (value <= 600) {
                return "GOOD";
            } else {
                return "NEEDS IMPROVEMENT";
            }
    }
}
