import React from "react";
import {IdleDetectorContext, IdleDetector} from "../../src/util/IdleDetector";
import {render} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

describe("IdleDetector testing", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    function TestComponent() {
        const idleStartingTime = React.useContext(IdleDetectorContext);
        return (
            <React.Fragment>
                <input data-testid="file" type="file" />
                <div data-testid="time">{idleStartingTime ? "idle" : "active"}</div>;
            </React.Fragment>
        );
    }

    test("idleDetector context", () => {
        const {getByTestId} = render(
            <IdleDetector idleTime={3000}>
                <TestComponent />
            </IdleDetector>
        );

        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        userEvent.click(document.body);
        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        userEvent["keyboard"]("a");
        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        userEvent["dblClick"](document.body);
        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        userEvent.hover(document.body);
        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        userEvent.hover(document.body);
        expect(getByTestId("time")).toHaveTextContent("active");
        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");

        jest.runOnlyPendingTimers();
        expect(getByTestId("time")).toHaveTextContent("idle");
    });
});
