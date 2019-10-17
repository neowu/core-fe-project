import {app} from "./app";

declare const window: any;

if (process.env.NODE_ENV === "development") {
    if (window) {
        window.__PRINT_LOGS__ = () => {
            const logs = app.logger.collect();
            console.info("#### [" + new Date().toLocaleString() + "] Logs, Total " + logs.length);
            logs.forEach((_, index) => {
                let colorString: string;
                if (_.result === "OK") {
                    colorString = "background:green; color:#fff";
                } else {
                    colorString = "background:red; color:#fff";
                }
                console.info(`%c (${index + 1}) ${_.result} `, colorString, _.date.toLocaleString());
                if (_.errorCode) {
                    console.info(`%c ${_.errorCode} `, "background:red; color:#fff", _.errorMessage || "<No Message>");
                }
                if (_.action) {
                    console.info(`%c ACTION `, "background:#ddd; color:#111", _.action);
                }
                if (_.elapsedTime > 0) {
                    console.info(`%c DURATION `, "background:yellow; color:#111", _.elapsedTime);
                }
                if (Object.keys(_.info).length > 0) {
                    console.info(`%c INFO `, "background:#ddd; color:#111", _.info);
                }
            });
        };
    }
}
