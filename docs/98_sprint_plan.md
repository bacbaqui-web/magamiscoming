# Current Sprint

## 상태

Sprint 17의 Apple Silicon 로컬 구현과 마감이즈커밍 연결을 완료했다. 분석 서비스, 실제
1곡 검증, 분석 편집 UI와 수동 pair 기반 이어듣기 시점까지 구현했다. 오라클 A1 배포는
인스턴스 가용 용량 확보 전까지 대기한다. 메인 앱과 독립된 localStorage 기반 노동요 Lab도
완료해 OAuth·Firebase 없이 실제 분석과 보정 흐름을 먼저 검증할 수 있다.

## Sprint 17 목표

- `/Users/bacbaqui/Desktop/code/media-analysis-service`에 범용 분석 API를 구축한다.
- 작업 상태·단일 큐, yt-dlp·FFmpeg 경계와 BPM·비트·드럼 분석을 구현한다.
- 실제 1곡과 고정 fixture로 결과·실패·임시 파일 정리를 검증한다.
- 마감이즈커밍에 환경별 API Client, 분석 상태와 편집 가능한 곡 지도를 연결한다.
- 분석 실패와 서버 부재가 기존 YouTube 재생을 막지 않게 한다.
- 기존 E2 서버와 기존 서비스를 수정하거나 이전하지 않는다.

## Task 순서

1. 완료: 로컬 서비스 기반·health check
2. 완료: 작업 계약·단일 큐·상태 저장·취소
3. 완료: yt-dlp·FFmpeg Adapter와 분석 알고리즘
4. 완료: 실제 로컬 분석과 임시 파일·실패 검증
5. 완료: 마감이즈커밍 API Client·상태 UI·곡 지도 편집
6. 완료: 로컬 통합 검증·문서·A1 배포 준비
7. 완료: 독립 노동요 Lab·localStorage 저장·실제 1곡 분석과 수동 구간 복원 검증

실제 A1 생성·배포·DNS 전환은 로컬 Task 완료 판정과 별개이며 아직 실행하지 않았다.

각 Task는 동일한 서브 에이전트가 순차 수행하고 루트 에이전트가 diff와 검증 결과를 직접
점검한 뒤 다음 Task로 진행한다.

## 완료 조건

- 로컬 서비스와 마감이즈커밍의 관련 자동 검사가 통과한다.
- API 스키마, 분석기 버전, 자동·수동 데이터와 환경별 주소 경계가 문서화된다.
- macOS ARM64에서 실제 로컬 API와 1곡 분석을 확인한다.
- Ubuntu ARM64 배포 스크립트와 운영 설정은 비밀값 없이 준비한다.
- A1 서버 미생성 시 배포 미실행을 명시하고 기존 재생 fallback을 확인한다.

## 현재 재생 적용 범위

- 두 곡 모두 저장된 수동 드럼 구간이 유효할 때만 수동 계산 시각에 다음 곡을 시작한다.
- crossfade 길이는 기존 fixed seamless 설정을 유지한다.
- 수동값이 없거나 한쪽뿐이거나 범위를 벗어나면 기존 fixed seamless 계산을 그대로 사용한다.
- detected 분석값은 편집 참고용이며 실제 자동 재생에는 아직 사용하지 않는다.

## 이전 Sprint 완료 기록

## 전체 Sprint 종료 결과

- Sprint 1~5: 저장·초기화 계약, AppComposer, 렌더 경계, Metadata·File Port와 Adapter 분리
- Sprint 6~12: 뽀모도로·메모·프로필·MainTabs·CLIP·북마크·달력·노동요 Engine 구조 전환
- Sprint 13: 공개 전역과 공통 저장 서비스 책임 정리
- Sprint 14~16: 작은 탭, CLIP·북마크·달력, 노동요·App 공통 CSS 소유권 분리
- 완료 기록: `docs/completed/003_runtime_contract_baseline.md`~`docs/completed/018_workmusic_app_styles_refactor_complete.md`

## 완료 범위

- 노동요 목록·내부 탭·커버 흐름·플레이어·진행 표시·두 Player 이어듣기·리모컨·반응형 CSS를 `styles/workmusic.css`로 순수 이동
- App Shell·공통 탭·공통 모달·알림·footer·Drive 표시와 전역 반응형 CSS를 `styles/app.css`로 이동
- 빈 `styles.css`와 기존 로드 항목 제거
- 전체 Architecture, Source Map, Next Sprint, Recent Task와 Completed 기록 최종 동기화

## 완료 판정

- 이동 직후 원본 2,006줄과 App 422줄·노동요 1,584줄의 소유권별 바이트 동등성을 확인했다.
- 자동 테스트 62개, ESLint, Prettier와 diff 검사를 통과했다.
- 데스크톱 1280×900과 390×844 모바일에서 7개 기본 탭, 프로필·사용자 정의 탭, 공통 모달과 노동요 빈 목록·플레이어·컨트롤·리모컨을 확인했다.
- 콘솔 오류는 없고 기존 Tailwind CDN 운영 경고만 남아 있다.
- 실제 Firebase·Drive·YouTube 계정·파일·재생 세션과 청각 전환은 미검증이다.
- 루트 최종 검토에서 Engine 소유권, Controller 호출 경계, Port·Adapter 조립, 공개 호환 계약과 CSS 소유권 문서를 다시 확인했다.
- 로컬 정적 서버에서 `index.html`, 8개 CSS, `bootstrap.js`, `appComposer.js`가 모두 HTTP 200으로 제공됐다.
