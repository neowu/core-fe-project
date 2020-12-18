import {ActionHandler} from "../module";
import {Module} from "../platform/Module";
import {SagaGenerator} from "../typed-saga";
import {State} from "../reducer";
import {app} from "../app";
import {stringifyWithMask} from "../util/json-util";

export {Interval} from "./Interval";
export {Lifecycle} from "./Lifecycle";
export {Loading} from "./Loading";
export {Log} from "./Log";
export {Mutex} from "./Mutex";
export {RetryOnNetworkConnectionError} from "./RetryOnNetworkConnectionError";
export {SilentOnNetworkConnectionError} from "./SilentOnNetworkConnectionError";

/**
 * Decorator type declaration, required by TypeScript.
 */
type HandlerDecorator = (target: object, propertyKey: string, descriptor: TypedPropertyDescriptor<ActionHandler>) => TypedPropertyDescriptor<ActionHandler>;

type ActionHandlerWithMetaData = ActionHandler & {actionName: string; maskedParams: string};

type HandlerInterceptor<RootState extends State = State> = (handler: ActionHandlerWithMetaData, thisModule: Module<RootState, any>) => SagaGenerator;

/**
 * A helper for ActionHandler functions (Saga).
 */
export function createActionHandlerDecorator<RootState extends State = State>(interceptor: HandlerInterceptor<RootState>): HandlerDecorator {
    return (target, propertyKey, descriptor) => {
        const fn = descriptor.value!;
        descriptor.value = function* (...args: any[]): SagaGenerator {
            const boundFn: ActionHandlerWithMetaData = fn.bind(this, ...args) as any;
            // Do not use fn.actionName, it returns undefined
            // The reason is, fn is created before module register(), and the actionName had not been attached then
            boundFn.actionName = (descriptor.value as any).actionName;
            boundFn.maskedParams = stringifyWithMask(app.loggerConfig?.maskedKeywords || [], "***", ...args) || "[No Parameter]";
            yield* interceptor(boundFn, this as any);
        };
        return descriptor;
    };
}
