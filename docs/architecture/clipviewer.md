# CLIP Viewer

## 책임 구조

- `ClipViewerEngine`: 선택된 소스 파일, CMC 정렬 결과, 추출된 로컬 미리보기, 저장 가능한 manifest와 동기화 상태를 소유한다.
- `ClipViewerComposer`: 기존 CLIP DOM을 렌더하고 폴더 입력, 새로고침, 비우기와 드롭 이벤트를 조립한다.
- `ClipViewerController`: 파일 로드, 미리보기 추출, 자동 Drive 업로드와 모바일 Drive 로드 순서를 조정한다.
- `clipViewerHelper.js`: CMC CanvasNode 연결 순서, 경로 정규화, 누락 판정과 자연 정렬만 계산한다.
- `clipViewerBrowserAdapter.js`: DirectoryEntry, SQL.js, Blob URL과 브라우저 yield를 실행한다.

## 상태와 저장 경계

- `File`, `Blob`, `blob:` URL과 선택 폴더 정보는 브라우저 세션에만 존재한다.
- 저장 manifest에는 기존과 같이 `index`, `name`, `fileId`, `mimeType`만 둔다.
- Engine의 Snapshot과 manifest는 복사본으로 제공하며 외부가 Engine 상태를 직접 수정하지 않는다.
- Firebase·Drive 메타데이터 필드 `state.clipPages`와 Drive `클립뷰어/current` 파일 규칙은 변경하지 않는다.

## CMC 정렬 계약

- `Project.ProjectRootCanvasNode`가 가리키는 root에서 `FirstChildIndex`로 첫 페이지를 찾는다.
- 각 페이지는 `CanvasNode.NextIndex` 연결 순서로 순회하고 순환 연결은 한 번만 방문한다.
- CMC와 CLIP 경로는 슬래시, 상대 경로, Unicode NFC와 대소문자를 정규화해 비교한다.
- CMC가 가리킨 파일이 없으면 해당 경로를 누락으로 세되 화면 목록에서는 건너뛴다.
- 유효한 CMC 순서를 얻지 못하면 기존과 같이 전체 `.clip` 파일을 자연 정렬한다.

## 외부 기능과 호환

- AppComposer가 Browser Adapter를, Cloud Sync가 Drive 기능을 CLIP 진입점에 주입한다.
- `clearClipLocal`, `setClipStatus`, `showClipMessage`, `loadClipPagesFromDrive`는 Cloud Sync 순차 전환을 위한 호환 계약으로 유지한다.
- 실제 폴더 선택, SQL.js 실행, Drive 업로드·다운로드는 Engine이나 Helper가 직접 호출하지 않는다.

## 검증 경계

- 순수 정렬과 Engine 소유권은 Node 자동 테스트로 검증한다.
- 실제 `.cmc/.clip` 미리보기 추출, 브라우저 폴더 권한과 Google Drive 동기화는 실제 파일·로그인 세션의 수동 QA가 필요하다.
