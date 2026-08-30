# Sprint 12 노동요와 YouTube 연결

## 완료

- WorkMusicEngine이 곡·탭·현재 곡·재생 순서·볼륨·이어듣기 상태를 소유한다.
- 변경 이유별 Controller와 YouTube 순수 Helper를 분리했다.
- YouTube Port와 Browser Adapter를 AppComposer에서 조립하고 Player 생성 경계에 주입했다.
- Cloud State 노동요 탭 CRUD가 Controller를 통해 Engine을 변경한다.
- 저장 스키마, DOM ID, 공개 호환 계약과 기존 재생 알고리즘을 유지했다.
- DJ·곡 분석 기능은 포함하지 않았다.

## 검증

- 자동 테스트 61개, ESLint, Prettier와 diff 검사를 통과했다.
- 노동요 탭과 빈 상태 UI는 로컬 브라우저에서 확인했다.
- 실제 YouTube 및 로그인 저장 세션은 미검증이다.
