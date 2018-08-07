import {StorageUtil} from "util/StorageUtil";

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
    expect(StorageUtil.get("not_existed_key")).toEqual(null);

    localStorage.setItem("key2", "invalidJSON");
    expect(StorageUtil.get("key2")).toEqual(null);
});

test("set", () => {
    const value = {name: "name", value: "value"};
    StorageUtil.set("key1", value);
    expect(StorageUtil.get("key1")).toEqual(value);

    StorageUtil.set("key1", null);
    expect(StorageUtil.get("key1")).toEqual(null);
});
