# 004. AppComposer와 초기화 순서

## 해결한 문제

- `bootstrap.js`가 App Shell, 기능 모듈과 Cloud Sync 조립을 직접 담당했다.
- 인증 준비 상태와 로그인 후 데이터 로드 시작에 독립적인 앱 진입점이 없었다.
- 초기화 위치를 옮길 때 기존 기능 순서를 보호하는 자동 테스트가 없었다.

## 실제 구현

- `src/app/appComposer.js`가 App Shell, AppAuthController, Cloud Sync와 기존 기능 초기화를 순서대로 연결한다.
- `src/app/bootstrap.js`는 App State 기본값을 준비하고 AppComposer를 실행하는 역할만 남겼다.
- `src/app/appAuthController.js`가 인증 준비 상태, 현재 사용자와 로그인 후 데이터 로드 시작을 소유한다.
- Cloud Sync는 인증 준비 상태를 AppAuthController에 기록하고 기존 `window.isAuthReady` 호환 값도 유지한다.
- 달력 → 메모 → 북마크 → 노동요 → 포모도로 → CLIP 뷰어 → Main Tabs 초기화 순서를 테스트로 고정했다.

## 보존한 계약

- Firebase, Google Drive와 YouTube 내부 구현은 변경하지 않았다.
- 기존 DOM ID, 저장 스키마와 공개 `window.*`를 제거하지 않았다.
- 로그인 후 달력 우선 적용과 나머지 기능 데이터의 백그라운드 지연 로드를 유지했다.
- 아직 Engine으로 전환되지 않은 기능은 기존 초기화 함수를 Compatibility 연결로 사용한다.

## 검증

- 자동 테스트 9개 통과
- ESLint 통과
- Prettier 형식 검사 통과
- `git diff --check` 통과
- 로컬 브라우저에서 최초 달력 표시와 달력 → 메모 → 노동요 → 달력 전환 확인
- 브라우저 콘솔 오류 없음

## 미검증

- 실제 Google/Firebase 로그인과 로그아웃
- 실제 Firebase와 Google Drive 데이터 읽기·쓰기
- 파일 선택과 실제 YouTube 재생

외부 서비스 검증은 해당 연결 Sprint에서 별도로 수행한다.
