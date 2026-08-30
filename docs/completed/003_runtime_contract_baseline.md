# 003. 저장·초기화 계약 기준선

## 해결한 문제

- 저장 변환과 Drive 분할·병합이 같은 의미를 유지하는지 자동 검증하는 fixture가 없었다.
- 공개 `window.*`, 로그인 전후 초기화 순서와 탭별 회귀 기준이 한곳에 정리되지 않았다.
- 숨김 탭과 사용자 정의 메인 탭의 Firebase·Drive 호환 위치가 명시되지 않았다.

## 실제 구현

- `tests/appDataTransforms.test.js`에 저장 직렬화, Firebase 원본·Drive fixture 의미 동등성, 전체 왕복 적용 테스트를 추가했다.
- timestamp 재생성, 메모 탭 정규화, 임시 이미지·Blob URL·재생 세션 제외를 명시적으로 검증했다.
- `hiddenMainTabs`와 `mainCustomTabs`가 단일 데이터의 state와 Drive calendar part에 보존되는 계약을 검증했다.
- `docs/architecture/runtime-contracts.md`에 초기화 순서, 공개 전역 추적표와 탭별 최소 회귀 체크리스트를 기록했다.

## 중요한 판단

- 실제 Firebase·Drive SDK를 호출하지 않고 저장 변환 fixture 범위만 자동 검증했다.
- `updatedAt`은 생성 시점 값이므로 완전 동일성에서 제외했다.
- 노동요 셔플 순서와 재생 여부는 세션 상태이며, 저장된 셔플 모드도 적용 시 순차 모드로 초기화되는 현재 동작을 보존했다.
- 기능 JavaScript의 동작과 저장 스키마는 변경하지 않았다.

## 검증

- `npm test`: 결과는 Recent Task에 기록
- `npm run lint`: 결과는 Recent Task에 기록
- `npm run format:check`: 결과는 Recent Task에 기록
- `git diff --check`: 결과는 Recent Task에 기록

## 미검증

- 실제 Firebase 로그인·Firestore 읽기/쓰기
- 실제 Google Drive JSON 읽기/쓰기
- 브라우저 탭별 수동 회귀와 파일 선택·YouTube 재생

위 항목은 해당 외부 연결 및 탭 Sprint에서 별도로 검증한다.
