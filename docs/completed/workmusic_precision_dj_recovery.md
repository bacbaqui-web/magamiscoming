# 3초 정지 확대·디제잉 복구

- 요청: 핸들 3초 정지 후 정밀 확대, 디제잉 미동작 확인.
- 정밀 확대: 원래 축을 유지한 채 주변 최대 20초 inset을 열고 0.01초로 수정한다.
  pointer 이동은 timer reset, release/cancel/blur는 대기 해제, Escape/곡 전환은 창 닫기.
- DJ: 다음 곡 서버 결과 GET prefetch, 실패 후보 제외, standby 실패 시 현재 재생 보존,
  폐기 Player 이벤트 차단, 화면에 구간 미확인·대기·fade 상태 표시.
- 자동 테스트 113개와 ESLint·Prettier·diff 검증. 독립 Edge 실제 pointer hold 및 50→50.01초 저장 확인.
- 실제 YouTube localhost 시험은 오류 150으로 막힌 곡이 있어 fade 완료·청각 QA는 미검증.
  기존 사용자 운영 탭은 읽기만 했고 시험 탭/임시 fixture를 정리했다.

영구 계약은 `../architecture/workmusic.md`, 최근 보고는 `../99_recent_task.md`를 따른다.
