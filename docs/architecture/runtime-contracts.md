# Runtime Compatibility Contracts

## 목적

탭 Engine 전환 전에 저장 변환, 앱 초기화 순서와 공개 `window.*` 연결을 현재 동작 그대로 고정한다. 이 문서는 현재 호환 계약이며 목표 구조는 `docs/97_next_sprint.md`를 따른다.

## 저장 의미 동등성

`buildAppData()`가 만든 단일 앱 데이터는 Firebase 메타데이터 경로의 원본 형태이다. Drive 대체 경로는 같은 데이터를 `splitAppDataForDrive()`로 기능별 JSON으로 나누고 `mergeDriveParts()`로 다시 합친다.

의미 동등성 비교에 포함하는 항목:

- 달력 작업, 상태, 보기 방식
- 숨김 기본 탭과 사용자 정의 메인 탭
- 메모 탭 목록, 본문과 활성 탭
- 북마크 저장 가능 항목, 탭 목록과 활성 탭
- 노동요 곡, 탭, 현재 곡, 음량, 음소거와 이어듣기 설정
- 포모도로 상태와 설정
- CLIP 페이지 메타데이터

의도적으로 완전 동일성에서 제외하거나 정규화하는 항목:

- `updatedAt`: build와 merge 시점에 새 ISO 문자열로 생성된다.
- 메모 탭 목록: ID 중복 제거, 이름 trim, order 보정 후 정렬된다.
- `local_pending_image`: Drive 파일이 없는 브라우저 임시 북마크이므로 저장하지 않는다.
- `blob:` URL: 브라우저 세션 객체이므로 저장하지 않고 파일 ID가 있는 URL 필드는 `null`로 만든다.
- 북마크 `timestamp`: 저장 시 숫자 `timestampMs`, 적용 시 `toMillis()` 인터페이스로 복원한다.
- 포모도로의 비활성 `startedAt`·`endAt`: 반복 정규화 시 `null`과 `0` 사이에서 달라질 수 있으나 둘 다 시작·종료 시각 없음으로 비교한다.
- 노동요 셔플 표시 순서와 현재 재생 여부: 세션 상태이므로 저장하지 않는다.
- 저장된 `workMusicMode`: 분할·병합에는 보존되지만 `applyStoredAppData()`는 새 세션을 `sequential`로 시작한다.
- CLIP 로컬 폴더 핸들, YouTube Player, 타이머와 Blob URL은 저장 데이터에 포함하지 않는다.

자동 테스트는 변환 fixture만 검증한다. 실제 Firebase 계정·Firestore SDK와 Drive 파일 API의 동등성은 Sprint 4와 5의 실환경 검증 대상이다.

## 메인 탭 설정 저장 계약

- `hiddenMainTabs`와 `mainCustomTabs`는 단일 앱 데이터의 `state` 아래에 있다.
- Drive 대체 경로에서는 두 필드 모두 `calendar.json`의 calendar part에 함께 저장된다.
- Firebase 달력 part에서도 동일한 필드명과 배열 의미를 사용한다.
- 로드 시 배열이 아니면 빈 배열로 정규화한다.
- `hiddenMainTabs`는 기본 탭 ID 문자열 배열이며 프로필 탭은 숨기지 않는다.
- `mainCustomTabs`는 사용자 정의 탭 객체 배열이다. 기존 ID, 이름, URL과 order를 마이그레이션 없이 보존한다.
- 적용 후 `renderMainTabVisibility()`와 `renderMainCustomTabs()`를 각각 한 번 요청한다.
- Sprint 8의 MainTabsEngine 전환 전까지 전역 필드와 저장 필드명을 제거하거나 변경하지 않는다.

## 현재 초기화와 데이터 로드 순서

### 로그인 전

