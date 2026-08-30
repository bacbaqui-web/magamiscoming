# Pomodoro

## 목적

뽀모도로 탭의 상태 소유권과 화면·동작·순수 계산의 경계를 정의한다.

## 현재 책임

- `pomodoroEngine.js`: 모드, 실행 상태, 남은 시간, 완료 횟수, 설정과 단계 전환 규칙의 단일 소유자
- `pomodoroComposer.js`: 기존 DOM ID 조회, 화면 렌더와 사용자 이벤트 연결
- `pomodoroController.js`: 시작·일시정지·리셋·다음 단계·설정 저장, 완료 알림음과 기존 Cloud Save 연결
- `pomodoroHelper.js`: 시간 표시·변환, KST 날짜, 설정과 저장 상태 정규화
- `pomodoro.js`: 위 구성요소를 조립하고 기존 공개 렌더 계약을 연결하는 기능 진입점

## 불변 조건

- 타이머 실행 중 남은 시간은 저장된 `endAt`과 현재 시각의 차이로 계산한다.
- 집중 완료 후 완료 횟수를 올리고 설정된 주기에 따라 짧은 휴식 또는 긴 휴식으로 이동한다.
- 휴식 완료 후 집중 모드로 이동한다.
- 날짜가 바뀌면 `completedToday`만 0으로 초기화하고 누적 집중 횟수는 보존한다.
- 설정 범위, DOM ID와 저장 스키마를 변경하지 않는다.
- Engine이 반환하는 상태는 복사본이며 외부에서 내부 상태를 직접 수정할 수 없다.

## Compatibility 경계

- `window.__pomodoroState`는 기존 저장 변환과 Cloud Sync가 사용하는 저장 Snapshot으로 유지한다.
- 저장 적용부가 `window.__pomodoroState`를 교체한 뒤 `window.renderPomodoroUI()`를 호출하면 Controller가 Engine을 다시 hydrate한다.
- Controller는 상태 변경 후 Snapshot을 게시하고 기존 `window.cloudSavePomodoro()`를 지연 호출한다.
- 이 전역 계약의 최종 제거 여부는 Sprint 13에서 실제 사용처를 다시 확인한다.

## 맡지 않는 책임

- Engine은 DOM, 오디오 출력, Firebase·Drive SDK와 저장소 선택을 소유하지 않는다.
- Composer는 타이머 상태와 단계 전환 규칙을 소유하지 않는다.
- Controller는 저장 스키마나 Cloud Sync 인증 Lifecycle을 소유하지 않는다.
