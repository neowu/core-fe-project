export abstract class Exception {
    protected constructor(public message: string) {}
}

export class APIException extends Exception {
    constructor(message: string, public statusCode: number, public requestURL: string, public responseData: any, public errorId: string | null, public errorCode: string | null) {
        super(message);
    }
}

export class NetworkConnectionException extends Exception {
    /**
     * CAVEAT:
     * Do not store (or serialize) original NetworkError object here.
     * Because the error object can include the whole request, which is extremely large in some case.
     */
    constructor(message: string, public requestURL: string, public originalErrorMessage: string = "") {
        super(message);
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
