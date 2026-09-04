# Recent Task

## 후속 변경: 모든 로그인 사용자 허용·10분 제한

- 이메일 허용 목록을 제거했다. 마감이즈커밍 Firebase 프로젝트의 정상 ID 토큰이 있는
  모든 사용자가 분석 API를 이용할 수 있다. 익명·만료·잘못된 프로젝트 토큰은 계속 거부한다.
- 정확히 600초는 허용하고 600초 초과는 거부한다. UI의 알려진 길이로 즉시 안내하며,
  서버도 다운로드 전 실제 메타데이터를 조회하고 변환 후 PCM 길이를 다시 검사한다.
- 곡 길이를 확인할 수 없는 영상도 다운로드 전에 거부한다. 실패해도 기존 재생은 유지한다.
- 분석기 버전은 `0.2.1`로 바꿔 이전 30분 정책의 성공 cache를 새 작업에 재사용하지 않는다.
- 이전의 이메일 확인 대기는 해제했다. 사용자가 두 저장소 커밋·푸시를 승인했다.
  로그인 브라우저 최종 검증은 남아 있다.
- Oracle 서비스에 새 정책을 적용했다. 프런트 테스트 89개, Oracle backend 테스트 61개와
  ESLint·Prettier·Ruff·diff 검사를 통과했다. 정확히 600초 허용, 초과·길이 미확인 시 다운로드
  미실행, PCM 길이 재검사, 다른 프로젝트 토큰 거부를 검증했다.
- 새 버전 `0.2.1`로 Oracle 실제 213초 곡의 분석·결과 조회·cache 재사용을 다시 확인했다
  (작업 22초). HTTPS health 200, 익명 요청 401, 기존 5개 서비스 active를 확인했다.

## 이전 구현 기록

## 2026-09-04 Oracle E2 분석 연결 — 계정 허용·프런트 배포 대기

- 기존 분석 버튼의 작업 생성→poll→결과 조회 경로를 Oracle HTTPS API에 연결했다.
  주소: `https://insight.magamiscom.ing/media-analysis`. 변경한 프런트 소스는 아직 푸시하지 않았다.
- 서버의 Firebase ID 토큰 검증과 검증된 이메일 허용 목록, Nginx 요청 제한을 추가했다.
  허용 이메일은 사용자 확인 전이므로 빈 목록으로 두어 인증된 계정도 아직 접근할 수 없다.
- 서비스는 `/srv/apps/media-analysis-service`, SQLite는 `/var/lib/media-analysis-service`에
  분리했다. CPU 25%, MemoryHigh 160MB, MemoryMax 256MB, swap 64MB, 단일 FIFO를 적용했다.
- 긴 WAV를 블록 단위로 읽어 메모리를 절약한다. 분석기 버전은 `0.2.0`, 곡 길이는 30분 제한이다.
- Oracle의 실제 YouTube 한 곡(213.043초)을 격리된 API smoke에서 분석했다.
  작업 78초, 프로세스 전체 98초, BPM 122.73, confidence 0.246. 결과 재조회와 성공 cache 재사용을
  검증했다. 낮은 confidence 결과를 자동 전환에 사용하지 않는다.
- 다른 공개 영상은 YouTube 로그인/봇 확인 요구로 다운로드 실패했다. 전체 곡 다운로드를
  보장하지 않으며 쿠키 복사·우회·로컬 Mac 자동 대체는 하지 않았다.
- 공개 HTTPS health 200, 익명 작업 요청 401을 확인했다. 기존 5개 서비스는 모두 active였다.
- frontend 테스트 88개, ESLint·Prettier·diff 검사 통과. Oracle backend pytest 53개, Ruff lint·format 통과.
  pytest에는 의존 라이브러리의 deprecation 경고 2건이 남는다.
- Google 계정 로그인 상태의 브라우저 클릭→원격 완료 검증, 프런트 공개 배포는 미완료다.
- Python venv 패키지 설치로 Ubuntu Python 3.12 패치 패키지가 함께 갱신됐다. Nginx는 설정
  검사 후 reload만 했다. 서버 reboot나 기존 앱 서비스 재시작은 하지 않았다.
- Nginx 원본은 `/etc/nginx/sites-available/insight-widget.before-media-analysis-20260904`에 보존했다.

## 이전 Task: 로컬 Lab batch 분석

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
