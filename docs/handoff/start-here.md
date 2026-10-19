# FactoryFlow 프론트 시작 인계 (새 세션은 이 파일부터)

> 2026-10-19 작성. 백엔드 저장소(`C:\dev\FactoryFlow_BE`, main `38ba1e7`)에서 화면설계를 끝내고 넘긴다.
> 이 저장소(`C:\dev\FactoryFlow_FE`, GitHub `DongBrothers/FactoryFlow_FE`)는 README 하나뿐인 빈 저장소다.

## 진행 상황 (2026-10-19, 브랜치 `chore/scaffold`)

순서를 바꿨다: 빈 앱 → 인프라 → CI/CD → 기능 코드 (사용자 결정)

- 빈 Vite 앱(React + TS, 린트는 oxlint): 화면은 "FactoryFlow" 제목 하나. `vite.config.ts` 에 `/api` → `localhost:8080` 프록시
- dev 인프라 완료 (콘솔 클릭으로 만듦), `https://dev.factoryflow.shop` 에서 화면과 `/api` 확인함
  - 도메인 `factoryflow.shop` 은 **가비아** DNS (Route 53 에 없음). `api` = ALB(`ff-alb-1206570237…elb.amazonaws.com`) CNAME, `dev` = CloudFront CNAME
  - ACM 인증서 `factoryflow.shop`, `*.factoryflow.shop`: 서울(ALB 용), 버지니아 북부(CloudFront 용) 둘 다 있음
  - S3 버킷 `factoryflow-fe-dev` (서울, 퍼블릭 차단, OAC)
  - CloudFront `d91qb0hcq0p32.cloudfront.net` (flat-rate 무료 플랜). 동작 2개: 기본(*) → S3, `/api/*` → `api.factoryflow.shop` HTTPS (CachingDisabled + AllViewerExceptHostHeader)
  - SPA 새로고침: 아래 6장의 "403·404 → /index.html" 대신 CloudFront Function `spa-index`(기본 동작 뷰어 요청, 점 없는 경로 → `/index.html`). 오류 페이지 방식은 백엔드의 403·404 까지 바꿔 버려서 쓰지 않는다
- 남은 것: CI/CD (IAM 역할 `ff-fe-deploy`, GitHub 시크릿·변수), 그다음 1번 기능 코드

## 해야 할 일 (순서)

1. **프론트 뼈대**: Vite + React + TypeScript. 로그인, 공통 레이아웃(역할별 메뉴), 토큰 재발급, 오류 토스트까지만
2. **배포 환경(인프라)**: CloudFront + S3 로 dev 에 뼈대를 먼저 올려 본다 (쿠키·주소 문제를 일찍 찾으려고)
3. **CI/CD**: 이 저장소의 GitHub Actions 로 PR 검사, main 머지 시 S3 업로드 + CloudFront 무효화
4. **나머지 화면**: Figma "화면설계 v1" 의 흐름 순서대로 (아래 "화면 목록")

백엔드 빈틈(고객 API 등)은 백엔드 저장소에서 따로 진행한다 (아래 "백엔드에 없는 API").

## 시작 전에 사용자에게 물어볼 것 (아직 답을 못 받음)

1. **dev 백엔드 주소**: Postman 으로 dev 를 부를 때 쓰는 주소. AWS 콘솔 EC2 → "로드 밸런서" 에 ALB 가 있으면 그 DNS 이름, 없으면 ECS 태스크 공인 IP 일 것. CloudFront 의 `/api/*` 를 넘길 곳이다
2. **도메인**: 가진 도메인(Route 53 등)을 쓸지, CloudFront 기본 주소(`xxxx.cloudfront.net`)로 시작할지
3. **인프라를 만드는 방식**: 콘솔 클릭(추천, 백엔드도 콘솔로 만든 것으로 보임) / Terraform 등 코드
4. **프론트 기술 선택 확인**: 아래 "기술 제안" 을 그대로 갈지

## 사용자에 대해 (작업 방식)

