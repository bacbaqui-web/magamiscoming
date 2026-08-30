# Sprint 8. 프로필과 MainTabsEngine

## 결과

- MainTabsEngine을 숨김 기본 탭과 사용자 정의 탭 설정의 단일 진입점으로 만들었다.
- ProfileEngine이 AppAuthController 사용자 정보 표시와 MainTabsEngine 편집 요청만 담당하도록 분리했다.
- App Shell의 표시·전환, AppAuthController의 인증 Lifecycle과 Cloud Sync의 SDK 실행 책임을 유지했다.
- `hiddenMainTabs`, `mainCustomTabs`, 기존 DOM ID와 공개 호환 계약을 보존했다.

## 검증

- 자동 테스트 30개 통과
- ESLint, Prettier와 diff 검사 통과
- 로컬 브라우저에서 프로필 진입, 메모 탭 숨김·복원, 커스텀 탭 추가·수정과 콘솔 오류 없음을 확인
- 커스텀 탭 삭제는 Engine 자동 테스트로 확인

## 미검증

- 실제 Google 로그인, Firebase·Drive 저장과 새로고침 복원은 외부 로그인 세션 제약으로 검증하지 않았다.
