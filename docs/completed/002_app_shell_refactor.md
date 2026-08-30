# 002. App Shell 리팩토링

## 해결한 문제

- `index.html`이 전체 마크업과 함께 전역 상태 초기화, 공통 알림, 기본 탭 전환과 기능 부트스트랩을 소유했다.
- 앱 시작 책임에 자동 테스트 기준선이 없었다.

## 시작 계획

- 기존 저장 스키마, DOM ID, 공개 `window.*`와 사용자 동작을 유지한다.
- 전역 기본 상태, App Shell UI 조립과 기능 부트스트랩을 책임별 파일로 분리한다.
- 기능, 저장 방식과 화면 디자인은 변경하지 않는다.

## 실제 구현

- `src/app/appState.js`: 전역 기본 상태 초기화
- `src/app/appShell.js`: 알림, 기본 탭 전환, 탭 표시와 공개 호환 계약
- `src/app/bootstrap.js`: App Shell 준비 후 기능·저장 모듈 조립
- `tests/appState.test.js`: 기본값, 기존 값 보존과 정규화 특성 테스트
- `index.html`: 단일 모듈 진입만 유지
- `package.json`: ES 모듈 선언과 `npm test` 추가

## 중요한 판단

- 기능 모듈은 App Shell 준비 후 동적으로 불러 기존 초기화 순서를 보존했다.
- `window.showTab`, 알림과 탭 표시 공개 계약은 기존 사용처가 많아 제거하지 않았다.
- 새로운 의존성 없이 Node 내장 테스트를 사용했다.

## 검증

- `npm test`: 3개 통과
- `npm run lint`: 통과
- `npm run format:check`: 통과
- `git diff --check`: 통과
- 로컬 정적 페이지와 기본 탭 전환 확인
- 콘솔에 새 오류 없음

## 남은 내용

- Cloud Sync 조정 책임 분리
- 기능별 큰 파일 분리
- 실제 Firebase·Drive·YouTube 세션 회귀 QA
