import React from "react";
import {IdleDetectorContext, IdleDetector, DEFAULT_IDLE_TIMEOUT} from "../../src/util/IdleDetector";
import {render, act, cleanup, fireEvent} from "@testing-library/react";
import {Provider, useSelector} from "react-redux";
import {combineReducers, configureStore, type Store} from "@reduxjs/toolkit";
import {idleReducer, idleTimeoutAction, State} from "../../src/reducer";

describe("IdleDetector Provider Integration Test", () => {
    let store: Store;

    beforeEach(() => {
        vi.useFakeTimers();
        store = configureStore({
            reducer: combineReducers({idle: idleReducer}),
        });
        store.dispatch(idleTimeoutAction(DEFAULT_IDLE_TIMEOUT));
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    const Wrapper = (component: React.ReactNode) => {
        return (
            <Provider store={store}>
                <IdleDetector>{component}</IdleDetector>,
            </Provider>
        );
    };

    test("testing context", async () => {
        function TestComponent() {
            const {state} = React.useContext(IdleDetectorContext);
            return <div data-testid="context-value">{state}</div>;
        }
        await testComponentWithUserEvent(Wrapper(<TestComponent />), "context-value");
    });

    test("testing redux store", async () => {
        const TestComponent = () => {
            const state = useSelector((state: State) => state.idle.state);
            return <div data-testid="store-value">{state}</div>;
        };

        await testComponentWithUserEvent(Wrapper(<TestComponent />), "store-value");
    });
});

const fastForward = () => {
    act(() => {
        vi.runOnlyPendingTimers();
    });
};

async function testComponentWithUserEvent(component: React.ReactElement, testId: string) {
    const {getByTestId} = render(component);

    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    fireEvent.click(window);
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    fireEvent.keyDown(window, {key: "a"});
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    // Simulate tab key press
    fireEvent.keyDown(window, {key: "Tab"});
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");
}
