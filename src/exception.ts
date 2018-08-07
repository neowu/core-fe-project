export abstract class Exception {
    protected constructor(public message: string) {}
}

export class NotFoundException extends Exception {
    constructor() {
        super(`not found, url=${location.href}`);
    }
}

export class RuntimeException extends Exception {
    constructor(message: string, public error: Error | null) {
        super(message);
    }
}
