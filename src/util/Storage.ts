export class Storage {
    static set(key: string, data: any) {
        if (data) {
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
