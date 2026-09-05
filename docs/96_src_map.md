# Source Map

## 시작 위치

- `index.html`: 정적 페이지 마크업과 단일 ES 모듈 진입
- `src/config.js`: 브라우저 앱 설정
- `src/app/bootstrap.js`: App State 준비와 AppComposer 실행
- `src/app/appComposer.js`: App Shell, 인증 Controller와 기존 기능·저장 모듈 조립
- `src/app/compatibilityFeatures.js`: 기존 기능 초기화와 탭별 렌더 호환 인터페이스
- `src/app/appAuthController.js`: 인증 준비 상태, 현재 사용자와 로그인 후 로드 시작 진입점
- `src/services/cloudSyncBackend.js`: 인증·저장 구현과 Compatibility 기능 초기화

## 주요 구조

```text
src/
  app/
    appAuthController.js
    appComposer.js
    compatibilityFeatures.js
    appShell.js
    appState.js
    bootstrap.js
  config.js
  data/
    koreanHolidays.js
  features/
    bookmarks.js
    bookmarks/
      bookmarksComposer.js
      bookmarksController.js
      bookmarksEngine.js
      bookmarksHelper.js
    calendar.js
    calendar/
      calendarComposer.js
      calendarController.js
      calendarEngine.js
      calendarHelper.js
    clipviewer.js
    clipviewer/
      clipViewerBrowserAdapter.js
      clipViewerComposer.js
      clipViewerController.js
      clipViewerEngine.js
      clipViewerHelper.js
    mainTabs.js
    mainTabs/
      mainTabsComposer.js
      mainTabsController.js
      mainTabsEngine.js
      mainTabsHelper.js
    notes.js
    notes/
      notesComposer.js
      notesController.js
      notesEngine.js
      notesHelper.js
    pomodoro.js
    pomodoro/
      pomodoroComposer.js
      pomodoroController.js
      pomodoroEngine.js
      pomodoroHelper.js
    profile.js
    profile/
      profileComposer.js
      profileController.js
      profileEngine.js
    tabSettings.js
    workmusic.js
    workmusic/
      workMusicComposer.js
      workMusicEngine.js
      workMusicHelper.js
      workMusicListController.js
      workMusicMetadataController.js
      workMusicPlaybackController.js
      workMusicPlaylistController.js
      workMusicSeamlessController.js
      workMusicTabsController.js
  ports/
    filePort.js
    metadataPort.js
    youtubePort.js
  services/
    appDataTransforms.js
    appDataRuntime.js
    bookmarkCloudHandlers.js
    bookmarkDriveHandlers.js
    cloudPersistenceHandlers.js
    cloudStateHandlers.js
    cloudSyncBackend.js
    driveFiles.js
    driveImageUrls.js
    driveStatus.js
    firebaseMetadataStore.js
    workMusicCloudHandlers.js
    youtubeBrowserAdapter.js
styles/
  app.css
  bookmarks.css
  calendar.css
  clipviewer.css
  notes.css
  pomodoro.css
  profile-main-tabs.css
  workmusic.css
```

## 주요 파일과 책임

