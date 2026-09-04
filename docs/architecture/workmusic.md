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
  실행한다. 디제잉은 `A drumEnd` 이후 시작한다. fade는 남은 A 아웃트로, B 인트로,
  최대 페이드 설정 중 최솟값이며 B는 `B drumStart - fade`부터 재생한다.
  대기 Player의 실제 재생 위치로 fade를 진행하고 B 초록 시작까지 A를 종료한다.
  양쪽 구간이 유효하지 않으면 곡 종료 후 순차 전환하며, 비초록 길이가 0이면 겹치지 않는다.
- `YouTubePort`는 Player 생성·제어와 현재 사용하는 외부 메타데이터 요청 규격이며, `youtubeBrowserAdapter`가 IFrame API와 HTTP를 실행한다.
- AppComposer가 YouTube Adapter와 Port를 만들고 노동요 기능에 주입한다.
- AppComposer는 `APP_CONFIG.mediaAnalysis.apiBaseUrl`로 Media Analysis Browser Adapter를 만들고,
  `MediaAnalysisPort`를 거쳐 `WorkMusicAnalysisController`에 주입한다.
- 비공개 개인 사용 단계에서는 일반 운영 주소도 `http://127.0.0.1:8000` 로컬 분석 API를
  기본으로 사용한다. 별도 쿼리는 필요 없다. `?mediaAnalysis=oracle`을 명시한 경우에만
  `https://insight.magamiscom.ing/media-analysis`의 Oracle E2 API와 Firebase 토큰을 사용한다.
  로컬 서버 연결 실패 시 서버 실행·브라우저 로컬 네트워크 권한을 안내하며 Oracle로 자동 전환하지 않는다.
- 원격 분석 요청은 기존 Firebase 로그인에서 갱신한 ID 토큰을 Authorization 헤더로 보낸다.
  토큰을 별도 저장하지 않는다. 서버는 서명·만료·프로젝트를 확인하며 해당 Firebase 프로젝트에
  로그인한 모든 사용자가 이용할 수 있다. 이메일 허용 목록은 없다. Lab은 기존 로컬 검증 경로를 유지한다.
- Oracle는 단일 FIFO, SQLite 결과 재사용, CPU 25%·메모리 256MB 제한으로 실행한다.
  분석기는 PCM을 작은 블록으로 읽으며 최대 10분 곡을 지원한다. 600초는 허용하고 초과하면
  다운로드 전 메타데이터와 변환 후 실제 PCM 길이로 거부한다. 길이 확인 불가도 거부한다. YouTube 다운로드가 제한된
  곡은 실패를 안내하고 재생은 유지한다. API 연결 대기는 최대 30분이며 완료 후 재조회할 수 있다.
- AnalysisController는 작업 생성·poll·결과 조회, 곡 전환 stale 응답 차단과 현재 세션의 자동
  분석 결과 cache를 소유한다. 분석 API가 꺼지거나 응답하지 않아도 재생 Controller에는
  영향을 주지 않는다.
- 분석 버튼은 서버 큐에 등록한다. 곡 전환은 제출·추적 요청을 취소하지 않으며 다른 곡도 등록할 수 있다.
  동일 videoId의 진행 중 요청은 중복 제출하지 않는다. 서버의 단일 FIFO Worker가 한 곡씩 처리한다.
- `GET /v1/jobs/queue?videoId=...`는 SQLite의 queued/running 수와 요청한 곡의 activeJob만
  반환한다. 취소·완료·실패 작업은 대기 수에서 제외한다. 다른 곡의 상세 정보는 반환하지 않는다.
- 화면은 서버 전체의 분석 중·대기 수를 구분한다. 작업이 남아 있으면 갱신하며 조회 실패를 0으로
  표시하지 않는다. 곡 선택 시 서버의 활성 작업을 복원하므로 새로고침 후 재등록할 필요가 없다.
  브라우저 종료는 서버 작업을 취소하지 않는다. 로컬 분석은 Mac 서비스가 켜져 있어야 한다.
- 자동 분석 원본은 저장하지 않는다. 사용자가 수정한 `mediaAnalysisManual`의
  `drumStart`·`drumEnd`와 선택적 `verseEnd`를 기존 `cloudSaveWorkMusic` 경로로 저장한다.
  이전 두 필드 데이터도 그대로 읽는다. 1절 초기 위치는 초록 구간 중앙이며 의미적 자동 검출이 아니다.
- 디제잉 구간은 저장된 수동값을 우선하고 없으면 현재 세션의 자동 분석 cache를 쓴다.
  편집 중 draft는 저장 전 재생에 적용하지 않는다. 자동 결과는 Cloud 저장하지 않는다.
  미분석 다음 곡을 자동 분석하지 않는다. 1절 위치는 저장·표시만 하며 재생 종료에는 아직 사용하지 않는다.
- `WorkMusicComposer`가 기존 DOM 런타임과 Engine·Controller 구성을 시작한다.

## UI 계약

