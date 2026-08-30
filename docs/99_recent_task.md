# Recent Task

## 상태

OAuth·Firebase와 분리된 노동요 기능 검증 Lab을 추가하고 실제 로컬 분석을 확인했다.

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

## 검증과 미실행

- backend pytest 39개, ruff check·format, pip check와
  `python -m compileall -q src/media_analysis_service tests`가 통과했다.
- frontend test 80개, ESLint, Prettier와 `git diff --check`가 통과했다.
- Lab에서 YouTube 메타데이터 저장, 새로고침 후 1곡 복원, 실제 분석 완료(BPM 125.3,
  confidence 24%), 수동 드럼 시작 5초 저장·복원과 콘솔 오류 0건을 확인했다.
- 인앱 브라우저의 테스트 영상은 YouTube iframe 재생을 거부했으므로 실제 브라우저 재생과 두 곡
  청각 전환은 미검증이다. Firebase는 Lab 범위 밖이며 호출하지 않았다.

## Git

- 현재 완료 변경은 사용자 요청에 따라 `main` 커밋·푸시 대상으로 검증했다.
