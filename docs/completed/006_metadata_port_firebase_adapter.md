# 006. 메타데이터 Port와 Firebase Adapter

## 해결한 문제

- Cloud Sync가 Firebase 메타데이터 구현을 직접 생성하고 읽기·쓰기를 호출했다.
- 메타데이터 호출 경계에서 AppAuthController의 현재 사용자 상태를 명시적으로 확인하지 않았다.

## 실제 구현

- 실제 호출에 필요한 `isActive`, `assertReady`, `loadAppParts`, `saveAppParts`만 Metadata Port 계약으로 정의했다.
- Metadata Port는 AppAuthController에 현재 사용자가 있을 때만 Adapter 읽기·쓰기를 호출한다.
- 기존 Firebase 저장소를 Firebase Metadata Adapter로 사용하고 SDK 동적 import와 Firestore 호출을 내부에 유지했다.
- AppComposer가 Firebase Adapter와 Metadata Port 생성자를 선택해 Cloud Sync에 주입한다.
- 인증 실행은 Firebase Adapter, 현재 사용자와 인증 준비 상태는 AppAuthController에 유지했다.

## 보존한 계약

- `users/{uid}/app/{section}_{id}` 문서 경로를 유지했다.
- `users/{uid}/notesTabs`, `users/{uid}/bookmarks` 컬렉션 경로를 유지했다.
- 달력, 메모, 북마크, 노동요, 포모도로와 CLIP 저장 필드와 분할 방식을 변경하지 않았다.
- Firebase 비활성 시 Google Drive JSON을 사용하는 기존 분기를 변경하지 않았다.
- 공개 `window.*`, DOM ID와 탭 기능을 변경하지 않았다.

## 검증

- 자동 테스트 15개 통과
- 가짜 Adapter로 비로그인 호출 차단과 인증 후 옵션·결과 전달 확인
- 주입한 Firebase 모듈로 기존 Firestore 문서·컬렉션 경로 확인
- ESLint 통과
- Prettier 형식 검사 통과
- `git diff --check` 통과
- 로컬 HTTP에서 앱 진입점과 변경 모듈 응답 200 확인

## 미검증

- 실제 Google/Firebase 로그인과 로그아웃
- 실제 Firestore 읽기·쓰기와 보안 규칙
- 실제 Firebase 비활성 환경의 Google Drive JSON 읽기·쓰기
- 로그인된 브라우저의 저장·새로고침 복원
- 브라우저 UI 탭 전환과 콘솔 회귀
