# Sprint 9 CLIP 뷰어 Engine

## 결과

CLIP 뷰어의 상태, DOM, 사용자 흐름, 순수 정렬과 브라우저 실행을 분리했다. 기존 UI, manifest와 Cloud Sync 공개 호환 계약은 유지했다.

## 구현

- ClipViewerEngine이 소스 파일, 정렬 결과, 로컬 페이지, 저장 manifest와 동기화 상태를 소유한다.
- Composer가 기존 DOM과 폴더 선택·드롭 이벤트를 조립한다.
- Controller가 미리보기 추출, Drive 자동 업로드와 모바일 다운로드 순서를 처리한다.
- Helper가 CanvasNode 연결 순서, 경로 정규화, 누락 파일과 자연 정렬 fallback을 계산한다.
- Browser Adapter가 DirectoryEntry, SQL.js와 Blob URL을 실행하고 AppComposer가 이를 주입한다.
- Cloud Sync가 호출하는 네 공개 `window.*` 함수는 Controller Compatibility로 유지한다.

## 검증

- `npm test`: 36개 통과
- `npm run lint`: 통과
- `npm run format:check`: 통과
- `git diff --check`: 통과
- 로컬 브라우저: 앱 로드, CLIP 탭 전환, PC 빈 화면 문구와 신규 콘솔 오류 없음 확인

## 미검증

- 실제 `.cmc/.clip` 폴더 선택과 미리보기 추출
- 실제 폴더 드롭
- Google 로그인 후 Drive 업로드와 모바일 다운로드

위 항목은 실제 사용자 파일과 로그인 세션이 필요한 수동 QA로 남는다.
