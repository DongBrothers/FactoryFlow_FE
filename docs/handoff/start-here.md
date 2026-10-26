# FactoryFlow 프론트 인계 (새 세션은 이 파일부터)

> 2026-10-26 갱신. 백엔드 main `eb38fd5` (#219 설비 상태 이력까지) 기준. Figma v1 은 `9793597` 기준이라 그 뒤 바뀐 것은 아래 "Figma 와 다른 곳" 을 따른다.
> 규칙과 폴더 구조는 루트 CLAUDE.md. 이 파일은 진행 상황, 인프라, 화면 목록을 적는다.

## 진행 상황

| 단계 | 상태 |
|---|---|
| 1. 뼈대: 로그인, 역할별 레이아웃, 토큰 재발급, 오류 토스트 (PR #3), 계정 활성화, 04 계정 발급 | 완료 |
| 2. dev 인프라 (CloudFront + S3, `https://dev.factoryflow.shop`) | 완료 |
| 3. CI/CD (PR #2) | 완료. AI 리뷰는 화면 코드가 쌓인 뒤 프론트용 기준(security·quality)으로 |
| 4. 폴더 구조, CLAUDE.md, lint 규칙, 훅 (chore/structure) | 완료 |
| 5. Figma 고치기 | 완료 (백엔드 `9793597` 기준). 공정 불량 = 폐기(#184)는 아직 반영 안 됨 (토큰이 남으면 고친다) |
| 5-1. 권한별 메뉴(`/api/auth/me`), 상단 이름 (feat/me-menu) | 이번 PR |
| 6. 업무 화면 | 그다음 (9장 순서) |

## 사용자에 대해 (작업 방식)

- 한국어로, 쉽게 설명한다. 어려운 말이 나오면 "쉽게 설명해 줘" 라고 한다
- 사용자가 직접 할 일(AWS 콘솔, GitHub 설정, 백엔드 `APP_DEV_YML_*` 시크릿·노션, git push)은 필요한 단계마다 메뉴 경로와 넣을 값까지 알려 준다
- 새 작업은 worktree 말고 이 폴더에서 브랜치만 바꾼다
- 가장 단순하게 동작하는 방법을 고른다 (불필요한 라이브러리·추상화 금지)
- dev 백엔드는 비용 때문에 꺼 둘 수 있다. 502·503·504 면 장애로 단정하지 말고 먼저 묻는다

---

## 1. 프로젝트 한눈에

자동차 공장 ERP+MES. 직원만 로그인한다 (고객은 로그인하지 않음).

> 영업이 주문·고객을 넣으면 → 차 한 대마다 생산 건과 부품 예약 → 모자라면 구매 담당이 발주·입고 → 부품이 다 모이면 **발행 대기** → 생산 담당이 작업지시 발행 → 현장(mes)에서 공정 5개(프레스·차체·도장은 로봇, 의장·검사는 사람) → 검사 양품이면 VIN → 완성차 창고의 자리(A·B 구역 40자리)에 자동 배정 → 출고

백엔드 서비스: gateway, auth, order, production(계획: 생산 건, 제품·BOM), **mes**(실행: 작업지시, 공정, 설비, 센서값, 부품 계보, #135), inventory, purchase, simulator(설비 흉내, 내부)
API 의 정답은 백엔드 main 의 `docs/specs/`, `docs/specs/role-permissions.md` 와 컨트롤러 (예전 사본 docs/reference/backend-flow-implemented.md 는 낡아서 지움, git 기록에 남아 있다)

## 2. dev 인프라 (콘솔로 만듦)

```
브라우저 ─▶ CloudFront  dev.factoryflow.shop (flat-rate 무료 플랜, d91qb0hcq0p32.cloudfront.net)
             ├─ /api/*  ─▶ api.factoryflow.shop (ALB → ECS gateway)  CachingDisabled + AllViewerExceptHostHeader, HTTPS
             └─ 그 밖   ─▶ S3 factoryflow-fe-dev (서울, 퍼블릭 차단, OAC)
                          CloudFront Function spa-index: 점 없는 경로 → /index.html (새로고침 대응)
```
- 같은 도메인인 이유: Refresh 쿠키가 `SameSite=Lax`, `Path=/api/auth`, `Secure` 라 프론트와 API 가 같은 사이트·HTTPS 여야 재발급에 쿠키가 실린다
- SPA 는 오류 페이지(403·404 → index.html) 대신 함수로 한다. 오류 페이지 방식은 백엔드의 403·404 응답까지 바꿔 버린다
- 도메인 `factoryflow.shop` 은 **가비아** DNS (Route 53 에 없음). `api` = ALB CNAME, `dev` = CloudFront CNAME
- ACM `factoryflow.shop`, `*.factoryflow.shop`: 서울(ALB 용), 버지니아 북부(CloudFront 용)
- **gateway CORS**: CloudFront 가 브라우저 Origin 을 넘기므로 백엔드 dev 설정 `APP_DEV_YML_GATEWAY`(노션)의 맨 아래 `app.cors.allowed-origins: https://dev.factoryflow.shop` 이 있어야 한다. 없으면 로그인이 403. 2026-10-20 에 시크릿을 노션 옛 내용으로 덮어써서 한 번 사라졌다
- **활성화 메일 링크**: 백엔드 `auth.activation-mail.link-base-url` 기본값이 `http://localhost:5173/activate`. dev 는 `APP_DEV_YML_AUTH`(노션)에서 `https://dev.factoryflow.shop/activate` 로 바꿔야 한다 (활성화 화면 만들 때)

## 3. CI/CD

- `ci.yml`(PR → main): `check` = npm ci → lint → test → build. `pr-body.yml`: `explain` = "## 왜" 직접 작성 + 체크박스
- `cd.yml`(main push, 수동 실행): build → `aws s3 sync` (index.html 은 no-cache) → CloudFront 무효화 `/*`
- IAM 역할 `ff-github-fe-deploy` (백엔드는 `ff-github-deploy`). 권한: 이 버킷 쓰기·지우기, 이 배포 무효화만
- **주의**: 이 저장소는 GitHub OIDC immutable subject 라 신뢰 정책 sub 가 `repo:DongBrothers@339505241/FactoryFlow_FE@1409951739:ref:refs/heads/main`. 콘솔 마법사가 만드는 `repo:DongBrothers/FactoryFlow_FE:...` 는 거절된다 (`gh api repos/{owner}/{repo}/actions/oidc/customization/sub`)
- GitHub: 시크릿 `AWS_DEPLOY_ROLE_ARN`, 변수 `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`
- 저장소 공개 (무료 요금제의 비공개 저장소는 보호 규칙이 적용되지 않음, 백엔드도 공개). main 보호: classic, PR 필수, 승인 0, 필수 검사 `check`·`explain`

## 4. 화면 목록 (백엔드 main 기준)

폴더는 CLAUDE.md "폴더 구조". Figma 열: 화면 번호 (2026-10-21 에 최신 백엔드 기준으로 고침·새로 그림. 흐름 H·I 가 새 화면)

| 폴더 | 화면 | API | 쓰기 역할 | Figma |
|---|---|---|---|---|
| auth | 01 로그인 | `POST /api/auth/login` | - | 완료 (코드) |
| auth | 02 계정 활성화 (`/activate?token=`), 02-e 링크 만료 | `POST /api/auth/activation` | 공개 | 있음 |
| layout | 03 레이아웃 (사이드바, 상단 역할, 로그아웃) | `POST /api/auth/logout` | - | 역할별 사이드바 3종 |
| admin | 04 계정 발급 | `POST /api/auth/admin/users`, 역할 선택지 `GET /api/auth/admin/roles` | ACCOUNT_ADMIN | 완료 (코드) |
| admin | 🆕 22 역할·권한 | `GET /api/auth/admin/roles`, `GET …/permissions`, `PUT …/roles/{code}/permissions` | ACCOUNT_ADMIN | 흐름 G 갈래 2 |
| orders | 05 주문 목록, 07 주문 상세 (+취소 모달, 취소 결과) | `GET /api/orders`, `GET …/{orderNo}`, `POST …/{orderNo}/cancel` | 취소 SALES | 흐름 A |
| orders | 06 주문 등록 (고객 선택, 제품·수량 여러 줄) | `POST /api/orders`, `GET /api/production/products`, 고객 `GET /api/orders/customers` | SALES | 흐름 A |
| orders | 🆕 고객 목록·등록 | `GET·POST /api/orders/customers` (`{name, contact}`) | 등록 SALES | 흐름 I: 20, 20-1 |
| production | 🆕 작업지시 발행 대기 | `GET /api/production/productions/awaiting-release`(CursorPage), `POST …/{productionId}/work-order`(202) | 발행 PRODUCTION | 흐름 H: 17, 17-1 |
| production | 🆕 제품·BOM 목록·상세·등록·수정 | `GET·POST /api/production/products`, `GET·PUT …/{productId}` | PRODUCTION | 흐름 H: 18, 18-1 |
| mes | 08 작업지시 목록, 09 상세 (공정 시작·종료, 의장 LOT 스캔 `scannedLots`) | `GET /api/mes/work-orders`, `GET …/{id}`, `POST …/{id}/steps/{process}/start`·`complete` | 공정 PRODUCTION | 흐름 B (불량은 아래 "Figma 와 다른 곳") |
| mes | 09-e 공정 센서값 | `GET /api/mes/work-orders/{id}/steps/{process}/telemetry` | - | 흐름 C 갈래 |
| mes | 10 설비 현황, 10-1 상태 이력, 10-2 센서값 | `GET /api/mes/equipments?process=` (공정 5개 각각 불러 합침), `GET …/equipments/{code}/history`(CursorPage, 최신 먼저), `GET …/equipments/{code}/telemetry?from=&to=` | - | 흐름 C |
| mes | 12 쓰인 부품 LOT 드로어 (11 에서 열림) | `GET /api/mes/vehicles/{vin}/part-lots` | - | 흐름 E 갈래 |
| mes | 16 LOT 추적 | `GET /api/mes/part-lots/{lotNo}/vehicles` | - | 흐름 F |
| inventory | 11 완성차 목록·출고 | `GET /api/inventory/finished-vehicles`(+`slotCode`), `POST …/{vin}/ship` | 출고 PRODUCTION | 흐름 E |
| inventory | 🆕 보관 위치 현황 (A·B 구역 40자리, 자리 대기 수) | `GET /api/inventory/storage-slots` | - | 흐름 H: 19 |
| inventory | 13 부품 재고 (+LOT 별 재고 드로어) | `GET /api/inventory/parts`, `GET …/{id}/lots` | - | 있음 |
| inventory | 🆕 13 안: 부품 등록·수정, 재고 조정 모달 | `POST·PUT /api/inventory/parts`, `POST …/{id}/adjustments` (`{qty: ±, reason}`) | PURCHASE | 흐름 F 13 버튼, 흐름 I: 13-2, 13-3 |
| purchases | 14 발주 제안 (+발주 모달) | `GET /api/purchases/suggestions`, `POST /api/purchases`, `GET /api/purchases/suppliers` | 발주 PURCHASE | 흐름 D |
| purchases | 15 구매 목록 (발주 중 / 입고 완료, +입고 모달) | `GET /api/purchases?status=`, `POST …/{id}/receive` | 입고 PURCHASE | 있음 |
| purchases | 🆕 공급업체 목록·등록·수정 | `GET·POST /api/purchases/suppliers`, `PUT …/{id}` | PURCHASE | 흐름 I: 21, 21-1 |

- 로그인 뒤 첫 화면: SALES → 주문 목록, PRODUCTION → 작업지시, PURCHASE → 발주 제안, ADMIN → 계정 발급. 그 메뉴가 권한에서 빠졌으면 보이는 첫 메뉴
- **사이드바는 역할별로 자기 업무 메뉴만** (2026-10-21 결정). 숨긴 메뉴는 주소로도 못 들어간다 (Layout 이 첫 화면으로). 표는 src/app/menu.ts 한 곳
  - 메뉴는 `GET /api/auth/me` 의 permissions 로 고른다: READ 면 자기 역할의 업무 메뉴, ACCOUNT_ADMIN 이면 계정 발급·역할·권한. 관리자가 22 에서 권한을 바꾸면 새로고침 때 반영
  - 쓰기 버튼도 권한으로 보인다 (역할 아님): ORDER_WRITE = 주문 등록·취소, 고객 등록 / PRODUCTION_WRITE = 발행, 제품·BOM, 공정 시작·종료, 출고 / PURCHASE_WRITE = 발주·입고, 부품·공급업체, 재고 조정
  - SALES: 주문, 고객
  - PRODUCTION: 작업지시 발행 대기, 작업지시, 설비 현황, 제품·BOM, 완성차·출고, 보관 위치, LOT 추적
  - PURCHASE: 발주 제안, 구매, 부품 재고, 공급업체, LOT 추적
  - ADMIN: 계정 발급, 역할·권한
  - LOT 추적이 둘인 이유: 불량 LOT 연락은 구매가 받고, 그 LOT 이 들어간 차의 출고를 멈추는 것은 생산이라서 (품질 역할이 따로 없음)
  - 백엔드는 지금도 조회(GET)를 업무 역할 3개 모두에게 연다. 메뉴 숨김은 화면에서만 하는 것이라, 나중에 필요하면 menu.ts 표만 바꾼다
- id → 이름: 작업지시·완성차의 `productId` 는 제품 목록, 주문의 `customerId` 는 고객 목록, 구매의 공급업체는 공급업체 목록, 직원 public_id(실적 작업자, 발주자, LOT 찍은 사람)는 `GET /api/auth/users?publicIds=a,b` → `[{publicId, name}]` 로 바꾼다
- 발행 직후 작업지시가 아직 없을 수 있다 (mes 가 이벤트로 만듦, 404 WORK_ORDER_NOT_FOUND) → 잠시 뒤 다시 조회
- 고객에게 보이는 상태: 발행 대기(READY)는 "접수", 첫 공정 시작부터 "생산 중"
- 목록 응답: 작업지시·구매·발행 대기는 `CursorPage { items, count, last, nextCursor }`, 주문은 `nextOrderNo`, 완성차는 `nextVin`. 고객·공급업체·제품은 페이지 없이 전체

## 5. Figma 와 다른 곳 (백엔드를 따른다)

Figma v1 은 백엔드 `9793597` 기준. 그 뒤 바뀐 것 (2026-10-26 결정: 백엔드 기준으로 만들고 Figma 는 나중에 고친다)

| 바뀐 것 | Figma | 백엔드 (따를 것) |
|---|---|---|
| 공정 불량 (#184, `docs/specs/defect-scrap.md`) | 09: 불량이면 실적만 남고 같은 공정이 다시 "대기" | 불량이면 작업지시 **SCRAPPED** (끝, VIN 없음). 같은 주문으로 대체 차가 생겨 부품 예약 → 17 발행 대기부터 다시. 폐기된 작업지시에 시작·종료하면 409 `WORK_ORDER_CLOSED`. 08 목록(RELEASED, IN_PROGRESS)에서는 빠지고 상세는 SCRAPPED 로 보인다 |
| 주문 상세의 폐기 차량 (#193) | - | 07 의 차량 목록에서 백엔드가 빼서 준다. 프론트는 할 일 없음 |
| 직원 이름 조회 (#181) | [필요] | 있음: `GET /api/auth/users?publicIds=` (READ, ADMIN 은 403) |

백엔드에 없는 API 는 지금 없다 (`docs/handoff/frontend-api-gaps.md`).

## 6. Figma (화면설계 v1)

- 파일: https://www.figma.com/design/8WrU20eUhninwpsuAQ2IYr/FactoryFlow — 페이지 **"화면설계 v1"** (v0 는 보지 않는다)
- Figma MCP 로 읽는다. 쓰기 전에 `figma-use` 스킬, 코드로 옮길 때는 `figma-design-to-code` 스킬
- `_컴포넌트 v1`(버튼·배지·입력·사이드바), `00 시작하기`(흐름 지도, 공통 규칙), `흐름 A` ~ `흐름 I`(화면 → 화살표 → 화면, 각 화면 아래 노란 **설명 패널**에 번호별 동작·API·오류 문구)
- 와이어프레임이다. 색·글꼴(Noto Sans KR)·간격은 배치 합의용

## 7. 화면 만드는 순서

1. ~~02 계정 활성화 → 04 계정 발급~~ (완료) → 권한별 메뉴·상단 이름 (이번 PR)
2. 현장: 17 발행 대기 → 08·09 작업지시 (의장 LOT 스캔, 불량 = 폐기) → 10 설비 (이력, 센서값), 09-e 공정 센서값
3. 완성차·재고: 11·12 완성차 + 19 보관 위치 → 13 부품 재고·조정·등록 → 16 LOT 추적
4. 구매: 14 발주 제안·발주 → 15 구매·입고 → 21 공급업체
5. 주문: 20 고객 → 05·07 주문 목록·상세 → 06 주문 등록
6. 18 제품·BOM, 22 역할·권한
