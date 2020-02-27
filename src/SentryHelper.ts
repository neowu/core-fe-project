import * as Sentry from "@sentry/browser";
import {Severity} from "@sentry/browser";
import {originalErrorToException, runUserErrorHandler, shouldAlertToUser} from "./util/error-util";
import {Exception} from "./Exception";
import {app} from "./app";
import {ErrorHandler} from "./module";

export interface SentryBootstrapOption {
    dsn: string;
    buildIdentifier: string;
    extraInfo: {[key: string]: any};
}

export class SentryHelper {
    static captureError(error: any, actionName: string, extra: {[key: string]: any}): void {
        Sentry.withScope(scope => {
            scope.setExtras(extra);
            scope.setExtra("triggeredAction", actionName);
            Sentry.captureException(error);
        });
    }

    static initialize(errorHandler: ErrorHandler, option?: SentryBootstrapOption): void {
        Sentry.init({
            dsn: option ? option.dsn : "https://3145c14e86974ceebe113563647da398@sentry.io/0000000",
            release: option ? option.buildIdentifier : undefined,
            maxBreadcrumbs: 50,
            beforeSend: (event, eventHint) => {
                const originalError: any = eventHint?.originalException;
                const actionName = event.extra?.["triggeredBy"];
                const exception = originalErrorToException(originalError);

                if (process.env.NODE_ENV === "development") {
                    console.error("Framework Caught: " + originalError);
                }

                if (shouldAlertToUser(exception.message)) {
                    app.sagaMiddleware.run(runUserErrorHandler, errorHandler, exception);
                    app.logger.exception(exception, actionName, {sentryEventId: event.event_id || "-"});
                } else {
                    event.level = Severity.Warning;
                }

                if (option) {
                    if (originalError instanceof Exception) {
                        return null;
                    } else {
                        if (event.extra) {
                            Object.assign(event.extra, option.extraInfo, {appState: app.store.getState().app});
                        }
                        return event;
                    }
                } else {
                    return null;
                }
            },
        });
    }
}
