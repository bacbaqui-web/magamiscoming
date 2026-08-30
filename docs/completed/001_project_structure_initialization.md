# 001. 프로젝트 문서 구조 초기화

## 해결한 문제

- 프로젝트에 영구 계약, 현재 코드 지도, 다음·현재 Sprint와 완료 기록을 구분하는 문서 체계가 없었다.
- 노동요 DJ 계획과 현재 구조 개편 보고가 루트 `current_task.md`에 함께 쌓여 있었다.

## 시작 계획

- `00_project_starter`의 문서 골격을 적용한다.
- 마감이즈커밍 실제 코드와 저장 경계를 문서화한다.
- DJ 계획을 별도 보류 문서로 옮긴다.
- 애플리케이션 코드는 변경하지 않는다.

## 실제 작업

- 루트 `AGENTS.md` 교체
- 프로젝트 Constitution, Architecture, Source Map, Next·Current Sprint와 Recent Task 생성
- DJ 계획 분리
- 다음 App Shell 리팩토링 Sprint 준비

## 중요한 판단

- 기존 프로젝트 AGENTS의 완료 보고 요구는 `current_task.md` 호환 보고서로 계속 충족한다.
- 자동 분석·DJ는 현재 구현 계약이 아니므로 Architecture가 아닌 보류 계획에 둔다.
- 코드 리팩토링은 문서 구조 도입과 분리했다.

## 검증

- Task 종료 시 실행한 검사 결과는 `../99_recent_task.md`와 루트 `current_task.md`에 기록한다.

## 남은 내용

- 전체 코드 리팩토링
- 리팩토링 완료 후 노동요 분석·DJ 계획 재검토
