import {setStateAction, setStateReducer} from "action/reducer";

test("setStateReducer", () => {
    expect(setStateReducer({}, setStateAction("main", {field1: "value1"}, "setState"))).toEqual({main: {field1: "value1"}});

    const state = {
        main: {name: "A"},
        user: {a: 1, b: false, c: {c1: "c1", c2: "c2"}, d: {}, e: "test"},
    };

    expect(setStateReducer(state, setStateAction("main", {name: "B"}, "setState"))).toHaveProperty("main.name", "B");
    expect(setStateReducer(state, setStateAction("user", {name: "B"}, "setState"))).toHaveProperty("user.name", "B");
    expect(setStateReducer(state, setStateAction("user", {a: 100}, "setState"))).toHaveProperty("user.a", 100);
    expect(setStateReducer(state, setStateAction("user", {b: true}, "setState"))).toHaveProperty("user.b", true);
    expect(setStateReducer(state, setStateAction("user", {c: {}}, "setState"))).toHaveProperty("user.c", {});
    expect(setStateReducer(state, setStateAction("user", {e: "test2"}, "setState"))).toEqual({...state, user: {...state.user, e: "test2"}});
});
