# Architecture

- `app-shell.md`: 앱 진입과 공통 탭 Shell
- `cloud-storage.md`: Firebase·Drive 저장 소유권
- `common-services.md`: 저장 Runtime Bridge와 공통 저장 공개 계약
- `runtime-contracts.md`: 저장 의미 동등성, 초기화 순서, 공개 전역과 회귀 기준
- `pomodoro.md`: 뽀모도로 Engine, 화면, 동작과 호환 저장 경계
- `notes.md`: 메모 Engine, 탭·본문, 저장 순서와 호환 경계
- `profile-main-tabs.md`: 프로필 표시와 기본·사용자 정의 탭 설정 소유권
- `clipviewer.md`: CLIP 페이지 상태, CMC 정렬과 브라우저·Drive 경계
- `bookmarks.md`: 북마크 탭·항목 상태, DOM·저장·Drive 경계
- `styles.md`: 기능별 CSS 소유권과 cascade 보존 계약

이 폴더는 마감이즈커밍의 기능과 구조가 지속적으로 지켜야 할 계약을 기록한다.

- `app-shell.md`: 앱 진입점, 초기화 순서와 기능 조립
- `cloud-storage.md`: Firebase·Google Drive 데이터 소유권과 저장 Lifecycle
- `workmusic.md`: 현재 노동요 목록·재생·이어듣기 계약

현재 코드 위치는 `../96_src_map.md`, 진행 중인 작업은 `../98_sprint_plan.md`를 기준으로 한다. 미구현 계획과 완료 기록은 이 폴더에 넣지 않는다.