- `index.html`: 전체 화면 마크업과 App Bootstrap 진입
- `styles/app.css`: App Shell, 공통 탭·모달·footer, Drive 상태와 전역 반응형 스타일
- `styles/workmusic.css`: 노동요 목록·커버 흐름·플레이어·진행 표시·컨트롤·리모컨과 반응형 스타일
- `styles/bookmarks.css`: 북마크 내부 탭·목록·모달과 드래그 상태 전용 스타일
- `styles/calendar.css`: 달력 주간·월간 화면, 공휴일·작업·설정 모달과 반응형 스타일
- `styles/clipviewer.css`: CLIP 툴바·빈 상태·파일 드래그 표시와 모바일 스타일
- `styles/profile-main-tabs.css`: 프로필과 사용자 정의 메인 탭 화면·모달·iframe 스타일
- `styles/pomodoro.css`: 뽀모도로 화면과 모바일 반응형 스타일
- `styles/notes.css`: 메모 탭과 편집 영역 전용 스타일
- `app/appState.js`: 기존 전역 기본 상태 초기화
- `app/appShell.js`: 공통 알림과 MainTabsEngine 설정에 따른 기본 탭 표시·전환
- `app/bootstrap.js`: App State 기본값 준비와 AppComposer 실행
- `app/appComposer.js`: App Shell, AppAuthController, Metadata Port와 Firebase Adapter, File Port와 Drive Adapter, Cloud Sync, 기존 기능과 Main Tabs 초기화 순서 조립
- `app/compatibilityFeatures.js`: 기존 기능 초기화 순서와 공개 렌더 함수의 탭별 호출을 한곳에서 연결
- `app/appAuthController.js`: 인증 준비 상태, 현재 사용자와 로그인 후 데이터 로드 시작 소유
- `features/calendar.js`: 달력 Engine·Composer·Controller 조립 진입점
- `features/calendar/calendarEngine.js`: 기준 주·월, 보기 방식, 주 시작일, 작업과 완료 상태의 단일 소유자
- `features/calendar/calendarComposer.js`: 기존 주간·월간 DOM, 작업·설정 모달과 휠·키보드 제스처 조립
- `features/calendar/calendarController.js`: 작업 CRUD·완료 변경, 보기 이동, 설정 저장과 공개 Compatibility 연결
- `features/calendar/calendarHelper.js`: KST 날짜, 주·월 범위, 기간·반복 작업 순수 계산
- `features/notes.js`: 메모 Engine·Composer·Controller를 조립하고 기존 공개 호환 계약을 연결하는 진입점
- `features/notes/notesEngine.js`: 메모 탭 목록, 활성 탭과 탭별 본문의 단일 소유자
- `features/notes/notesComposer.js`: 기존 textarea·탭 DOM 렌더와 사용자 이벤트 조립
- `features/notes/notesController.js`: 탭 CRUD·전환, 입력 지연 저장, 즉시 저장과 txt 백업 동작
- `features/notes/notesHelper.js`: 탭 정규화, ID, 백업 시각·파일명 계산
- `features/bookmarks.js`: 북마크 Engine·Composer·Controller 조립 진입점
- `features/bookmarks/bookmarksEngine.js`: 탭, 활성 탭, 항목과 정렬·이동·편집 규칙의 단일 소유자
- `features/bookmarks/bookmarksComposer.js`: 탭·목록·모달·드래그·붙여넣기 DOM과 Instagram 표시 조립
- `features/bookmarks/bookmarksController.js`: Engine 변경 게시, 저장 예약과 공개 Compatibility 연결
- `features/bookmarks/bookmarksHelper.js`: URL 종류·도메인·안전한 열기와 YouTube 미리보기 순수 계산
- `features/workmusic.js`: WorkMusicComposer만 호출하는 얇은 노동요 진입점
- `features/workmusic/workMusicComposer.js`: 노동요 DOM 조회·렌더·이벤트와 Engine·Controller 조립
- `features/workmusic/workMusicEngine.js`: 곡·탭·현재 곡·순서·볼륨·이어듣기 상태, 세션 재생 이력·다음 후보 교체의 단일 소유자와 기존 전역 프록시
- `features/workmusic/workMusicTabsController.js`: 노동요 탭 CRUD와 저장 요청
- `features/workmusic/workMusicListController.js`: 곡 목록 추가·수정·삭제 요청
- `features/workmusic/workMusicPlaybackController.js`: 일반 Player 생성·파괴, 재생·정지·seek·이전·다음·음량과 오류 곡 건너뛰기 실행
- `features/workmusic/workMusicMetadataController.js`: YouTube 곡 메타데이터 요청 진입점
- `features/workmusic/workMusicPlaylistController.js`: YouTube 재생목록 요청 진입점
- `features/workmusic/workMusicSeamlessController.js`: 두 Player 슬롯, 비초록 DJ 전환, 기존 결과 준비, 실패 후보 제외·standby 복구, monitor·fade·상태 안내
- `features/workmusic/workMusicAnalysisController.js`: 곡별 큐 등록·백그라운드 추적·서버 큐 집계·활성 작업 복원, 결과 cache와 수동 구간 저장 요청
- `features/workmusic/workMusicAnalysisView.js`: 분석 상태·큐·음파·후렴 후보·재생 위치선·초록 시작/끝과 흰 1절 핸들 렌더·편집 이벤트
- `features/workmusic/workMusicPrecisionEditor.js`: 휠/키보드 확대·가운데 드래그 이동, PCM viewport/모델 구간 렌더, 통합 슬라이더/클릭 seek·즉시 재생선·핸들 시간 배치
- `features/workmusic/workMusicPlaybackIdentity.js`: 실제 Player 정보·공개 영상 URL에서 재생 videoId를 조회하는 순수 경계
- `features/workmusic/workMusicAnalysisHelper.js`: 분석 호환성·독립 1절 검증, 후렴 후보와 초록 경계 정렬·전후 독립 DJ 페이드 계획
- `features/workmusic/workMusicRepetitionHelper.js`: 기존 음파의 먼 구간 반복 비교와 후보 경계 추정, 단조 패턴 제외
- `features/workmusic/workMusicAutoAnalysisController.js`: 현재 목록 순차 분석, 구버전 갱신·일시정지·연결 재시도
- `features/workmusic/workMusicHelper.js`: YouTube URL·ID·제목·시간·재생 순서와 실패 곡 하단 표시 순수 계산
- `features/clipviewer.js`: CLIP Engine·Composer·Controller와 외부 기능을 조립하고 공개 호환 계약을 연결하는 진입점
- `features/clipviewer/clipViewerEngine.js`: 페이지 목록, CMC 정렬 결과, 로컬 미리보기, 저장 manifest와 동기화 상태의 단일 소유자
- `features/clipviewer/clipViewerComposer.js`: 기존 CLIP DOM 렌더와 폴더 선택·드롭 이벤트 조립
- `features/clipviewer/clipViewerController.js`: 파일 로드, 미리보기 추출, Drive 자동 동기화와 모바일 로드 흐름
- `features/clipviewer/clipViewerHelper.js`: CanvasNode 연결 순서, 경로 정규화, 누락 판정과 자연 정렬
- `features/clipviewer/clipViewerBrowserAdapter.js`: DirectoryEntry, SQL.js, Blob URL과 브라우저 실행 Adapter
- `features/pomodoro.js`: 뽀모도로 탭 구성요소 조립과 기존 공개 렌더 호환 진입
- `features/pomodoro/pomodoroEngine.js`: 뽀모도로 상태와 모드·단계 전환의 단일 진입점
- `features/pomodoro/pomodoroComposer.js`: 기존 타이머 DOM 렌더와 이벤트 조립
- `features/pomodoro/pomodoroController.js`: 시작·일시정지·리셋·다음 단계·저장과 완료 알림 동작
- `features/pomodoro/pomodoroHelper.js`: 시간 표시·변환, KST 날짜와 상태 정규화
- `features/mainTabs.js`: 사용자 정의 메인 탭 DOM, 모달과 iframe 조립 진입점
- `features/mainTabs/mainTabsComposer.js`: 사용자 정의 탭 버튼·설정 목록·모달·iframe DOM 렌더
- `features/mainTabs/mainTabsController.js`: 사용자 정의 탭 CRUD·저장 요청과 모달 사용자 입력 처리
- `features/mainTabs/mainTabsEngine.js`: 숨김 기본 탭과 사용자 정의 탭 설정·변경 규칙의 단일 소유자
- `features/mainTabs/mainTabsHelper.js`: 탭 설정 정규화, URL과 아이콘 순수 계산
- `features/profile.js`: Profile Engine·Composer·Controller 조립 진입점
- `features/profile/profileEngine.js`: 인증 사용자 정보와 탭 설정 조회·편집 요청 진입점
- `features/profile/profileComposer.js`: 프로필 사용자 정보, 아바타와 로그인 버튼 표시
- `features/profile/profileController.js`: 탭 표시와 탭별 설정 사용자 입력 전달
- `features/tabSettings.js`: 기능 탭 설정 공통 UI
- `services/appDataTransforms.js`: 저장 데이터 기본값·정규화·분할·병합 순수 계산
- `services/appDataRuntime.js`: Engine 호환 Snapshot 수집, 로드 적용과 북마크 직렬화 Runtime Bridge
- `ports/metadataPort.js`: AppAuthController 인증 상태를 기준으로 메타데이터 읽기·쓰기 Adapter 호출
- `ports/filePort.js`: 기존 Drive 파일 검색, 폴더 준비, 업로드, 다운로드와 삭제 호출을 Adapter에 전달
- `ports/youtubePort.js`: YouTube Player 생성·제어와 외부 메타데이터 요청을 Adapter에 전달
- `ports/mediaAnalysisPort.js`: videoId·jobId·최대 100곡 batch 계약을 검증하고 분석 Adapter 호출을 전달
- `services/firebaseMetadataStore.js`: Firebase SDK를 사용하는 Firestore 메타데이터 Adapter
- `services/driveFiles.js`: File Port 뒤에서 Google Drive REST API를 호출하는 Drive File Adapter
- `services/youtubeBrowserAdapter.js`: IFrame Player API와 YouTube HTTP 요청을 실행하는 브라우저 Adapter
- `services/mediaAnalysisBrowserAdapter.js`: 설정된 API Origin에만 JSON 분석 요청을 보내는 Browser Adapter
- `services/mediaAnalysisAuth.js`: 기존 Firebase 로그인 ID 토큰을 원격 분석 요청에만 제공
- `workmusic-lab.html`: 로그인·Firebase 없이 노동요 분석과 이어듣기를 확인하는 독립 Lab 화면
- `lab/workMusicLab.js`: Lab 전용 DOM, WorkMusic Engine·재생·분석·재생목록 Controller와
  localStorage 조립
