# Work Music

## 목적

YouTube 기반 노동요 목록, 재생, 이어듣기와 저장 데이터의 현재 계약을 정의한다.

## 저장 데이터

- 곡 목록에는 ID, YouTube `videoId`, 제목, 아티스트, 썸네일, 길이와 소속 노동요 탭 정보가 포함될 수 있다.
- 탭 목록, 활성 탭, 현재 인덱스, 음량, 음소거와 이어듣기 설정을 저장한다.
- 셔플 표시 순서와 실제 YouTube 플레이어·타이머는 세션 상태이며 저장 원본이 아니다.

## 재생 계약

- 일반 모드는 YouTube IFrame Player API와 재생목록을 사용한다.
- 이어듣기 모드는 활성·대기 두 플레이어를 사용한다.
- 대기 플레이어는 다음 곡을 미리 cue하고 음량 0으로 유지한다.
- 전환 시 다음 곡의 실제 재생 상태를 확인한 뒤 볼륨 크로스페이드를 시작한다.
- 대기 플레이어가 준비되지 않거나 전환이 실패하면 즉시 다음 곡 재생으로 대체한다.
- 삭제·비공개·임베드 불가·응답 없음은 해당 곡 실패로 처리하고 기존 목록을 보존한다.

## 구조 계약

- `WorkMusicEngine`은 곡·탭·활성 탭·현재 인덱스·재생 순서·음량·음소거·이어듣기 설정의 원본이다.
- 기존 `window.workMusic*`와 `window.__workMusic*` 상태는 Engine을 읽고 쓰는 호환 프록시이며 별도 원본이 아니다.
- 탭 저장 변경은 `WorkMusicTabsController`를 통해 Engine에 반영한 뒤 기존 Cloud 저장을 예약한다.
- 재생, 목록, 탭, 메타데이터, 재생목록 가져오기와 이어듣기는 변경 이유별 Controller 경계를 가진다.
- PlaybackController는 일반 Player 생명주기, seek, 재생·정지, 이전·다음과 오류 곡 건너뛰기를 실행한다.
- SeamlessController는 활성·대기 Player 슬롯, monitor, standby 재생 확인, fade와 슬롯 교체를
  실행한다. 현재 곡과 대기 곡 모두 유효한 `mediaAnalysisManual`이 있으면
  `A drumEnd - B drumStart` 시각에 대기 곡을 시작하고, 그 외에는 기존 고정 겹침 시점을
  그대로 사용한다. crossfade 길이는 기존 고정 이어듣기 설정을 유지한다.
- `YouTubePort`는 Player 생성·제어와 현재 사용하는 외부 메타데이터 요청 규격이며, `youtubeBrowserAdapter`가 IFrame API와 HTTP를 실행한다.
- AppComposer가 YouTube Adapter와 Port를 만들고 노동요 기능에 주입한다.
- AppComposer는 `APP_CONFIG.mediaAnalysis.apiBaseUrl`로 Media Analysis Browser Adapter를 만들고,
  `MediaAnalysisPort`를 거쳐 `WorkMusicAnalysisController`에 주입한다.
- 로컬 호스트에서는 로컬 분석 API를 기본 사용한다. OAuth 로그인이 가능한 운영 사이트에서
  로컬 분석 서버를 시험할 때만 `?mediaAnalysis=local`을 명시하며, 일반 운영 접속에서는 분석
  API를 비활성으로 유지한다.
- AnalysisController는 작업 생성·poll·결과 조회, 곡 전환 stale 응답 차단과 현재 세션의 자동
  분석 결과 cache를 소유한다. 분석 API가 꺼지거나 응답하지 않아도 재생 Controller에는
  영향을 주지 않는다.
- 자동 분석 원본은 저장하지 않는다. 사용자가 수정한 `mediaAnalysisManual`의
  `drumStart`·`drumEnd`만 곡 데이터에 기록하고 기존 `cloudSaveWorkMusic` 경로로 저장한다.
- 스마트 전환 계획 Helper는 수동값과 자동값의 후보 계획을 계산할 수 있지만, 실제
  SeamlessController 재생에는 두 곡의 저장된 수동값만 사용한다. detected 결과는 현재
  편집을 돕는 참고값이며 자동 재생에는 사용하지 않는다.
- `WorkMusicComposer`가 기존 DOM 런타임과 Engine·Controller 구성을 시작한다.

## UI 계약

- 기존 재생 진행바, 목록, 커버 흐름, 이전·재생·다음, 셔플, 이어듣기, 음량과 리모컨 동작을 유지한다.
- `styles/workmusic.css`가 노동요 내부 탭, 목록, 커버 흐름, 진행 표시, 두 Player 표시 영역, 재생·음량·이어듣기 컨트롤, 하단 리모컨과 반응형 규칙을 소유한다.
- App 공통 탭·모달·footer와 Drive 저장 표시는 `styles/app.css`가 소유한다.
- 탭 표시를 끄거나 전환해도 저장된 곡을 삭제하지 않는다.
- DOM ID와 공개 `window.*` 함수는 대체 인터페이스가 검증되기 전까지 호환한다.
- 재생바 아래 분석 패널은 상태, BPM·신뢰도, beat/bar marker, 드럼 구간 편집을 표시한다.
  range drag 중에는 runtime draft만 바꾸고 drag 종료 또는 `수정 저장`에서만 저장한다.

## 기능 검증 Lab 계약

- `workmusic-lab.html`은 OAuth·Firebase·메인 AppComposer와 분리된 노동요 전용 검증 화면이다.
- Lab은 기존 WorkMusic Engine, Playback·Seamless·Analysis Controller와 YouTube·Media Analysis
  Port를 재사용하되 `WorkMusicComposer` 전체와 Cloud 저장 Lifecycle은 사용하지 않는다.
- Lab 곡 목록, 현재 인덱스, 볼륨, 이어듣기 초와 `mediaAnalysisManual`은
  `magamiscoming.workmusicLab.v1` localStorage에만 저장한다.
- detected 자동 분석값, YouTube Player와 타이머는 Lab에서도 런타임 상태이며 저장하지 않는다.
- Lab 검증 결과를 이유로 자동 분석값을 메인 재생에 연결하지 않는다. 실제 청각 QA와 별도 승인
  후 검증된 계약만 메인 앱에 반영한다.

## 맡지 않는 책임

- 노동요 기능은 Firebase와 Drive 중 어느 저장소를 사용할지 결정하지 않는다.
- detected 결과 기반 자동 전환 실행, 다음 곡 추천과 장르별 분석 보정은 현재 구현 계약이
  아니다. 후속 계획은 `../plans/workmusic_dj.md`에 기록한다.
