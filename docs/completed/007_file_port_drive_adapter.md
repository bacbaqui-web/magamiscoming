# 007. 파일 Port와 Drive Adapter

## 해결한 문제

- Cloud Sync가 Drive 파일 구현을 직접 생성하고 호출했다.
- 파일 호출 규격과 업로드 진행 표시·Blob URL Lifecycle의 책임 경계가 문서와 코드에서 명시적이지 않았다.

## 실제 구현

- 기존 Cloud Sync, 북마크와 CLIP 뷰어가 사용하는 Drive 파일·폴더 호출만 File Port 계약으로 정의했다.
- 기존 `driveFiles.js`를 Drive File Adapter로 사용하고 Drive REST API 호출을 내부에 유지했다.
- AppComposer가 Drive File Adapter와 File Port 생성자를 선택해 Cloud Sync에 주입한다.
- 기존 북마크·CLIP 호출은 File Port를 거치는 Compatibility 연결로 유지했다.
- 업로드 진행 상태는 `driveStatus.js`, Blob URL 생성·해제는 `driveImageUrls.js`와 기존 기능 모듈에 유지했다.

## 보존한 계약

- `magamiscoming`, `system`, `메모`, `북마크`, `클립뷰어`, `current` 폴더 이름을 유지했다.
- 기존 JSON·텍스트 파일 이름과 Firebase 비활성 Drive fallback을 변경하지 않았다.
- 인증 토큰과 401 만료 복구는 기존 Cloud Sync `driveFetch` 흐름에 유지했다.
- 공개 `window.*`, 북마크와 CLIP Compatibility 호출, DOM ID와 저장 스키마를 변경하지 않았다.

## 검증

- 자동 테스트 18개 통과
- 가짜 Adapter로 File Port의 검색·업로드·다운로드·삭제 인수와 결과 전달 확인
- File Port가 업로드 상태와 Blob URL API를 제공하지 않는 경계 확인
- 가짜 Drive 응답으로 기존 폴더 트리 이름과 캐시 확인
- 업로드·다운로드·삭제 REST 요청 경로와 HTTP method 확인
- ESLint 통과
- Prettier 형식 검사 통과
- `git diff --check` 통과
- 변경 JavaScript `node --check` 통과
- 로컬 HTTP에서 앱 진입점, File Port와 AppComposer 응답 200 확인

## 미검증

- 실제 Google Drive 로그인과 로그아웃
- 실제 Drive 폴더 생성, 검색, 업로드, 다운로드와 삭제
- 실제 401 인증 만료와 자동 로그인 복구
- Firebase 비활성 환경의 Drive JSON 저장·복원
- 로그인된 브라우저의 북마크·CLIP 파일 동작
