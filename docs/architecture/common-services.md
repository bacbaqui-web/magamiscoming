# Common Services

## 목적

기능 Engine이 준비된 뒤 공통 저장 서비스가 탭 상태를 직접 변경하지 않도록 저장 변환, 브라우저 Runtime 연결과 공개 저장 계약의 소유권을 구분한다.

## 책임

- `appDataTransforms.js`: 브라우저에 의존하지 않는 기본값, 정규화와 Firebase·Drive 분할·병합
- `appDataRuntime.js`: Engine이 게시한 호환 상태에서 저장 데이터를 수집하고, 로드 데이터를 호환 상태에 적용하는 Runtime Bridge
- `cloudPersistenceHandlers.js`: 로그인 확인, 저장 즉시 실행·예약과 기능 Controller가 사용하는 Persistence 객체
- `bookmarkCloudHandlers.js`: 북마크 탭 공개 함수를 BookmarksController에 위임하고 Drive 폴더 이름을 동기화
- `workMusicCloudHandlers.js`: 노동요 탭 공개 함수를 WorkMusicTabsController에 위임
- `cloudStateHandlers.js`: 위 세 공개 계약 설치 순서만 조립
- `cloudSyncBackend.js`: Google/Firebase 인증, 저장소 선택, 저장 큐, 선로드·지연 로드와 로그아웃 Lifecycle

## 불변 조건

- 기능 탭 CRUD는 공통 서비스가 전역 배열을 직접 고치지 않고 해당 Controller와 Engine을 통한다.
- 저장 필드명, Firebase 문서 경로, Drive 파일·폴더 이름과 저장 큐 순서는 변경하지 않는다.
- 로드 시 노동요 셔플 순서를 초기화하는 기존 세션 계약을 유지한다.
- `APP_CONFIG`, `onYouTubeIframeAPIReady`, YouTube `YT`, Google SDK 콜백과 HTML에서 사용하는 공개 함수는 내부 호환 전역과 구분해 유지한다.

## 공개 전역 정리

사용처가 없어 제거한 전역:

- 메모 구형 경로: `cloudSaveNotesDebounced`, `cloudSaveStateOnly`, `cloudSaveNotesFor`, `cloudSaveNotes`, `cloudSaveNotesNow`, `cloudSetActiveNotesTab`, `cloudAddNotesTab`, `cloudRenameNotesTab`, `cloudReorderNotesTabs`, `cloudDeleteNotesTab`
- 중복 달력 경로: Cloud State의 `deleteTask` 정의. CalendarComposer의 Controller 경로는 유지한다.
- 사용되지 않는 세션·노동요 export: `__unsubs`, `renderWorkMusicTabsUI`, `extractYoutubeVideoId`, `addWorkMusicFromText`

유지한 전역:

- App Shell: `showTab`, 알림과 메인 탭 렌더 계약
- 저장 Lifecycle: `ensureLogin`, `waitForFeatureData`, `downloadAppDataBackup`
- 기능 Composer가 호출하는 북마크·노동요 탭 저장 함수와 `cloudSaveWorkMusic`, `cloudSavePomodoro`
- 저장 Runtime Bridge가 Engine Snapshot을 읽고 로드를 hydrate하는 동안 필요한 기능별 상태 호환 프록시
- 외부 스크립트 계약: `APP_CONFIG`, `onYouTubeIframeAPIReady`, `YT`, Google API 전역

## 맡지 않는 책임

- 공통 서비스는 기능 DOM, 재생 규칙, 달력 계산과 디자인을 결정하지 않는다.
- Runtime Bridge는 브라우저 세션 객체를 영구 저장 데이터에 포함하지 않는다.
- 이 단계는 CSS 소유권과 전체 시각 회귀 완료를 선언하지 않는다.
