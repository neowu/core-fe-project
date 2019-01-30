export abstract class Exception {
    protected constructor(public message: string) {}
}

export class APIException extends Exception {
    constructor(message: string, public statusCode: number, public requestURL: string, public responseData: any) {
        super(message);
    }
}

export class NetworkConnectionException extends Exception {
    constructor(requestURL: string) {
        super(`${requestURL} cannot be connected`);
    }
}

export class RuntimeException extends Exception {
    constructor(message: string, public errorObject: any) {
        super(message);
    }
}
