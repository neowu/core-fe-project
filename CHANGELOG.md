# Change Log

## 1.39.0 (2025-03)

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
