# Profile과 Main Tabs

## 목적

프로필 화면과 앱 탭 설정의 상태 소유권, 화면 표시와 외부 실행 경계를 정의한다.

## 현재 책임

- `mainTabsEngine.js`: 숨김 기본 탭과 사용자 정의 탭 데이터·변경 규칙의 단일 진입점
- `mainTabs.js`: MainTabs 구성요소 조립 진입점
- `mainTabsComposer.js`: 사용자 정의 탭 DOM, 모달과 iframe 렌더
- `mainTabsController.js`: 사용자 정의 탭 CRUD, 저장 요청과 사용자 입력 처리
- `profileEngine.js`: AppAuthController 사용자 정보와 MainTabsEngine 설정을 조회하고 편집 요청
- `profileComposer.js`: 사용자 정보, 아바타와 로그인 버튼 표시
- `profileController.js`: 기본 탭 표시 변경과 탭별 설정 요청 전달
- App Shell: 실제 기본 탭 표시와 전환 규칙
- AppAuthController: 인증 준비 상태, 현재 사용자와 로그인 후 데이터 로드 Lifecycle
- Cloud Sync/Auth Adapter: Google·Firebase SDK 실행

## 불변 조건

- `hiddenMainTabs`, `mainCustomTabs` 저장 필드와 기존 DOM ID를 유지한다.
- 프로필 탭은 숨길 수 없다.
- MainTabsEngine Snapshot은 복사본이며 외부 수정이 내부 상태를 바꾸지 않는다.
- ProfileEngine은 인증 상태, App Shell 상태나 탭 설정 원본을 소유하지 않는다.

## Compatibility 경계

- MainTabsEngine은 기존 저장 변환을 위해 Snapshot을 `window.__hiddenMainTabs`, `window.__mainCustomTabs`에 게시한다.
- 저장 데이터 적용부는 전역 배열을 직접 수정하지 않고 `MainTabsEngine.replaceState()`를 호출한다.
- `appDataTransforms.js`의 전역 대입은 순수 저장 fixture와 기존 적용 함수의 호환 경계이며, Cloud Sync가 즉시 Engine을 hydrate한다.
- `window.renderMainCustomTabs`, `window.renderMainTabVisibility`와 저장 호출 이름은 Sprint 13까지 유지한다.

## 맡지 않는 책임

- MainTabsEngine은 DOM 표시, 기본 탭 전환, 인증과 저장소 선택을 맡지 않는다.
- ProfileEngine은 OAuth 실행, 현재 사용자 변경과 탭 설정 원본을 맡지 않는다.
- App Shell은 탭 설정 원본과 사용자 정의 탭 CRUD를 맡지 않는다.
