import * as path from "path";
import {Config} from "jest";

const config: Config = {
    rootDir: "..",
    roots: ["<rootDir>/test"],
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: path.join(__dirname, "./tsconfig.test.json"),
            },
        ],
    },
    testRegex: ["\\.test\\.tsx?$"],
    moduleFileExtensions: ["ts", "tsx", "js"],
    moduleDirectories: ["node_modules", "src"],
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
    testEnvironmentOptions: {
        url: "http://127.0.0.1",
    },
};

export default config;
