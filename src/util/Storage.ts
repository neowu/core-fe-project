export class Storage {
    static set<T>(key: string, data: T | null) {
        if (data !== null) {
            localStorage.setItem(key, JSON.stringify(data));
        } else {
            localStorage.removeItem(key);
        }
    }

    static get<T>(key: string): T | null {
        try {
            const data = localStorage.getItem(key);
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
