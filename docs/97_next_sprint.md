# Next Sprint

## 우선 후속 과제: Mac 없이 Oracle URL 분석

- Mac 로컬 분석 경로 검증 후 진행한다. Oracle의 정상 로그인·10분 제한·단일 큐는 유지한다.
- 현재 접근 제한이 있었던 두 곡 및 다양한 곡으로 서버 측 다운로드 성공 여부를 검증한다.
- 공식 지원 실행 환경 보완만으로 실패하는 경우, 추가 인증이나 제공 방식 변경은 별도 결정한다.
- 사용자 쿠키를 임의로 복사하거나 프록시로 제한을 우회하지 않는다. 한 곡 성공으로 전체 지원을 선언하지 않는다.

## 상태

전체 구조 리팩토링 Sprint 1~16을 완료했다. 남은 구조 리팩토링 Sprint는 0개다.

완료 결과는 `docs/completed/003_runtime_contract_baseline.md`부터 `docs/completed/018_workmusic_app_styles_refactor_complete.md`까지 보존하며, 현재 실제 구조는 `docs/96_src_map.md`와 `docs/architecture/`를 기준으로 한다.

## 완료 결과 요약

- AppComposer가 App Shell, 인증, Port·Adapter와 7개 기본 탭을 조립한다.
- 모든 기본 탭은 Engine 진입점을 가지며 Composer·Controller·Helper 책임이 분리됐다.
- Firebase·Drive·YouTube 호출은 Metadata·File·YouTube Port와 실제 Adapter 경계를 통과한다.
- 저장 Runtime, 공통 Persistence와 북마크·노동요 Cloud Handler 책임이 분리됐다.
- App 공통 및 기능별 CSS는 `styles/` 아래 8개 소유권 파일로 분리됐고 `styles.css`는 제거됐다.
- 자동 테스트 62개, ESLint, Prettier, diff 검사와 로컬 데스크톱·모바일 UI 검증을 통과했다.
- 실제 Firebase·Drive·YouTube 세션과 CLIP 파일·이어듣기 청각 QA는 미검증 상태로 남겼다.

## 승인된 계획

- 미디어 분석·DJ 기능은 구조 리팩토링과 분리된 Sprint 17로 승인됐다.
- 상세 구현 계획은 `docs/plans/workmusic_dj.md`, 현재 실행 범위는
  `docs/98_sprint_plan.md`를 기준으로 한다.
- 해당 계획은 Apple Silicon Mac에서 범용 `media-analysis-service`를 먼저 구현하고, 새 A1
  서버 생성 후 동일 코드를 Ubuntu ARM64에 배포하는 순서다.
- 기존 E2 서버와 기존 서비스 이전은 범위에서 제외한다.
- Sprint 17 로컬 구현은 완료했고, 오라클 A1 배포는 인스턴스 가용 용량 확보 후 진행한다.
- 메인 앱 통합 전 기능 검증을 위한 `workmusic-lab.html`을 완료했다. Lab의 실제 청각 QA와
  분석 정확도 기준이 확인되기 전에는 새 자동 재생 동작을 메인 앱에 추가하지 않는다.
- 실제 재생은 저장된 수동 분석 pair만 사용하며 detected 기반 자동 전환은 후속 후보로 남긴다.
- 전곡 batch 분석 기반은 완료했다. 다음 승인 후보는 키·음량·에너지·보컬·곡 구조 분석 확장과
  이를 이용한 DJ 후보 점수 계산이며, 자동 재생 연결 전에 분석 정확도·confidence·청각 QA를
  먼저 완료한다.
- 구현 중 새 후보가 생기면 현재 Sprint에 섞지 않고 이 문서의 별도 보류 항목으로 기록한다.

## 진행 규칙

- 기능, DOM ID, 저장 스키마와 사용자 데이터 계약을 먼저 확인한다.
- 구조 변경과 신규 기능 구현을 같은 Sprint에 섞지 않는다.
- 실행하지 못한 Firebase, Drive, 파일 선택과 YouTube 실세션 QA는 미검증으로 명시한다.
