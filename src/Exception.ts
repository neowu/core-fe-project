export abstract class Exception {
    protected constructor(public message: string) {}
}

export class APIException extends Exception {
    constructor(message: string, public statusCode: number, public requestURL: string, public responseData: any, public errorId: string | null, public errorCode: string | null) {
        super(message);
    }
}

export class NetworkConnectionException extends Exception {
    constructor(message: string, public requestURL: string, public originalErrorMessage: string = "") {
        super(message);
    }
}

export class JavaScriptException extends Exception {
    constructor(message: string, public name: string) {
        super(message);
    }
}
