import {app} from "./app";

declare const window: any;

if (process.env.NODE_ENV === "development") {
    if (window) {
        window.__GET_LOGS__ = () => app.logger.collect();
        window.__PRINT_LOGS__ = () => {
            const logs = app.logger.collect();
            logs.forEach((_, index) => {
                let colorString: string;
                if (_.result === "OK") {
                    colorString = "background:green; color:#fff";
                } else if (_.result === "ERROR") {
                    colorString = "background:red; color:#fff";
                } else {
                    colorString = "background:yellow; color:#888";
                }
                console.info(`%c${index + 1}. ${_.action}${_.elapsedTime > 0 ? ` (${_.elapsedTime} ms)` : ""}`, colorString, _.date.toLocaleString());

                if (_.errorCode) {
                    console.info(`%c ${_.errorCode}: ${_.errorMessage} `, "background:red; color:#fff");
                }
                if (Object.keys(_.info).length > 0) {
                    console.info(`%c INFO `, "background:#ddd; color:#111", _.info);
                }
                if (Object.keys(_.stats).length > 0) {
                    console.info(`%c STATS `, "background:#ddd; color:#111", _.stats);
                }
            });
        };
    }
}