- 전체 음파 그래프는 높이 140px이며 아래쪽 초록 시작/끝·흰색 1절 삼각형 세 개로 직접 편집한다.
  초록 채움은 draft 시작~끝에만 있고 양끝 인트로/아웃트로 라벨도 함께 이동한다.
  삼각형 꼭짓점과 세로선은 같은 시간 축을 쓴다. 1절은 시작~끝 안으로 제한한다.
  자동 구간 원본은 유지하며 드래그 중 음파 DOM을 재생성하지 않는다. 분석이 없으면 편집 표시를 숨긴다.
  전체 PCM의 균등 RMS 1,000점과 구간 후보를 표시하며 박자·마디 선은 기본 화면에서 제거했다.
  주황 선은 현재 재생 위치다. 기존 500ms 진행 갱신에서
  View의 `renderPlayback`만 호출하며 marker DOM을 재생 tick마다 다시 만들지 않는다.
  분석 길이를 우선 기준으로 삼고 다른 videoId의 이전 Player 위치는 숨긴다. Lab도 같은 View를 사용한다.
- Player의 `getVideoData`가 비어 있거나 실패하면 실제 `getVideoUrl()`의 videoId를 조회한다.
  현재 선택곡을 실제 재생곡으로 추측하지 않는다. 위치선은 별도 DOM 요소이며 위치만 갱신한다.
- 분석기 0.3.0의 `structureVersion`, `waveform`, `sections`, `drumConfidence`는 하위 호환 확장 필드다.
  기존 결과에 음파가 없으면 재분석을 안내한다. POST는 이전 분석기 버전 cache를 재사용하지 않는다.
- 구간의 start/end는 초 단위다. `intro`/`outro`는 반복된 타격음 후보의 첫/마지막 경계 앞뒤다.
  `chorus_candidate`는 8초 스펙트럼·음높이 분포가 멀리 떨어져 반복되고 상대적 에너지가 높은 후보다.
  확신할 수 없는 벌스·브릿지·후렴은 `section`으로 남긴다. 무음·단조 반복은 후렴으로 단정하지 않는다.
  신뢰도는 휴리스틱 근거 점수로 정확도 확률이 아니다. 드럼 검출 실패는 무드럼 판정과 다르다.
- 디제잉은 비초록 부분만 겹치며 후렴 자동 진입·1절 재생 모드는 포함하지 않는다.
  실제 YouTube seek/buffering·50ms fade tick 특성상 샘플 단위 정확도를 보장하지 않는다.

- 기존 재생 진행바, 목록, 커버 흐름, 이전·재생·다음, 셔플, 이어듣기, 음량과 리모컨 동작을 유지한다.
- `styles/workmusic.css`가 노동요 내부 탭, 목록, 커버 흐름, 진행 표시, 두 Player 표시 영역, 재생·음량·이어듣기 컨트롤, 하단 리모컨과 반응형 규칙을 소유한다.
- App 공통 탭·모달·footer와 Drive 저장 표시는 `styles/app.css`가 소유한다.
- 탭 표시를 끄거나 전환해도 저장된 곡을 삭제하지 않는다.
- DOM ID와 공개 `window.*` 함수는 대체 인터페이스가 검증되기 전까지 호환한다.
- 재생바 아래 분석 패널은 상태, BPM·신뢰도, 음파, 구간·1절 편집을 표시한다.
  range drag 중에는 runtime draft만 바꾸고 drag 종료 또는 `수정 저장`에서만 저장한다.

## 기능 검증 Lab 계약

- `workmusic-lab.html`은 OAuth·Firebase·메인 AppComposer와 분리된 노동요 전용 검증 화면이다.
- Lab은 기존 WorkMusic Engine, Playback·Seamless·Analysis Controller와 YouTube·Media Analysis
  Port를 재사용하되 `WorkMusicComposer` 전체와 Cloud 저장 Lifecycle은 사용하지 않는다.
- Lab 곡 목록, 현재 인덱스, 볼륨, 이어듣기 초와 `mediaAnalysisManual`은
  `magamiscoming.workmusicLab.v1` localStorage에만 저장한다.
- Lab의 링크 입력은 단일 영상과 공개 재생목록을 구분한다. 재생목록은 기존
  `WorkMusicPlaylistController`로 모든 API 페이지를 읽어 한 번에 추가하고, 기존 곡과 중복된
  `videoId`는 건너뛴다.
- 현재 기능 확인용 Lab은 지정된 테스트 재생목록을 기본값으로 사용하며, localStorage 목록이
  비어 있을 때만 자동으로 가져온다.
- Lab의 전곡 분석은 `WorkMusicBatchAnalysisController`가 최대 100곡씩 batch 요청으로 나누고
  서버의 단일 FIFO Worker를 그대로 사용한다. batch ID·대상 videoId·활성 상태만 별도
  localStorage에 저장해 새로고침 후 polling을 재개하며, 상세 자동 결과는 분석 서버 SQLite에
  둔다.
- 중단은 queued 작업만 취소하고 실행 중인 한 곡은 안전하게 완료한다. 재개는 같은 대상 목록을
  다시 제출해 현재 분석기 버전의 성공 cache와 실행 중 작업을 재사용하고 실패·취소 곡만 새로
  대기시킨다.
- detected 자동 분석값, YouTube Player와 타이머는 Lab에서도 런타임 상태이며 저장하지 않는다.
- Lab 검증 결과를 이유로 자동 분석값을 메인 재생에 연결하지 않는다. 실제 청각 QA와 별도 승인
  후 검증된 계약만 메인 앱에 반영한다.

## 맡지 않는 책임

- 노동요 기능은 Firebase와 Drive 중 어느 저장소를 사용할지 결정하지 않는다.
- detected 결과 기반 자동 전환 실행, 다음 곡 추천과 장르별 분석 보정은 현재 구현 계약이
  아니다. 후속 계획은 `../plans/workmusic_dj.md`에 기록한다.
