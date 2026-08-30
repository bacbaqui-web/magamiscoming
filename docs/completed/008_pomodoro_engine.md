# 008. 뽀모도로 기준 구조

## 해결한 문제

- 기존 `pomodoro.js` 한 파일이 상태, 단계 전환, DOM 렌더, 이벤트, 저장 지연과 완료 알림음을 함께 맡았다.
- 뽀모도로 상태를 `window.__pomodoroState`와 내부 지역 상태가 함께 표현해 실제 소유권이 불명확했다.

## 실제 구현

- PomodoroEngine을 모드, 실행 상태, 시간, 완료 횟수, 설정과 전환 규칙의 단일 소유자로 만들었다.
- Composer에는 기존 DOM 렌더와 이벤트 연결, Controller에는 사용자 동작·저장·완료 효과를 배치했다.
- Helper에는 시간과 날짜, 입력 정규화처럼 입력과 출력으로 끝나는 계산만 분리했다.
- 기존 `pomodoro.js`는 네 구성요소를 조립하는 작은 기능 진입점으로 변경했다.
- AppComposer가 현재 생성된 PomodoroEngine을 탭 Engine 목록으로 반환한다.

## 보존한 계약

- 기존 DOM ID, 버튼 문구, 설정 범위와 저장 스키마를 변경하지 않았다.
- 실행 중 타이머는 `endAt - 현재 시각`으로 진행하고 일시정지 시 남은 시간을 고정한다.
- 집중 완료 횟수와 짧은·긴 휴식 전환 규칙을 유지했다.
- 기존 `window.__pomodoroState`, `window.renderPomodoroUI`, `window.cloudSavePomodoro`를 저장 Compatibility 경계로 유지했다.

## 검증

- 자동 테스트 23개 통과
- 상태 정규화, 시간 표시, 시작·진행·일시정지, 자동 장기 휴식 전환과 실행 중 복원 확인
- Engine Snapshot 외부 변경이 내부 상태를 바꾸지 않는 계약 확인
- ESLint 통과
- Prettier 형식 검사 통과
- `git diff --check` 통과
- 로컬 브라우저에서 시작·진행·일시정지·리셋·모드 전환과 콘솔 오류 없음 확인

## 미검증

- 실제 로그인 상태의 Firebase·Drive 대체 저장과 새로고침 복원
- 실제 타이머 완료 알림음
- 설정 입력 변경의 브라우저 수동 QA