- `services/localWorkMusicStore.js`: Lab 곡 목록·수동 구간·재생 설정의 localStorage 직렬화 경계
- `services/localWorkMusicBatchStore.js`: Lab batch ID·대상 videoId·재개 상태의 작은 localStorage 경계
- `features/workmusic/workMusicBatchAnalysisController.js`: batch 분할 요청, 상태 집계, 중단·재개와 polling
- `styles/workmusic-lab.css`: 독립 Lab 화면의 레이아웃과 반응형 스타일
- `services/cloudSyncBackend.js`: Firebase·Drive 인증·저장 Lifecycle 구현과 Compatibility 렌더 요청
- `services/cloudPersistenceHandlers.js`: 로그인 확인과 공통 저장 즉시 실행·예약 계약
- `services/bookmarkCloudHandlers.js`: 북마크 탭 공개 저장 함수를 Controller와 Drive 폴더 동기화에 연결
- `services/workMusicCloudHandlers.js`: 노동요 탭 공개 저장 함수를 WorkMusicTabsController에 연결
- `services/cloudStateHandlers.js`: 공통·북마크·노동요 저장 계약 설치 조립
- `services/bookmarkDriveHandlers.js`: 북마크 파일 작업과 북마크 Compatibility 렌더 요청
- `services/driveImageUrls.js`: Drive 이미지 Blob URL Lifecycle
- `services/driveStatus.js`: 저장 상태 표시

