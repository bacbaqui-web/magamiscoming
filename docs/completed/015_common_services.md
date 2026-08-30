# Sprint 13. 전역 계약과 공통 서비스 정리

## 결과

모든 기능 Engine 전환 뒤 남은 공개 전역과 공통 저장 책임을 실제 호출자 기준으로 정리했다. 이 단계는 기능 구조 리팩토링 완료이며 전체 리팩토링 최종 완료는 아니다.

## 변경

- 메모 구형 Cloud 저장 전역과 중복 달력 삭제 경로 제거
- 미사용 세션·노동요 공개 export 제거
- 공통 Persistence, 북마크·노동요 탭 Cloud Handler 분리
- 공개 탭 변경 함수의 Controller 위임
- 순수 저장 변환과 브라우저 Runtime Bridge 분리
- 달력 선로드 Controller hydrate와 로그아웃 공통 초기화 적용
- 공개 전역 유지·제거 계약 문서화

## 보존한 계약

- Firebase·Drive 저장 스키마와 경로
- 로그인 전 쓰기 차단, 저장 큐와 달력 선로드·지연 로드 순서
- DOM ID, 탭 사용자 동작과 외부 SDK 전역
- 북마크 Drive 폴더 이름 동기화와 노동요 저장 호출

## 검증

- 자동 테스트 62개 통과
- ESLint, Prettier, diff 검사 통과
- 로컬 브라우저 초기화와 7개 기본 탭 전환, 콘솔 오류 없음 확인

## 미검증

- 실제 Firebase, Drive와 YouTube 로그인 세션
- Sprint 14~16 스타일 분리와 최종 데스크톱·모바일 시각 회귀
