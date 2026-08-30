# 현재 작업 보고

## 요청

메인 앱 통합 전에 노동요 분석·스마트 이어듣기를 독립적으로 검증할 수 있는 localStorage 기반
Lab 페이지를 만든다.

## 완료 결과

- 분석 서비스는 설정된 정확한 Origin만 CORS로 허용하며 wildcard를 거부한다.
- AppComposer가 Media Analysis Adapter와 Port를 만들고 노동요 AnalysisController에 주입한다.
- 현재 곡의 작업 생성, poll, 결과 조회와 곡 전환 stale 응답 차단을 구현했다.
- 재생바 아래에 분석 상태, BPM·신뢰도, beat/bar marker, 드럼 구간 handle과 저장 UI를 추가했다.
- 자동 분석 결과는 runtime cache에만 두고 수동 구간만 기존 곡 데이터와 Cloud 저장 경로에
  기록한다.
- 현재 곡과 대기 곡의 저장된 수동 구간이 모두 유효하면 계산된 시각에 다음 곡을 시작한다.
  수동값이 없거나 한쪽뿐이거나 범위를 벗어나면 기존 fixed seamless를 그대로 사용한다.
- detected 결과는 편집 참고값이며 실제 자동 재생에는 사용하지 않는다.
- 로컬 구현은 완료했고 오라클 배포는 A1 인스턴스 가용 용량 확보 전까지 대기한다.
- 빈 곡 목록 렌더가 PlaybackController의 빈 load를 다시 호출하던 재귀를 제거했다. 빈 목록의
  분석 Controller도 첫 선택에서 `empty` 상태를 게시한다.
- 로컬 Origin의 Google OAuth `origin_mismatch`를 피하면서 실제 계정 데이터를 시험할 수 있게
  운영 주소의 `?mediaAnalysis=local` 접속에서만 이 Mac의 로컬 분석 API를 사용한다.
- `workmusic-lab.html`에서 로그인 없이 YouTube 목록 추가·재생 Controller·분석·수동 드럼 구간
  보정을 확인할 수 있다. 목록과 수동값은 `magamiscoming.workmusicLab.v1` localStorage에만
  저장하고 Firebase와 메인 앱 저장 데이터는 건드리지 않는다.
- Lab의 별도 대시보드 스타일을 제거하고 메인 노동요 탭의 800px 패널, 점선 링크 입력, 5단
  커버 흐름, 원형 재생 컨트롤과 회색 분석·목록 패널 디자인에 맞췄다.

## 검증 경계

- backend pytest 39개와 ruff·pip check·
  `python -m compileall -q src/media_analysis_service tests`가 통과했다.
- frontend test 80개와 ESLint·Prettier·`git diff --check`가 통과했다.
- Lab에서 목록의 localStorage 복원, 실제 1곡 분석 완료, BPM·confidence·드럼 구간 표시와 수동
  시작 5초 저장·새로고침 복원을 확인했다. 콘솔 오류는 없었다.
- 인앱 브라우저에서 테스트 영상의 YouTube iframe 재생이 거부돼 실제 재생과 두 곡 청각 품질
  QA는 별도 사용자 브라우저 검증으로 남긴다.
- 메인 노동요 빈 상태와 Lab을 같은 1280×720 viewport에서 비교했고 Design QA를 통과했다.

## Git

- 현재 완료 변경은 사용자 요청에 따라 `main` 커밋·푸시 대상으로 검증했다.
