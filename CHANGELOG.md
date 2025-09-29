# Change Log

## 1.40.5 (2025-09-29)

- ignore Google Recaptcha related errors
- upgrade `eslint` related to latest
- upgrade `@types/react` to 19.1.15
- upgrade `pnpm` to 10.17.1

## 1.40.4 (2025-09-15)

- upgrade `axios` to 1.12 due to security issue: https://github.com/advisories/GHSA-4hjh-wcwx-xvwj
- upgrade `React` to 19.1.1
- upgrade `immer` to 10.1.3
- upgrade `TypeScript` to 5.9.2
- upgrade `pnpm` to 10.16.1

## 1.40.3 (2025-07-24)

- upgrade `axios` 1.11 due to security issue: https://github.com/axios/axios/issues/6969

## 1.40.2 (2025-07-23)

- add `useDefaultObjectAction` and optimize `useObjectKeyAction` hooks
- upgrade dev deps

## 1.40.1 (2025-07-15)

- add error log throttling
  - in case of too many same errors/warnings (check by `action + errorCode + errorMessage`) in a short time, only log the first one
- upgrade `eslint` and `prettier`
- upgrade `pnpm` to 10.13.1

## 1.40.0 (2025-06-18)

- add `@debugger` pattern for ignoreable global errors
- upgrade `react` to 19.1
- upgrade `event-source` to 4.0
- upgrade `core-js` to 3.43
- upgrade `eslint`, `jest` with minor config updates
- update node min version requirement to 22

## 1.39.6 (2025-03-18)

- upgrade `react-redux` to 9.2.0 (for better React 19 support)
- upgrade `axios` to 1.8.3

## 1.39.5 (2025-03-10)

- upgrade `eslint` to 9.22
- upgrade `axios` to 1.8.2 (1.8.1 has a bug)
- upgrade `pnpm` to 10.6.2

## 1.39.4 (2025-03-07)

- log SSE onConnect error

## 1.39.3 (2025-03-06)

- put SSE `trace-id` to logger context, instead of info
- change `SSE.onError` callback argument to `NetworkConnectionException | APIException`, which lets the caller decide how to handle the error
- optimize internal `logger.exception` usage
- optimize `__PRINT_LOGS__` debug output, with complete context

## 1.39.0 (2025-03-01)

- update `performance` API usage, stop using deprecated `performance.timing`
- add `sse` function to simplify Server-Side EventSource call
- ignore `@FormMetadata.js` / `image.ur.cn` external JS error
- upgrade `react` to 19.0
- upgrade `axios` to 1.8
- remove `/script` folder, inline check/build scripts inside `package.json` to make it clear
    - use `pnpm build:fast` to replace previous `pnpm build --mode fast`
    - remove unused `yargs`, `fs-extra` dev deps
- other deps minor/patch updates
- add `CHANGELOG.md`

## 1.38.0 (2024-08)

- upgrade `redux` to 5.0, `react-redux` to 9.1, tune inner usages to avoid breaking outer usages
- upgrade `redux-saga` to 1.3
- upgrade `axios` to 1.7
- update module `attachLifecycle`, allow passing module actions to component props (https://github.com/neowu/core-fe-project/pull/34)
- upgrade eslint to v9 (https://github.com/neowu/core-fe-project/pull/35)

## 1.37.x (2024-01)

- use new `redux-first-history` to replace deprecated `connected-react-router`
- upgrade `react` to 18.3
- upgrade `immer` to 10.1
- upgrade `axios` to 1.6
- treat `live-chat` (https://www.livechat.com/) JS plugin error as warning
- upgrade dev deps


```
previous version histories too old to fill

always use the latest :)
```