## 구조 리팩토링 완료 상태

- 모든 기본 탭은 Engine 진입점을 가지며 Composer·Controller·Helper는 실제 변경 이유에 따라 분리돼 있다.
- Firebase, Drive와 YouTube 호출은 Port·Adapter 경계를 통과한다.
- 공통 저장 Runtime과 기능별 Cloud Handler 책임이 분리돼 있다.
- App 공통과 기능별 CSS 소유권이 분리돼 있으며 `styles.css` 잔여 파일은 없다.

## 테스트와 실행

- 정적 실행: GitHub Pages 또는 정적 HTTP 서버
- ESLint: `npm run lint`
- 형식 검사: `npm run format:check`
- 자동 테스트: `npm test`
- 현재 테스트:
  - `tests/appState.test.js`: App State 기본값과 세션 필드 초기화
  - `tests/bookmarksEngine.test.js`: 북마크 탭·항목 소유권, 이동·삭제 규칙과 Snapshot 복사 계약
  - `tests/bookmarksController.test.js`: Engine 변경의 전역 호환 게시와 저장 예약 계약
  - `tests/bookmarksHelper.test.js`: URL 분류·도메인·안전한 열기와 YouTube 미리보기 계약
  - `tests/calendarEngine.test.js`: 달력 상태 소유권, 기준일·설정, 작업 CRUD와 Controller 저장 게시 계약
  - `tests/calendarHelper.test.js`: KST 주·월 경계, 기간·반복 작업 발생과 횟수 계약
  - `tests/appDataTransforms.test.js`: Firebase 원본·Drive 분할/병합 fixture 의미 동등성, 저장 적용과 런타임 제외 계약
  - `tests/appAuthController.test.js`: 인증 상태 소유권과 로그인 후 데이터 로드 시작 계약
  - `tests/appComposer.test.js`: App Shell, Compatibility 기능과 Main Tabs 초기화 순서
  - `tests/clipviewer.test.js`: CLIP 모바일 새로고침의 앱 데이터 로드 후 Compatibility 렌더 호출 계약
  - `tests/clipViewerHelper.test.js`: CanvasNode 순서, 경로 정규화, 누락 파일과 자연 정렬 fallback 계약
  - `tests/clipViewerEngine.test.js`: CLIP 상태 소유권과 런타임 객체·저장 manifest 분리 계약
  - `tests/compatibilityFeatures.test.js`: 기존 기능 초기화와 전체 렌더 순서
  - `tests/cloudStateHandlers.test.js`: 북마크·노동요 공개 저장 계약의 Controller 위임과 제거 전역 계약
  - `tests/metadataPort.test.js`: 비로그인 호출 차단과 인증 후 Adapter 전달 계약
  - `tests/firebaseMetadataAdapter.test.js`: 기존 Firestore 문서·컬렉션 경로 계약
  - `tests/filePort.test.js`: 기존 Drive Compatibility 호출의 Adapter 전달과 UI Lifecycle 비소유 계약
  - `tests/workMusicEngine.test.js`: 노동요 상태 소유권, 인덱스 정규화와 공개 전역 프록시 계약
  - `tests/workMusicNavigation.test.js`: 첫 곡의 빈 이전 이력, 삭제/탭 변경, 순차·랜덤 다음 후보 교체와 세션 전용 상태
  - `tests/workMusicHelper.test.js`: YouTube URL·ID·재생 시간·순서 순수 계산 계약
  - `tests/workMusicPlaybackController.test.js`: 빈 목록 비재귀 load, 가짜 Player의 생성·seek·재생·정지·이전·다음·오류 skip과 두 Player monitor·fade 계약
  - `tests/youtubePort.test.js`: YouTube Port의 Adapter 전달 계약
  - `tests/mediaAnalysisBrowserAdapter.test.js`: 분석 API 주소·JSON·비활성·연결 실패 계약
  - `tests/mediaAnalysisPort.test.js`: 엄격한 YouTube videoId 경계
  - `tests/workMusicAnalysisController.test.js`: 초기 빈 목록 상태, POST·poll·result, stale 차단과 수동 저장 시점
  - `tests/workMusicAnalysisView.test.js`: 서버 큐 표시·현재 곡 중복 등록 방지 버튼 상태
  - `tests/workMusicPlaybackIdentity.test.js`: 실제 Player ID와 URL 대체 조회·조회 실패 계약
  - `tests/workMusicAnalysisHelper.test.js`: 수동 우선·신뢰도·고정 이어듣기 fallback 계산
  - `tests/localWorkMusicStore.test.js`: Lab 목록·수동 구간 저장과 손상 데이터 복구 계약
  - `tests/localWorkMusicBatchStore.test.js`: batch 재개 상태 저장과 손상 데이터 복구 계약
  - `tests/workMusicBatchAnalysisController.test.js`: 100곡 분할, 진행 집계와 새로고침 복원 계약
  - `tests/workMusicPlaylistController.test.js`: 재생목록 전체 페이지 순회, 비공개·중복 항목 제외 계약
  - `tests/driveFileAdapter.test.js`: 기존 Drive 폴더 이름과 업로드·다운로드·삭제 요청 계약
  - `tests/pomodoroHelper.test.js`: 시간 표시, 설정 범위와 날짜별 상태 정규화 계약
  - `tests/pomodoroEngine.test.js`: 타이머 진행·일시정지·자동 단계 전환과 실행 중 복원 계약
  - `tests/notesEngine.test.js`: 메모 상태 단일 소유, CRUD, 복사본 Snapshot과 기본 복원 계약
  - `tests/notesController.test.js`: 빠른 입력 후 탭 전환 전 즉시 저장과 본문 보존 순서
  - `tests/mainTabsEngine.test.js`: 숨김 탭 규칙, 사용자 정의 탭 CRUD, 저장 order와 Snapshot 소유권
  - `tests/profileEngine.test.js`: 인증·탭 설정 비소유와 편집 요청 전달 계약
- diff 검사: `git diff --check`
- 실제 QA: Firebase 로그인, Drive 파일, 브라우저 파일 선택, YouTube 재생과 이어듣기는 별도 수동 검증

## 현재 호환 계약

- 저장 의미 동등성, 초기화 순서, 공개 `window.*` 정의자·호출자·제거 예정 Sprint와 탭별 회귀 기준은 `docs/architecture/runtime-contracts.md`를 따른다.
