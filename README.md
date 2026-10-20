# FactoryFlow 프론트

자동차 공장 모델 ERP+MES 의 직원용 웹 화면. 백엔드는 [FactoryFlow_BE](https://github.com/DongBrothers/FactoryFlow_BE).

- dev: https://dev.factoryflow.shop (main 에 머지하면 자동 배포)
- 기술: Vite, React 19, TypeScript, React Router 7, CSS Modules, Vitest
- 화면 설계: Figma "FactoryFlow" 파일의 "화면설계 v1" 페이지

## 실행

```bash
npm install
npm run dev
```

http://localhost:5173 을 연다. `/api` 요청은 dev 백엔드(`api.factoryflow.shop`)로 간다.
이 PC 에서 띄운 백엔드에 붙으려면 `API_TARGET=http://localhost:8080 npm run dev`.

## 검사

```bash
npm run lint
npm test
npm run build
```

PR 은 이 세 가지(CI 의 `check`)와 본문의 "## 왜" 작성(`explain`)을 통과해야 머지된다.

## 문서

- [CLAUDE.md](CLAUDE.md): 규칙, 폴더 구조, 작업 순서
- [docs/handoff/start-here.md](docs/handoff/start-here.md): 진행 상황, dev 인프라, 화면 목록
- [docs/infra/frontend-dev.drawio](docs/infra/frontend-dev.drawio): dev 인프라 구성도
