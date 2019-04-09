export abstract class Exception {
    protected constructor(public message: string) {}
}

export class APIException extends Exception {
    constructor(message: string, public statusCode: number, public requestURL: string, public responseData: any, public errorId: string | null, public errorCode: string | null) {
        super(message);
    }
}

export class NetworkConnectionException extends Exception {
    constructor(requestURL: string) {
        super(`failed to connect to ${requestURL}`);
    }
}

export class RuntimeException extends Exception {
    constructor(message: string, public errorObject: any) {
        super(message);
    }
}

export class ReactLifecycleException extends Exception {
    constructor(public message: string, public componentStack: string) {
        super(message);
    }
}
