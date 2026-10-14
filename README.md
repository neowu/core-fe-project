## Overview

core-fe is a frontend framework based on react, redux, react-saga, it's designed to support our own projects.

[![Build Status](https://github.com/neowu/core-fe-project/workflows/build/badge.svg)](https://github.com/neowu/core-fe-project/actions)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/neowu/core-fe-project.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/neowu/core-fe-project/context:javascript)

## Local Dev

This project uses [pnpm](https://pnpm.io/) to manage the dependencies.

- To install the dependencies, run `pnpm install`
- To run the build script, run `pnpm build`
- To publish to npm, run `pnpm publish`, which runs `pnpm build` automatically before publish


## Module

The whole website is split into **modules**, usually by routes.

For each module, it contains **1 state** and **some actions**, to handle business logic.

No matter sync or async, every action is automatically wrapped as saga generator.

To extend module features, modules can also implement its own lifecycle actions: `onEnter`/ `onDestroy` / `onLocationMatched` / `onTick`.

## Other Features

- global error-handler
- event collector
- action decorator
- useful React hooks

## Core API

- boostrap: entrypoint, setting entry component / error handler / log ...
- register: register a module for other modules to use
