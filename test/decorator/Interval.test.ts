import {Interval, type SagaGenerator} from "../../src";

describe("Interval decorator", () => {
    test("should assign tickInterval to onTick method", () => {
        class Person {
            @Interval(10)
            *onTick(): SagaGenerator {}

            // @ts-expect-error
            @Interval(123)
            *anyGeneratorFunction(): SagaGenerator {}

            // @ts-expect-error
            @Interval(123)
            getSomeValue() {}
        }
        // @ts-ignore
        expect(new Person().onTick.tickInterval).toBe(10);
    });

    test("should not able to re-assign tickInterval to onTick method", () => {
        class Person {
            @Interval(10)
            *onTick(): SagaGenerator {}
        }
        expect(() => {
            const person = new Person();
            // @ts-ignore
            person.onTick.tickInterval = 20;
        }).toThrow();
    });
});
