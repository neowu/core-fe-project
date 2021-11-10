import React from "react";
import {IdleDetectorContext, IdleDetector, DEFAULT_IDLE_TIMEOUT} from "../../src/util/IdleDetector";
import {render} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Provider, useSelector} from "react-redux";
import {idleReducer, idleTimeoutActions, State} from "../../src/reducer";
import {combineReducers, createStore, Store} from "redux";
import "@testing-library/jest-dom";

describe("IdleDetector Provider Integration Test", () => {
    let store: Store;
    beforeEach(() => {
        jest.useFakeTimers();
        store = createStore(
            combineReducers({
                idle: idleReducer,
            })
        );
        store.dispatch(idleTimeoutActions(DEFAULT_IDLE_TIMEOUT));
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    const Wrapper = (component: React.ReactNode) => {
        return (
            <Provider store={store}>
                <IdleDetector>{component}</IdleDetector>,
            </Provider>
        );
    };

    test("testing context", () => {
        function TestComponent() {
            const idle = React.useContext(IdleDetectorContext);
            return (
                <React.Fragment>
                    <input data-testid="file" type="file" />
                    <div data-testid="context-value">{idle.state}</div>
                </React.Fragment>
            );
        }
        testComponentWithUserEvent(Wrapper(<TestComponent />), "context-value");
    });

    test("testing redux store", () => {
        const TestComponent = () => {
            const state = useSelector((state: State) => state.idle.state);
            return <div data-testid="store-value">{state}</div>;
        };

        testComponentWithUserEvent(Wrapper(<TestComponent />), "store-value");
    });
});

function testComponentWithUserEvent(component: React.ReactElement, testId: string) {
    const {getByTestId} = render(component);

    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    userEvent.click(document.body);
    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    userEvent["keyboard"]("a");
    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    userEvent["dblClick"](document.body);
    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    userEvent.hover(document.body);
    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    userEvent.hover(document.body);
    expect(getByTestId(testId)).toHaveTextContent("active");
    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    jest.runOnlyPendingTimers();
    expect(getByTestId(testId)).toHaveTextContent("idle");
}
