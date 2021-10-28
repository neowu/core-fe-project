import {IdleDetectorContext, IdleDetector} from "../../src/util/IdleDetector";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("IdleDetector testing", () => {
    test("122", () => {
        const mockFn = jest.fn();
        window.addEventListener("click", mockFn);
    });
});
