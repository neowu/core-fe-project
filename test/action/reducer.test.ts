import {setStateAction, setStateReducer} from "action/setState";

test("setStateReducer", () => {
    expect(setStateReducer({}, setStateAction("main", {name: "A"}))).toEqual({main: {name: "A"}});

    const prevState = {
        main: {name: "A"},
        user: {a: 1, b: false, c: {c1: "c1", c2: "c2"}, d: {}, e: "test"},
    };

    expect(setStateReducer(prevState, setStateAction("main", {name: "B"}))).toHaveProperty("main.name", "B");
    expect(setStateReducer(prevState, setStateAction("user", {name: "B"}))).toHaveProperty("user.name", "B");
    expect(setStateReducer(prevState, setStateAction("user", {a: 100}))).toHaveProperty("user.a", 100);
    expect(setStateReducer(prevState, setStateAction("user", {b: true}))).toHaveProperty("user.b", true);
    expect(setStateReducer(prevState, setStateAction("user", {c: {}}))).toHaveProperty("user.c", {});
    expect(setStateReducer(prevState, setStateAction("user", {e: "test"}))).toHaveProperty("user.e", "test");
});
