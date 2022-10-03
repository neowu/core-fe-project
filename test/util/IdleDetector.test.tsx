import React from "react";
import {IdleDetectorContext, IdleDetector, DEFAULT_IDLE_TIMEOUT} from "../../src/util/IdleDetector";
import {render, act, screen, cleanup} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Provider, useSelector} from "react-redux";
import {idleReducer, idleTimeoutActions, State} from "../../src/reducer";
import {combineReducers, createStore, Store} from "redux";

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
        cleanup();
        jest.useRealTimers();
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
        jest.runOnlyPendingTimers();
    });
};

async function testComponentWithUserEvent(component: React.ReactElement, testId: string) {
    const {getByTestId} = render(component);
    const user = userEvent.setup({delay: null});

    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    await user.click(document.body);
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    await user.keyboard("a");
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    await user.tab();
    expect(getByTestId(testId)).toHaveTextContent("active");
    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");

    fastForward();
    expect(getByTestId(testId)).toHaveTextContent("idle");
}