1. `bootstrap.js`가 `initializeAppState()`로 저장 전 기본 전역 상태를 준비하고 AppComposer 실행을 요청한다.
2. AppComposer가 `initializeAppShell()`을 실행해 알림, 기본 탭 전환과 표시 계약을 설치하고 달력 탭을 표시한다.
3. AppComposer가 기능 모듈과 `cloudSyncBackend`를 동적으로 불러오고 AppAuthController를 만든다.
4. AppComposer가 Compatibility 기능 인터페이스를 만들고 `initCloudSyncBackend()`에 주입한다. Cloud Sync가 저장·인증 핸들러를 설치하고 CLIP 연결 옵션을 반환한다.
5. AppComposer가 Compatibility 인터페이스를 통해 달력 → 메모 → 북마크 → 노동요 → 포모도로 → CLIP 뷰어 → Main Tabs 순으로 기존 기능을 초기화한다.
6. 500ms 뒤 Google Token Client 준비와 기존 자동 로그인 복구를 시도한다.

기본 상태가 먼저 보이더라도 로그인 전에는 외부 사용자 데이터를 저장하지 않는다.

### 로그인 후

1. Google 사용자 정보와 Firebase 인증을 준비한다.
2. AppAuthController가 로그인 후 데이터 로드 시작을 열고 달력 part를 먼저 로드한다. 이 part에는 `hiddenMainTabs`와 `mainCustomTabs`도 포함된다.
3. Compatibility 인터페이스로 달력과 메인 탭 표시를 렌더링하고 로딩 오버레이를 닫는다.
4. 메모, 북마크, 노동요, 포모도로와 CLIP manifest를 백그라운드에서 지연 로드한다.
5. 지연 데이터 적용 후 Compatibility 인터페이스로 현재 기능 UI를 다시 렌더링하고 북마크 Drive 이미지를 별도로 해석한다.
6. 사용자가 달력·프로필 외 탭을 먼저 열면 `waitForFeatureData(tabId)`가 지연 로드를 기다린다.
7. CLIP 탭은 manifest 지연 로드 뒤 저장된 미리보기 Blob까지 추가로 준비한다.

## 공개 `window.*` 호환 계약

아래 표의 “호출자”는 대표 모듈이며 같은 기능 내부 호출을 포함한다.

| 계약 묶음                                                                                     | 현재 정의자                                                      | 대표 호출자                            | 대체 예정 Sprint                                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `showTab`, `showAlert`, `showFeedbackMessage`, `renderMainTabVisibility`                      | `app/appShell.js`                                                | 모든 기능, AppComposer 호환 인터페이스 | App 공통 계약은 주입 경로로 전환했으며 최종 판단은 Sprint 13 |
| `customTasks`, `taskStatus`, `__calendarViewMode`, 달력 모달·렌더 함수                        | CalendarController, `calendar.js`, Runtime Bridge                | Calendar, Cloud Sync, 저장 변환        | Engine 전환 완료, 저장 hydrate 경계로 유지                   |
| `__hiddenMainTabs`, `__mainCustomTabs`, `renderMainCustomTabs`                                | MainTabsEngine Compatibility, `mainTabs.js`, 저장 적용부         | App Shell, Main Tabs, Cloud Sync       | Engine 전환 완료, 최종 호환 제거 판단은 Sprint 13            |
| `__notes*`, `renderNotesUI`, `downloadAllNotesBackup`                                         | Notes Compatibility Controller, 저장 적용부                      | Notes, Cloud State, Cloud Sync         | Engine 전환 완료, 최종 호환 제거 판단은 Sprint 13            |
| `imageBookmarks`, `__bookmark*`, 북마크 CRUD·렌더 함수                                        | BookmarksController 게시, 저장 적용부, Drive Handler fallback    | Composer, Cloud State, Cloud Sync      | Sprint 10 구조 전환 완료, Sprint 13 최종 제거 검토           |
| `workMusic*`, `__workMusic*`, 노동요 렌더 함수                                                | WorkMusicEngine 프록시, Runtime Bridge, Composer                 | Work Music, Cloud State, Cloud Sync    | Engine 전환 완료, 내부 미사용 URL export는 Sprint 13 제거    |
| `__pomodoroState`, `renderPomodoroUI`, `cloudSavePomodoro`                                    | Compatibility Controller, `pomodoro.js`, `cloudStateHandlers.js` | Pomodoro, Cloud Sync                   | Engine 전환 완료, 최종 호환 제거 판단은 Sprint 13            |
| `clearClipLocal`, `setClipStatus`, `showClipMessage`, `loadClipPagesFromDrive`                | ClipViewerController Compatibility                               | Clip Viewer, Cloud Sync                | Engine 전환 완료, 최종 호환 제거 판단은 Sprint 13            |
| `ensureLogin`, `waitForFeatureData`, `isAuthReady`, `downloadAppDataBackup`                   | `cloudSyncBackend.js`                                            | App Shell과 모든 기능                  | Sprint 2~5                                                   |
| 북마크·노동요 `cloudAdd*`, `cloudRename*`, `cloudDelete*`, `cloudReorder*`, `cloudSetActive*` | 기능별 Cloud Handler                                             | 각 기능 Composer                       | Controller 위임 경로로 유지                                  |
| Drive 북마크 업로드·삭제·이동 함수                                                            | `bookmarkDriveHandlers.js`                                       | 북마크 Composer와 Cloud State          | Sprint 5·10 구조 전환 완료, Sprint 13 최종 제거 검토         |

