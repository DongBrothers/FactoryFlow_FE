# FactoryFlow 프론트
자동차 공장 모델 ERP+MES 의 직원용 웹. Vite + React 19 + TypeScript, React Router 7, CSS Modules, Vitest.
백엔드는 `C:\dev\FactoryFlow_BE` (GitHub `DongBrothers/FactoryFlow_BE`). 진행 상황과 인프라는 docs/handoff/start-here.md 를 먼저 본다.

## 명령
- 개발 서버: npm run dev (`/api` 는 dev 백엔드 `api.factoryflow.shop` 으로 프록시. 로컬 gateway 는 `API_TARGET=http://localhost:8080 npm run dev`)
- 검사: npm run lint, npm test, npm run build (tsc 타입 검사 포함). CI 와 stop 훅이 같은 세 개를 돌린다

## 기준 (무엇이 정답인가)
- 화면 배치·버튼 동작·오류 문구: Figma "화면설계 v1" 각 화면 아래 설명 패널. 화면 명세 문서는 따로 두지 않는다
- API 경로·요청·응답·오류 코드: 백엔드 main 의 `docs/specs/`, `docs/specs/role-permissions.md` 와 컨트롤러. docs/reference/ 는 옛 사본이라 참고만 한다
- Figma 와 실제 API 가 다르면 추측해서 맞추지 말고 멈추고 묻는다

## lint 가 검사하는 규칙 (.oxlintrc.json)
- `fetch` 는 src/api/ 밖에서 금지 → api() 로 부른다
- localStorage, sessionStorage 금지 → Access 토큰은 메모리에만 (Refresh 는 httpOnly 쿠키)
- features/ 안에서 다른 영역 폴더를 직접 import 금지 (`../다른영역/...`) → 같이 쓰는 것은 shared/ 로
아래에는 lint 로 검사할 수 없는 규칙만 둔다.

## 절대 규칙
- API 는 src/api/client.ts 의 api() 로만 부른다. 실패 응답 message 토스트, 401 재발급은 api() 가 한다. 화면에서 같은 일을 다시 하지 않는다
- 역할 판단(메뉴, 첫 화면, 버튼을 보일지)은 src/app/ 의 표 한 곳에서 한다. 화면 코드에 `role === 'SALES'` 같은 비교를 흩어 쓰지 않는다. 버튼은 숨기기만 하고 막는 것은 gateway 가 한다
- 갱신은 폴링만: 작업지시·설비 5초, 주문·구매·완성차·부족 부품 30초, 취소 결과를 기다리는 주문 상세 5초
- 목록은 "더 보기" 로 이어 붙인다 (백엔드 커서 응답 그대로)
- 새 라이브러리는 이유를 말하고 승인을 받은 뒤 추가한다
- 테스트 삭제, 의미 없는 assert, .skip/.only 금지. 테스트가 틀렸다고 판단되면 이유를 말하고 멈춘다

## 폴더 구조
```
src/
  app/        App(라우트), menu.ts(역할별 메뉴·첫 화면·버튼 권한 표)
  api/        client.ts: api(), 토큰 재발급, ApiError
  auth/       로그인 상태(AuthProvider), 로그인·계정 활성화 화면
  layout/     레이아웃, 사이드바, 토스트
  features/   업무 영역 하나 = 폴더 하나 = 백엔드 /api/<영역>
    orders/ production/ mes/ inventory/ purchases/ admin/
  shared/     두 영역 이상이 쓰는 것. 두 번째로 필요해질 때 만든다
  styles/     전역 CSS (index.css)
```
- 화면은 주 목록을 주는 API 의 영역 폴더에 둔다 (예: 부족 부품은 구매 담당이 쓰지만 `/api/inventory` 라 inventory/)
- 영역 폴더 안: `api.ts`(그 영역의 호출과 응답 타입), 화면 `<이름>.tsx` + `<이름>.module.css`, 테스트 `<이름>.test.ts(x)`. 하위 폴더는 만들지 않는다

## 이름 규칙
- 화면 컴포넌트: 화면 이름 + Page (예: WorkOrderListPage), 모달·드로어: + Modal / Drawer
- 응답 타입은 백엔드 응답 DTO 이름에서 Response 를 뺀 것 (예: WorkOrderResponse → WorkOrder)
- 스타일은 화면 옆 CSS Modules. 전역 CSS 는 styles/index.css 의 변수(--line, --primary)와 기본 태그만

## 테스트
- 로직(재발급, 권한별 버튼, 폴링 간격, 오류 처리)은 Vitest 로 남긴다. 화면 모양은 PR "증거" 에 스크린샷으로

## 사람만 수정 (수정 필요 시 제안만)
CLAUDE.md, .claude/, .github/

## 작업 순서
1. Figma 해당 화면의 설명 패널과 백엔드 API 를 확인한다 (다르면 묻는다)
2. 로직은 테스트 먼저 → 구현
3. npm run lint, npm test, npm run build 통과
4. git push 는 사람이 한다 (Claude 는 커밋까지). PR 의 "## 왜" 섹션은 비워 둔다 (작성자가 직접 씀)
