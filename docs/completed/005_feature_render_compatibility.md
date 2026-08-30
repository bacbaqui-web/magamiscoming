# 005. 기능 렌더 경계와 호환 계약

## 해결한 문제

- Cloud Sync가 기존 기능 초기화와 공개 전역 렌더 함수 탐색을 함께 담당했다.
- 탭 CRUD가 변경과 무관한 모든 기능 화면을 다시 렌더링했다.
- 저장 변환 함수가 메인 탭 화면 렌더링을 직접 호출했다.

## 실제 구현

- AppComposer가 `compatibilityFeatures.js`를 생성해 Cloud Sync에 명시적으로 주입한다.
- Compatibility 인터페이스가 기존 기능 초기화 순서와 탭별 렌더 호출을 한곳에서 관리한다.
- Cloud Sync는 CLIP 연결 옵션만 반환하고 AppComposer가 모든 기존 기능을 초기화한다.
- Cloud State와 북마크 Drive Handler에는 영향받은 탭 렌더 함수만 주입한다.
- 전체 데이터 로드와 로그아웃은 전체 렌더를 유지하고 탭 CRUD는 해당 탭만 렌더한다.
- 저장 변환은 데이터 적용만 수행하고 화면을 직접 렌더링하지 않는다.
- CLIP 연결은 기존 `renderEverything` 옵션명을 유지해 모바일 새로고침 경로의 호환성을 보존한다.

## 보존한 계약

- 달력 → 메모 → 북마크 → 노동요 → 포모도로 → CLIP 뷰어 → Main Tabs 초기화 순서를 유지했다.
- 공개 `window.*`, DOM ID와 저장 스키마를 제거하거나 변경하지 않았다.
- 아직 존재하지 않는 TabEngine을 만들지 않았고 Sprint 6~12에서 교체할 인터페이스만 추가했다.

## 검증

- 자동 테스트 12개 통과
- ESLint 통과
- Prettier 형식 검사 통과
- `git diff --check` 통과
- 로컬 브라우저에서 최초 달력 표시와 메모·북마크·노동요·달력 전환 확인
- 브라우저 콘솔 오류 없음

## 미검증

- 실제 Google/Firebase 로그인과 로그아웃
- 실제 Firebase와 Google Drive 데이터 읽기·쓰기
- 로그인된 브라우저의 탭 CRUD
- 파일 선택과 실제 YouTube 재생
