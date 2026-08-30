# 북마크 Engine

## 책임

- `BookmarksEngine`은 탭 목록, 활성 탭, 북마크 항목과 정렬·이동·편집 규칙의 단일 소유자이다.
- `bookmarksComposer.js`는 탭·카드·모달·드래그·붙여넣기 DOM과 Instagram 표시를 조립한다.
- `BookmarksController`는 Engine 변경을 기존 저장 상태에 게시하고 저장을 예약한다.
- `bookmarksHelper.js`는 URL 종류, 도메인, 안전하게 열 수 있는 URL과 YouTube 미리보기를 계산한다.
- `bookmarkDriveHandlers.js`는 Drive 이미지·미리보기 업로드와 삭제, Blob URL 생성을 실행한다.

## 저장과 외부 실행

- 저장 필드, `local_pending_image` 제외 규칙과 Drive 폴더·파일 이름은 기존 계약을 유지한다.
- Drive Handler와 Cloud State Handler는 `__bookmarksControllerCompatibility`가 있으면 Controller를 통해서만 Engine 상태를 바꾼다.
- 이전 초기화 순서를 위한 Handler fallback은 유지하지만 정상 AppComposer 실행에서는 사용하지 않는다.
- Instagram SDK 로드·렌더와 Drive API 호출은 Engine에 들어가지 않는다.
- Drive 파일 삭제 시 기존 `revokeDriveImageUrl` 호출로 파일·미리보기 Blob URL을 해제한다.

## 공개 Compatibility

- Cloud Sync가 사용하는 `imageBookmarks`, `__bookmarkTabList`, `__bookmarkActiveTabId`는 Controller Snapshot으로 계속 게시한다.
- `renderImageBookmarks`, `renderBookmarkTabsUI`, 북마크 CRUD·탭 CRUD와 `extractDomain` 전역은 기존 호출자를 위해 유지한다.
- `CompatibilityFeatures.renderBookmarks()`는 저장 적용 값을 Engine에 hydrate한 뒤 해당 Composer만 렌더링한다.
- 공개 전역의 최종 제거 여부는 Sprint 13에서 호출자를 다시 확인한 뒤 결정한다.
