# App Shell

## 목적

정적 페이지의 진입점과 기능 모듈 초기화 순서를 정의한다.

## 현재 책임

- `index.html`은 전체 화면 마크업, 외부 스크립트와 단일 ES 모듈 진입을 제공한다.
- `src/config.js`는 Firebase, Google Drive와 YouTube 설정을 브라우저 전역에 제공한다.
- `src/app/appState.js`는 저장 데이터가 적용되기 전 필요한 기존 전역 기본 상태 계약을 초기화한다.
- `src/app/appShell.js`는 공통 알림, MainTabsEngine 설정에 따른 기본 탭 표시·전환과 기존 공개 `window.*` 계약을 설치한다.
- `src/app/bootstrap.js`는 App State 기본값을 준비하고 AppComposer 실행만 요청한다.
- `src/app/appComposer.js`는 App Shell과 AppAuthController를 만들고 Firebase Metadata Adapter, Metadata Port, Drive File Adapter, File Port, Cloud Sync와 Compatibility 기능 인터페이스를 조립한다.
- `src/app/compatibilityFeatures.js`는 기존 기능 초기화 순서와 탭별 Engine·렌더 호환 함수를 한곳에서 연결한다.
- `src/app/appAuthController.js`는 인증 준비 상태, 현재 사용자와 로그인 후 데이터 로드 시작의 단일 진입점이다. 기존 `window.isAuthReady` 값은 호환 계약으로 함께 갱신한다.
- `src/ports/metadataPort.js`는 AppAuthController의 현재 사용자 상태를 확인한 뒤 메타데이터 Adapter 읽기·쓰기를 전달한다.
- `src/ports/filePort.js`는 기존 Drive 파일·폴더 호출을 Drive File Adapter에 전달한다.
- `src/services/cloudSyncBackend.js`는 Firebase·Drive 인증과 저장 Lifecycle을 담당하고 필요한 렌더를 주입받은 Compatibility 인터페이스에 요청한다.
- `src/features/mainTabs/mainTabsEngine.js`는 숨김 기본 탭과 사용자 정의 탭 설정을 소유하고, `mainTabs.js`는 사용자 정의 탭 DOM을 조립한다.

## 불변 조건

- Firebase·Drive 데이터가 적용되기 전에 기능이 저장 데이터를 덮어쓰지 않아야 한다.
- 프로필 탭은 숨김 대상에서 제외한다.
- 현재 탭을 숨기면 데이터 삭제 없이 프로필 탭으로 이동한다.
- 기능 모듈 초기화 순서를 변경할 때는 공개 `window.*` 사용처를 먼저 확인한다.
- `window.showTab`, `window.showAlert`, `window.showFeedbackMessage`, `window.renderMainTabVisibility` 호환 계약을 유지한다.
- 기존 기능 초기화 순서는 달력 → 메모 → 북마크 → 노동요 → 포모도로 → CLIP 뷰어 → Main Tabs를 유지한다.
- AppComposer가 반환하는 `tabEngines`는 달력, 뽀모도로, 메모, 북마크, 노동요, CLIP 뷰어와 프로필의 현재 조립된 Engine을 가리킨다.
- 로그인 후 AppAuthController가 데이터 로드 시작을 열면 달력을 먼저 적용하고 나머지 기능 데이터는 지연 로드한다.

## 맡지 않는 책임

- 앱 셸은 기능별 데이터 변환과 저장 스키마를 소유하지 않는다.
- 앱 셸은 노동요 재생, 달력 계산, 북마크 렌더링 같은 기능 내부 동작을 소유하지 않는다.
- AppComposer와 AppAuthController는 Firebase, Drive와 YouTube SDK 내부 구현을 소유하지 않는다.
- Cloud Sync와 저장 Handler는 기능 초기화나 공개 `window.render*` 탐색을 소유하지 않는다.
