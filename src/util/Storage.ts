export class Storage {
    static set<T>(key: string, data: T | null) {
        if (data !== null) {
            localStorage.setItem(key, JSON.stringify(data));
        } else {
            localStorage.removeItem(key);
        }
    }

    static get<T>(key: string, defaultValue: T | null = null): T | null {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue; // In case fail to parse
        }
    }

    static clear() {
        localStorage.clear();
    }
}
