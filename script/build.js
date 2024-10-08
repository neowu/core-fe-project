/* eslint-env node */

const childProcess = require("child_process");
const fs = require("fs-extra");
const yargs = require("yargs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");

function spawn(command, args, errorMessage) {
    const isWindows = process.platform === "win32"; // spawn with {shell: true} can solve .cmd resolving, but prettier doesn't run correctly on mac/linux
    const result = childProcess.spawnSync(isWindows ? command + ".cmd" : command, args, {stdio: "inherit", cwd: projectRoot});
    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`non-zero exit code returned, code=${result.status}, command=${command} ${args.join(" ")}`);
        console.error(errorMessage);
        process.exit(1);
    }
}

function checkCodeStyle() {
    console.info("check code style ...");
    return spawn("prettier", ["--list-different", "{src,test}/**/*.{ts,tsx}"], "check code style failed, please format above files");
}

function test() {
    console.info("run test ...");
    return spawn("jest", ["--config", "config/jest.config.js"], "test failed, please fix");
}

function lint() {
    console.info("run lint ...");
    return spawn("eslint", ["--no-warn-ignored", "./{src,test}/**"], "lint failed, please fix");
}

function cleanup() {
    console.info("cleanup ...");
    fs.emptyDirSync("lib");
}

function compile() {
    console.info("tsc compile ...");
    return spawn("tsc", ["--composite", "false"], "compile failed, please fix");
}

function build() {
    const isFastMode = yargs.argv.mode === "fast";

    if (!isFastMode) {
        checkCodeStyle();
        test();
        lint();
    }

    cleanup();
    compile();
}

build();
