# Notes

## 목적

메모 탭의 상태 소유권과 화면, 사용자 동작, 저장 순서의 경계를 정의한다.

## 현재 책임

- `notesEngine.js`: 탭 목록, 활성 탭과 탭별 본문의 단일 소유자
- `notesComposer.js`: 기존 DOM ID 조회, 탭·textarea 렌더와 이벤트 연결
- `notesController.js`: 탭 CRUD·전환, 지연·즉시 저장과 txt 백업
- `notesHelper.js`: 탭 정규화, ID·백업 파일명·시각 계산
- `notes.js`: 구성요소를 조립하고 기존 Cloud Sync 호환 계약을 연결하는 진입점

## 불변 조건

- 탭 전환 전에 현재 textarea의 최신 본문을 Engine에 반영하고 즉시 저장을 끝낸다.
- 즉시 저장이 실패하면 활성 탭을 바꾸지 않는다.
- DOM ID, 탭·본문·활성 탭 저장 필드와 Firebase·Drive 저장 의미를 변경하지 않는다.
- Engine이 반환하는 Snapshot은 복사본이며 외부에서 내부 상태를 수정할 수 없다.

## Compatibility 경계

- Controller는 기존 저장 변환을 위해 Engine Snapshot을 `window.__notesTabList`, `window.__notesTabs`, `window.__notesActiveTabId`에 게시한다.
- Cloud Sync가 저장 데이터를 적용한 뒤 `window.renderNotesUI()`를 호출하면 Controller가 Engine을 다시 hydrate한다.
- `window.cloudSaveNotes*`, 탭 CRUD 공개 함수는 기존 호출자를 위해 유지하되 NotesController를 우회해 상태를 수정하지 않는다.

## 맡지 않는 책임

- Engine은 DOM, 파일 다운로드, 타이머, Firebase·Drive SDK와 저장소 선택을 소유하지 않는다.
- Composer는 메모 상태와 탭 변경 규칙을 소유하지 않는다.
- Controller는 저장 스키마, 인증 Lifecycle과 Firebase·Drive 중 어느 저장소를 쓸지 결정하지 않는다.
