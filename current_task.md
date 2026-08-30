# 현재 작업 보고

## 요청

로컬 Media Analysis API와 마감이즈커밍 노동요 화면을 안전한 경계로 연결하고, 분석 결과를
표시·수정·저장할 수 있게 한다.

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

## 검증 경계

- backend pytest 39개와 ruff·pip check·
  `python -m compileall -q src/media_analysis_service tests`가 통과했다.
- frontend test 76개와 ESLint·Prettier·`git diff --check`가 통과했다.
- 로컬 브라우저에서 빈 노동요 탭의 분석 상태 `곡 없음`, 분석 버튼 비활성,
  `APP_CONFIG.mediaAnalysis.apiBaseUrl` 로컬 활성화와 콘솔 오류 없음을 확인했다.
- 실제 Firebase 저장, YouTube 재생과 청각 품질 QA는 별도 수동 검증으로 남긴다.

## Git

- 현재 완료 변경은 사용자 요청에 따라 `main` 커밋·푸시 대상으로 검증했다.
