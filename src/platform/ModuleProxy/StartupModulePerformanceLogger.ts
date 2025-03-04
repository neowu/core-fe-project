import {app} from "../../app";

export class StartupModulePerformanceLogger {
    private static readonly startupTime: number = Date.now();
    private static moduleName: string | undefined;

    static registerIfNotExist(moduleName: string): void {
        if (!StartupModulePerformanceLogger.moduleName) {
            StartupModulePerformanceLogger.moduleName = moduleName;
        }
    }

    static log(currentModuleName: string): void {
        if (currentModuleName === StartupModulePerformanceLogger.moduleName) {
            const actionName = `${currentModuleName}/@@STARTUP_PERF`;
            const stats: {[key: string]: number} = {};

            if (window.performance && typeof performance.getEntriesByType === "function") {
                const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
                if (entry) {
                    // ref: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
                    stats["http_start"] = Math.round(entry.requestStart);
                    stats["http_end"] = Math.round(entry.responseEnd);
                    stats["dom_start"] = Math.round(entry.domInteractive);
                    stats["dom_content"] = Math.round(entry.domContentLoadedEventEnd);
                    stats["dom_end"] = Math.round(entry.loadEventEnd);
                }
            }

            const totalDuration = Date.now() - StartupModulePerformanceLogger.startupTime;
            const slowStartupThreshold = app.loggerConfig?.slowStartupThresholdInSecond || 5;
            if (totalDuration / 1000 >= slowStartupThreshold) {
                app.logger.warn({
                    action: actionName,
                    elapsedTime: totalDuration,
                    stats,
                    errorCode: "SLOW_STARTUP",
                    errorMessage: `Startup took ${(totalDuration / 1000).toFixed(2)} sec, longer than ${slowStartupThreshold}`,
                });
            } else {
                app.logger.info({
                    action: actionName,
                    elapsedTime: totalDuration,
                    stats,
                });
            }
        }
    }
}