전환 규칙:

- 정의자와 호출자가 모두 새 경로로 전환되고 자동·브라우저 회귀 검증을 통과하기 전에는 전역을 제거하지 않는다.
- 임시 호환 함수의 최종 제거 여부는 Sprint 13에서 실제 사용처를 다시 검색해 결정한다.
- 뽀모도로 상태 변경은 PomodoroEngine 메서드만 사용한다. 저장 적용부가 `__pomodoroState`를 교체하고 `renderPomodoroUI()`를 호출하는 경로와 Controller가 저장용 Snapshot을 게시하는 경로만 임시 Compatibility 예외이다.
- 메모 탭·본문·활성 탭 변경은 NotesEngine 메서드만 사용한다. Controller가 기존 저장 변환을 위해 `__notes*`에 Snapshot을 게시하고, 저장 적용부가 `__notes*`를 교체한 뒤 `renderNotesUI()`로 Engine을 hydrate하는 경로만 임시 Compatibility 예외이다.
- CLIP 페이지 목록, 정렬 결과와 동기화 상태 변경은 ClipViewerEngine 메서드만 사용한다. `File`, `Blob`과 Blob URL은 런타임 상태로, `state.clipPages` manifest는 저장 가능한 복사본으로 분리한다.
- `APP_CONFIG`, Google `onYouTubeIframeAPIReady`처럼 외부 스크립트가 요구하는 브라우저 전역은 내부 호환 전역과 구분한다.
- Sprint 13의 전역별 유지·제거 결과는 `common-services.md`를 따른다. 사용처가 사라진 메모 구형 Cloud 함수와 중복 달력·노동요 export만 제거했다.

## 탭별 최소 회귀 체크리스트

| 영역           | 최소 확인 경로                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| App Shell      | 최초 달력 표시, 기본 탭 전환, 숨긴 활성 탭에서 프로필 이동, 알림과 저장 상태 표시 |
| 달력           | 주간·월간 전환, 작업 추가·수정·삭제, 상태 변경, 새로고침 복원                     |
| 포모도로       | 시작·일시정지·초기화, 모드 전환, 설정 저장과 새로고침 복원                        |
| 메모           | 입력 후 지연 저장, 빠른 탭 전환, 탭 추가·이름 변경·순서·삭제, txt/전체 백업       |
| 북마크         | URL·이미지 추가, 편집·이동·정렬·삭제, Drive 이미지 표시와 Blob URL 해제           |
| 노동요         | 곡 추가, 재생·정지·다음·이전, 셔플·음량·탭 관리, 새 세션의 순차 모드              |
| CLIP 뷰어      | 폴더 선택·드롭, CMC 순서, 로컬 미리보기, Drive 저장·다른 기기 로드                |
| 프로필·메인 탭 | 로그인·로그아웃, 숨김 탭 복원, 사용자 정의 탭 추가·편집·삭제·전환                 |
| 저장 Lifecycle | 로그인 전 쓰기 차단, 달력 선로드, 나머지 지연 로드, 저장 중 종료 경고             |

정적 테스트는 실제 로그인, Drive 파일, 브라우저 폴더 선택, YouTube 재생과 시각·청각 결과를 대신하지 않는다.
