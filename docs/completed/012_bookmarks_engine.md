# Sprint 10 북마크 Engine

## 결과

북마크 탭과 항목 상태를 Engine 한 곳으로 모으고 DOM, 저장 연결, URL 계산과 Drive 실행을 분리했다. 기존 저장 스키마, UI와 공개 전역 계약은 유지했다.

## 구현

- BookmarksEngine이 탭·항목·활성 탭과 정렬·이동·편집 규칙을 소유한다.
- Composer가 기존 탭·카드·모달·드래그·붙여넣기 DOM을 유지한다.
- Controller가 Engine Snapshot을 기존 전역 저장 상태에 게시하고 저장을 예약한다.
- Helper가 이미지·영상·일반 URL 분류, 도메인과 YouTube 미리보기를 계산한다.
- Cloud State와 Drive Handler가 정상 초기화 경로에서 Controller를 통해 상태를 변경한다.
- Drive 업로드, Instagram SDK와 Blob URL 해제는 Engine 외부에 유지했다.

## 검증

- `npm test`: 41개 통과
- `npm run lint`: 통과
- `npm run format:check`: 통과
- `git diff --check`: 통과
- 로컬 브라우저: 신규 콘솔 오류 없이 북마크 탭 전환, 기본 탭과 빈 목록 렌더 확인

## 미검증

- 실제 Google 로그인 후 이미지·미리보기 Drive 업로드, 다운로드와 삭제
- 실제 Instagram Embed SDK 로드와 게시물 표시
- 실제 클립보드 권한과 파일 드래그·붙여넣기

위 항목은 로그인, 외부 SDK와 브라우저 권한이 필요한 수동 QA로 남는다.
