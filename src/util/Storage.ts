export class Storage {
    static set(moduleName: string, key: string, data: any) {
        localStorage.setItem(`${moduleName}-${key}`, JSON.stringify(data));
    }

    static get<T>(moduleName: string, key: string): T | null {
        try {
            const data = localStorage.getItem(`${moduleName}-${key}`);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            // In case fail to parse
            return null;
        }
    }

    static clear() {
        localStorage.clear();
    }
}
