import {Storage} from "util/Storage";

class MockLocalStorage {
    private store: {} = {};

    clear() {
        this.store = {};
    }

    getItem(key: string) {
        return this.store[key] || null;
    }

    setItem(key: string, value: any) {
        this.store[key] = value;
    }

    removeItem(key: string) {
        delete this.store[key];
    }
}

(global as any).localStorage = new MockLocalStorage();

test("get", () => {
    expect(Storage.get("not_existed_key")).toEqual(null);
    expect(Storage.get("not_existed_key", true)).toEqual(true);

    localStorage.setItem("key2", "invalidJSON");
    expect(Storage.get("key2")).toEqual(null);
    expect(Storage.get("key2", "fallback")).toEqual("fallback");
});

test("set", () => {
    const value = {name: "name", value: "value"};
    Storage.set("key1", value);
    expect(Storage.get("key1")).toEqual(value);

    Storage.set("key1", null);
    expect(Storage.get("key1")).toEqual(null);
});
