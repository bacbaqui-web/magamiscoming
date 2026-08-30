# Styles

## 목적

기능별 CSS 소유권과 리팩토링 중 시각 결과를 보존하는 규칙을 정의한다.

## 현재 책임

- `styles/profile-main-tabs.css`: 프로필 카드·설정, 사용자 정의 탭 모달과 iframe 화면
- `styles/pomodoro.css`: 뽀모도로 타이머·설정과 모바일 반응형 규칙
- `styles/notes.css`: 메모 내부 탭·편집 영역과 textarea 스크롤바
- `styles/bookmarks.css`: 북마크 내부 탭·Masonry 목록·이미지/제목 모달과 전용 반응형 규칙
- `styles/calendar.css`: 날짜 없는 할 일, 주간·월간 달력, 공휴일·기간/반복 작업·설정 모달과 제스처 상태
- `styles/clipviewer.css`: CLIP 툴바·빈 상태·파일 드래그 표시와 모바일 전용 규칙
- `styles/app.css`: App Shell, 공통 메인·내부 탭, 알림·모달, footer, Drive 저장 표시와 전역 반응형 규칙
- `styles/workmusic.css`: 노동요 목록·내부 탭·커버 흐름·플레이어·진행 표시·컨트롤·리모컨과 반응형 규칙

## 불변 조건

- 기능 스타일을 이동할 때 선택자, 선언 값, 선언 내부 순서와 미디어 조건을 바꾸지 않는다.
- `index.html`의 stylesheet 순서는 기존 cascade 결과가 유지되도록 관리한다.
- 실제 여러 기능이 함께 쓰는 규칙은 단일 기능 파일로 임의 이동하지 않는다.
- 사용하지 않는 선택자 제거와 디자인 변경은 스타일 소유권 분리와 섞지 않는다.

## 현재 로드 순서

1. `styles/app.css`
2. `styles/workmusic.css`
3. `styles/profile-main-tabs.css`
4. `styles/pomodoro.css`
5. `styles/notes.css`
6. `styles/bookmarks.css`
7. `styles/calendar.css`
8. `styles/clipviewer.css`

`styles.css`는 남은 선언 없이 제거했다. App 공통 규칙을 먼저 로드하고 노동요와 다른 기능 파일을 뒤에 로드한다. 기능 파일은 각 기능 안의 선택자·선언·미디어 규칙 상대 순서를 유지하며, 공용 내부 탭·모달·드래그 영역은 `styles/app.css`만 소유한다.
