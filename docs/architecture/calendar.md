# 달력 Engine

## 책임

- `CalendarEngine`은 작업 목록, 완료 상태, 보기 방식, 주 시작일과 기준 주·월의 단일 소유자이다.
- `calendarComposer.js`는 주간·월간 달력, 작업·설정 모달과 휠·키보드 제스처 DOM을 조립한다.
- `CalendarController`는 작업 CRUD·완료 변경, 보기 이동과 설정 변경을 Engine에 요청하고 기존 저장 상태를 게시한다.
- `calendarHelper.js`는 KST 날짜, 주·월 범위, 기간·반복 작업 발생과 반복 횟수를 계산한다.

## 저장과 초기화

- `customTasks`, `taskStatus`, `__calendarViewMode` 저장 필드와 작업 객체 스키마는 기존 계약을 유지한다.
- 주 시작일은 기존 `magamiscoming-calendar-week-start` localStorage 키를 유지한다.
- 달력 선로드 후 나머지 앱 데이터를 지연 로드하는 순서는 `cloudSyncBackend.js`에 그대로 유지한다.
- Compatibility 렌더는 저장 적용 전역을 CalendarEngine에 hydrate한 뒤 달력 Composer만 다시 그린다.
- Firebase·Drive와 인증 SDK는 CalendarEngine이 호출하거나 소유하지 않는다.

## 공개 Compatibility

- `customTasks`, `taskStatus`, `__calendarViewMode`는 저장 호환을 위해 Controller Snapshot으로 계속 게시한다.
- `renderCalendar`, `openCalendarSettings`, `openTaskModal`, `closeTaskModal`, `deleteTask`는 기존 호출자를 위해 유지한다.
- Cloud State Handler의 `deleteTask`는 정상 AppComposer 초기화에서 CalendarController를 통해서만 작업을 삭제한다.
- 공개 전역의 최종 제거 여부는 Sprint 13에서 호출자를 다시 확인한 뒤 결정한다.