- 한국어로, 쉽게 설명한다. 어려운 말이 나오면 "쉽게 설명해 줘" 라고 한다
- 사용자가 직접 할 일(AWS 콘솔, GitHub 시크릿, 백엔드 local yml·`APP_DEV_YML_*` 시크릿, 노션)은 필요한 단계마다 그때그때 구체적으로 알려 준다 (메뉴 경로, 넣을 값)
- 새 작업은 worktree 말고 이 폴더에서 브랜치만 바꾼다. 커밋·푸시·PR 은 요청받았을 때만
- 테스트를 지우거나 통째로 바꿀 때는 이유를 먼저 말하고 승인을 받는다
- 가장 단순하게 동작하는 방법을 고른다 (불필요한 라이브러리·추상화 금지)

---

## 1. 프로젝트 한눈에

자동차 공장 ERP+MES. 직원만 로그인한다 (고객은 로그인하지 않음).

> 영업이 주문을 넣으면 → 차 한 대마다 부품을 잡아 두고 → 모자라면 구매 담당이 사 오고 → 부품이 모이면 라인에서 공정 5개(프레스·차체·도장은 로봇, 의장·검사는 사람)로 만들고 → 검사 양품이면 VIN 이 붙어 완성차 창고로 → 출고

백엔드의 모든 동작·API·오류 코드: [docs/reference/backend-flow-implemented.md](../reference/backend-flow-implemented.md)
(사용자가 준 문서 사본, main `f10fdd7` 기준. 그 뒤 #124 로 바뀐 것: 구매 응답에서 `source` 필드가 빠졌다. 9장 API 목록, 10장 오류 코드, 2.4 권한 표를 주로 본다)

## 2. Figma (화면설계 v1)

- 파일: https://www.figma.com/design/8WrU20eUhninwpsuAQ2IYr/FactoryFlow — 페이지 **"화면설계 v1"** (v0 페이지는 사용자가 지울 예정, 보지 않는다)
- Figma MCP(`use_figma`, `get_screenshot`, `get_metadata`) 로 읽는다. 쓰기 전에 `figma-use` 스킬, 화면을 코드로 옮길 때는 `figma-design-to-code` 스킬을 먼저 불러온다
- 페이지 구성 (위에서 아래로)
  - `_컴포넌트 v1`: Button/Primary·Secondary·Danger·Disabled, Badge, Input, Select, Marker(빨간 번호, 설계 표시용이라 코드에 만들지 않음), Sidebar/업무, Sidebar/ADMIN
  - `00 시작하기`: 흐름 지도, 보는 법, 공통 규칙, 역할별 사이드바
  - `흐름 A` ~ `흐름 G`: 화면(1440×900) → 화살표(누르는 것 / 부르는 API) → 화면. 각 화면 아래 노란 **설명 패널**에 번호별 동작, API(`[있음]`/`[필요]`), 화면별 오류 문구가 있다. 회색 점선 카드는 다른 흐름에 원본이 있는 화면, 빨간 점선은 앞 화면과 달라진 곳
- 와이어프레임(로우파이)이다. 색·글꼴(Noto Sans KR)·간격은 정해진 디자인 시스템이 아니라 배치 합의용

## 3. 공통 규칙 (모든 화면)

| 항목 | 규칙 |
|---|---|
| 역할 | SALES, PURCHASE, PRODUCTION, ADMIN (1인 1역할). JWT 의 `role` 클레임 |
| 메뉴 | 업무 역할 3개는 같은 메뉴(조회는 모두 가능). ADMIN 은 "계정 발급" 하나만 (업무 API 는 403) |
| 쓰기 버튼 | 주문 등록·주문 취소 = SALES / 공정 시작·종료, 완성차 출고 = PRODUCTION / 발주·입고 = PURCHASE / 계정 발급 = ADMIN. 다른 역할에게는 버튼을 숨긴다 (막는 건 gateway 가 한다) |
| 로그인 뒤 첫 화면 | SALES → 주문 목록 / PRODUCTION → 작업지시 / PURCHASE → 부족 부품 / ADMIN → 계정 발급 |
| 토큰 | 로그인 응답 본문에 Access(JWT, 15분). Refresh 는 httpOnly 쿠키(14일, `Path=/api/auth`, `Secure`, `SameSite=Lax`) — JS 로 못 읽는다. Access 는 메모리에 두고 `Authorization: Bearer` 로 보낸다 |
| 401 처리 | `POST /api/auth/token/refresh` (본문 없음, 쿠키로) → 새 Access 로 원래 요청 다시. 재발급도 401 이면 로그인 화면. 새로고침하면 메모리의 Access 가 사라지므로 앱 시작 때 한 번 재발급을 시도한다 |
| 응답 모양 | 성공 `{ "data": …, "status": 200, "message": "…" }` / 실패 `{ "code": "…", "message": "…" }` → message 를 토스트로 |
| 목록 | "더 보기" 로 이어 붙인다. 작업지시·구매는 `CursorPage { items, count, last, nextCursor }` (lastId), 주문은 `{ items, count, last, nextOrderNo }`, 완성차는 `{ items, count, last, nextVin }` |
| 갱신 | 폴링 (SSE 없음). 작업지시·설비 5초, 주문·구매·완성차·부족 부품 30초, 취소 결과를 기다리는 주문 상세 5초 |
| 이름 바꾸기 | 작업지시·완성차 목록은 `productId` 만 준다 → `GET /api/production/products` 로 id → 이름. 구매의 공급업체는 `GET /api/purchases/suppliers` 로 id → 이름 |

## 4. 화면 목록 (Figma 흐름 기준)

`[있음]` = main 에 API 있음, `[필요]` = 백엔드에 새로 만들어야 함

| 흐름 | 화면 | 쓰는 API |
|---|---|---|
| 공통 | 01 로그인 | `POST /api/auth/login` [있음] |
| G | 02 계정 활성화 (`/activate?token=`), 02-e 링크 만료 | `POST /api/auth/activation` [있음] |
| 공통 | 03 레이아웃 (사이드바 2종, 상단 "이름 · 역할") | `GET /api/auth/me` [필요], `POST /api/auth/logout` [있음] |
| G | 04 계정 발급 (ADMIN) | `POST /api/auth/admin/users` [있음] |
| A | 05 주문 목록 | `GET /api/orders` [있음], 고객 이름 [필요] |
| A | 06 주문 등록 (고객 검색 선택, 제품·수량 여러 줄) | `POST /api/orders` [있음], `GET /api/production/products` [있음], 고객 검색 `GET /api/orders/customers?q=` [필요] |
| A | 07 주문 상세 (+07-1 취소 모달, 취소 결과) | `GET /api/orders/{orderNo}` [있음], `POST /api/orders/{orderNo}/cancel` [있음] |
| B | 08 작업지시 목록 | `GET /api/production/work-orders` [있음] |
| B·C | 09 작업지시 상세 (대기 / 진행 중 / 완료·VIN / 로봇 공정 설비 작업 중) | `GET …/work-orders/{id}`, `POST …/steps/{process}/start`, `…/complete` [있음], 실적 작업자 이름 [필요] |
| C | 10 설비 현황 (+10-1 상태 이력 드로어) | `GET /api/production/equipments?process=` [있음] — 공정 5개 각각 불러 합친다 (결정됨), 이력 [필요] |
| E | 11 완성차 목록·출고 (+11-1 출고 모달), 12 쓰인 부품 LOT 드로어 | `GET /api/inventory/finished-vehicles` [있음], `POST …/{vin}/ship` [있음], `GET …/{vin}/part-lots` [있음] |
| F | 13 부품 재고 (+13-1 LOT 별 재고 드로어) | `GET /api/inventory/parts` [있음], `GET …/parts/{id}/lots` [있음] |
| D | 14 부족 부품 (+14-1 발주 모달) | `GET /api/inventory/parts/shortages` [있음], `POST /api/purchases` [있음], `GET /api/purchases/suppliers` [있음] |
| D | 15 구매 목록 (발주 중 / 입고 완료, +15-1 입고 모달) | `GET /api/purchases?status=` [있음], `POST /api/purchases/{id}/receive` [있음], 발주자 이름 [필요] |
| F | 16 LOT 추적 | `GET /api/inventory/part-lots/{lotNo}/vehicles` [있음] |

화면별 버튼 동작·오류 문구는 Figma 설명 패널이 정답이다.

## 5. 백엔드에 없는 API

정리: `C:\dev\FactoryFlow_BE\docs\handoff\frontend-api-gaps.md` (아직 커밋 안 됨). 백엔드 세션에서 따로 만든다.

| 작업 | 막히는 화면 | 없을 때 임시 처리 |
|---|---|---|
| 고객을 order 에 만들기 (검색 API, 주문 때 존재 확인, 고객 이름) | 06 주문 등록의 고객 선택, 05·07 고객 이름 | 고객 번호 직접 입력, 이름 대신 "고객 7" |
| 내 정보 `GET /api/auth/me` | 상단 사용자 이름 | JWT 의 role 만 표시 |
| 직원 이름 조회 | 실적의 작업자, 구매의 발주자 | public_id 앞 8자리 |
| 설비 상태 이력 | 10-1 드로어 | 드로어 숨김 |

## 6. 배포 환경 (제안, 위 질문 답을 받고 확정)

```
브라우저 ──▶ CloudFront (도메인 하나)
              ├─ /api/*  ──▶ dev gateway (ECS)   캐시 끔, 모든 메서드, 헤더·쿠키·쿼리 그대로
              └─ 그 밖   ──▶ S3 (빌드 결과, OAC 로 비공개)   403·404 → /index.html (SPA)
```

- **같은 도메인이어야 하는 이유**: Refresh 쿠키가 `SameSite=Lax` 라서, 프론트와 API 가 다른 사이트면 재발급 요청에 쿠키가 실리지 않는다. 같은 도메인이면 CORS 도 필요 없다 (gateway `CORS_ALLOWED_ORIGINS` 는 비워 둔 채)
- 쿠키가 `Secure` 라 HTTPS 여야 한다 (CloudFront 는 기본 HTTPS)
- gateway 가 HTTP 만 받으면 CloudFront → origin 은 HTTP 로 둔다 (원본 프로토콜 정책 확인)
- **로컬 개발**: Vite `server.proxy` 로 `/api` → 로컬 gateway (`http://localhost:8080` 로 보이나, 백엔드 local yml 에서 포트를 확인). 로컬 auth 는 `auth.cookie.secure=false` (local yml)
- 사용자가 직접 할 일 (그때 단계별로 안내)
  - AWS: S3 버킷, CloudFront 배포(두 origin, behavior, 오류 페이지), GitHub OIDC 로 맡을 IAM 역할(S3 쓰기, CloudFront 무효화)
  - GitHub (FE 저장소): 시크릿 `AWS_DEPLOY_ROLE_ARN`, 변수 `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID` (백엔드 `cd.yml` 과 같은 방식)
  - 백엔드: 활성화 메일 링크 `auth.activation-mail.link-base-url` 을 dev 에서 `https://{CloudFront 주소}/activate` 로 (`APP_DEV_YML_AUTH` 시크릿, 노션). 지금 기본값은 `http://localhost:5173/activate`

## 7. CI/CD (제안)

- `.github/workflows/ci.yml` — PR: `npm ci` → 린트 → 타입 검사(`tsc --noEmit`) → 테스트 → 빌드
- `.github/workflows/cd.yml` — main push: 위 단계 + `aws s3 sync dist/ s3://… --delete` + CloudFront 무효화(`/*`). `aws-actions/configure-aws-credentials` 의 `role-to-assume`
- 참고: 백엔드 `C:\dev\FactoryFlow_BE\.github\workflows\cd.yml` (OIDC, `vars.AWS_REGION`)

## 8. 기술 제안 (사용자 확인 후 확정)

- Vite + React + TypeScript, React Router
- 서버 상태·폴링: TanStack Query (`refetchInterval`). 상태 관리 라이브러리는 따로 두지 않는다
- HTTP: `fetch` 래퍼 하나 (Access 붙이기, 401 → 재발급 한 번 → 재시도, `{code,message}` 오류 변환, `credentials: 'include'`)
- 테스트: Vitest + Testing Library (토큰 재발급·권한별 버튼 노출 같은 로직 위주)
- 스타일: 정해진 디자인 시스템이 없다. 사용자에게 고르게 한다 (CSS Modules / Tailwind 등)

## 9. 화면 만드는 순서 (추천)

1. 로그인 → 공통 레이아웃(역할별 메뉴, 로그아웃, 401 재발급, 토스트) → 계정 활성화 → **여기서 dev 배포(6·7)**
2. 이미 API 가 다 있는 화면: 08·09 작업지시 → 11·12 완성차 → 13·16 재고·LOT → 14·15 부족 부품·구매 → 10 설비 현황
3. 주문: 05·07 (고객 이름 임시 처리) → 06 주문 등록 (고객 API 가 생기면)
4. 04 계정 발급
