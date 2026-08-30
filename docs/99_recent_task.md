# Recent Task

## 상태

OAuth·Firebase와 분리된 노동요 Lab에 재시작 가능한 전곡 batch 분석 기반을 추가하고 실제
5곡 시험 분석을 확인했다.

## 구현

- backend CORS는 로컬 개발 Origin 목록 또는 환경변수의 정확한 Origin만 허용한다.
- 분석 API가 비활성·연결 실패여도 기존 WorkMusic 재생 경로는 그대로 유지된다.
- 현재 곡 `videoId`로 작업 생성→상태 poll→결과 조회를 수행하고 곡 전환 시 이전 응답을
  폐기한다.
- BPM·신뢰도·beat/bar와 자동 드럼 구간을 표시하고 handle로 수동 구간을 편집한다.
- drag 중에는 저장하지 않으며 drag 종료 또는 저장 버튼에서만 `mediaAnalysisManual`을 기존
  `cloudSaveWorkMusic` 경로로 저장한다.
- 자동 분석 원본은 세션 cache이며 저장 데이터에 포함하지 않는다.
- 두 곡의 저장된 수동 구간이 유효하면 `A drumEnd - B drumStart` 시각에 standby 재생을
  시작한다. crossfade 길이는 기존 fixed seamless 설정을 유지한다.
- 수동 구간이 없거나 한쪽뿐이거나 잘못된 경우 기존 fixed seamless 동작을 정확히 유지한다.
- detected 분석 결과는 편집 참고값이며 실제 자동 재생에는 사용하지 않는다.
- 로컬 구현은 완료했고 오라클 배포는 A1 인스턴스 가용 용량 확보 전까지 대기한다.
- 빈 곡 목록은 Player load를 재호출하지 않고 한 번만 렌더하며, 분석 상태를 `empty`로
  게시한다.
- Google OAuth에 등록된 커스텀 운영 Origin에서 로그인한 채 로컬 분석 서버를 시험할 수 있도록
  `?mediaAnalysis=local` 테스트 모드를 추가했다. 쿼리가 없는 일반 운영 접속은 계속
  비활성이다.
- `workmusic-lab.html`은 노동요 목록·현재 인덱스·볼륨·이어듣기 초와 사용자가 보정한
  `mediaAnalysisManual`만 전용 localStorage에 저장한다. Firebase와 메인 앱 데이터는 읽거나
  쓰지 않는다.
- Lab은 기존 WorkMusic Engine, Playback·Seamless·Analysis Controller와 Port·Adapter를 직접
  조립하며, 기존 WorkMusicComposer와 인증 Lifecycle은 사용하지 않는다.
- Lab에서 재생목록 URL을 영상 URL보다 먼저 판별하고 기존 재생목록 Controller로 전체 페이지를
  가져온다. 기존 localStorage 목록은 보존하며 같은 `videoId`는 중복 추가하지 않는다.
- 사용자가 지정한 679곡 테스트 재생목록은 Lab의 로컬 목록이 비어 있을 때 자동으로 가져온다.
- 분석 서버는 최대 100곡 batch 생성·상태·중단 API와 SQLite batch 복원을 제공한다. 현재
  분석기 버전 결과가 있으면 재분석하지 않고 cache를 재사용한다.
- Lab은 5곡 시험·전곡 분석, 진행률, 상태별 개수, queued 중단과 실패·취소 재개를 제공한다.
  batch ID와 대상 videoId만 localStorage에 저장하고 상세 결과는 서버 SQLite에 둔다.
- Lab의 시각 구조는 메인 노동요 탭의 좁은 다크 패널, 점선 입력, 5단 커버 흐름, 중앙 곡 정보,
  원형 재생 컨트롤과 분석·목록 패널을 기준으로 맞췄다.

## 검증과 미실행

- backend pytest 42개와 ruff check·format이 통과했다.
- frontend test 87개, ESLint, Prettier와 `git diff --check`가 통과했다.
- Lab에서 YouTube 메타데이터 저장, 새로고침 후 1곡 복원, 실제 분석 완료(BPM 125.3,
  confidence 24%), 수동 드럼 시작 5초 저장·복원과 콘솔 오류 0건을 확인했다.
- 인앱 브라우저의 테스트 영상은 YouTube iframe 재생을 거부했으므로 실제 브라우저 재생과 두 곡
  청각 전환은 미검증이다. Firebase는 Lab 범위 밖이며 호출하지 않았다.
- 메인 노동요와 Lab의 빈 상태를 1280×720, DPR 1에서 캡처·비교했고 `design-qa.md`의 최종
  결과는 `passed`다.
- 공개 재생목록으로 50곡 초과 페이지네이션을 실제 확인했고 기존 1곡에 183곡을 추가해 총
  184곡이 로컬 목록에 표시되는 것을 확인했다.
- 지정 재생목록의 첫 5곡 batch는 4곡 성공·1곡 `download_failed`였다. 성공 4곡은 SQLite 결과와
  BPM·confidence 조회를 확인했고, 실패는 전체 batch를 막지 않았다. 679곡 전체 실행은 아직
  시작하지 않았다.

## Git

- 현재 완료 변경은 사용자 요청에 따라 `main` 커밋·푸시 대상으로 검증했다.
