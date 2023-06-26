import {app} from "../app";
import {stringifyWithMask} from "../util/json-util";
import type {State} from "../reducer";
import type {SagaGenerator} from "../typed-saga";
import type {ActionHandler} from "../module";
import type {Module} from "../platform/Module";

type ActionHandlerWithMetaData = ActionHandler & {actionName: string; maskedParams: string};

type HandlerInterceptor<RootState extends State = State> = (handler: ActionHandlerWithMetaData, thisModule: Module<RootState, any>) => SagaGenerator;

/**
 * A helper for ActionHandler functions (Saga).
 */
export function createActionHandlerDecorator<This, Fn extends (this: This, ...args: any[]) => SagaGenerator>(interceptor: HandlerInterceptor) {
    return (fn: Fn, _: ClassMethodDecoratorContext<This, Fn>) => {
        const replacement = function* (this: This, ...args: any[]): SagaGenerator {
            const boundFn: ActionHandlerWithMetaData = fn.bind(this, ...args) as any;
            boundFn.actionName = (fn as any).actionName;
            boundFn.maskedParams = stringifyWithMask(app.loggerConfig?.maskedKeywords || [], "***", ...args) || "[No Parameter]";
            yield* interceptor(boundFn, this as any);
        };
        return replacement;
    };
}
