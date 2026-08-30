# Sprint 7. 메모 Engine 완료

## 결과

- 메모 상태를 NotesEngine, DOM을 NotesComposer, 탭 CRUD·저장·백업을 NotesController, 순수 계산을 NotesHelper로 분리했다.
- NotesEngine 외부에서 복사된 Snapshot을 수정해도 내부 상태가 바뀐지 않는다.
- 빠른 입력 후 탭 전환 시 기존 탭을 즉시 저장한 뒤 활성 탭을 바꾸도록 순서를 고정했다.
- 기존 저장·렌더 공개 함수는 NotesController를 우회하지 않는 Compatibility 경계로 유지했다.

## 검증

- `npm test`: 26개 통과
- `npm run lint`: 통과
- `npm run format:check`: 통과
- `git diff --check`: 통과
- 로컬 브라우저: 메모 탭 진입, 새 탭 생성, 본문 입력 후 탭 왕복과 본문 보존, 콘솔 오류 없음 확인

## 미검증

- 로그인한 실제 Firebase·Drive 저장과 새로고침 복원
- 실제 txt 파일 다운로드 내용 확인

## Git

- 커밋: 하지 않음
- 푸시: 하지 않음
