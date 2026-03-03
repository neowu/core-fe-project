import React from "react";
import {IdleDetectorContext, IdleDetector, DEFAULT_IDLE_TIMEOUT} from "../../src/util/IdleDetector";
import {render, act, cleanup} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Provider, useSelector} from "react-redux";
import {combineReducers, legacy_createStore as createStore, Store} from "redux";
import {idleReducer, idleTimeoutAction, State} from "../../src/reducer";

describe("IdleDetector Provider Integration Test", () => {
    let store: Store;

    beforeEach(() => {
        // ref: https://github.com/testing-library/user-event/issues/1115
        vi.stubGlobal("jest", {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        });
        vi.useFakeTimers();
        store = createStore(
            combineReducers({
                idle: idleReducer,
            })
        );
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
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime.bind(vi)});

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
