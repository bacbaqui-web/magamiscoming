# 우리동네 웹 주소

`https://magamiscom.ing/neighborhood/`에서 우리동네를 연다. 기존 마감이즈커밍 첫 화면과 저장 데이터는 바꾸지 않는다.

GitHub Pages 배포 시 기존 저장소의 파일을 그대로 담고, `bacbaqui-web/our-neighborhood`의 검증된 버전을 빌드하여 `neighborhood/` 아래에 추가한다. 버전은 `.github/workflows/pages.yml`의 `ref`로 고정한다. 우리동네의 새 버전을 공개하려면 이 값을 검증한 커밋으로 바꾼다.

동네 생성 계산은 방문자의 브라우저에서 실행한다. 이 Mac이나 별도의 생성 서버에 접속하지 않는다. 지도 검색에는 https://magamiscom.ing 에서만 허용한 카카오 공개 JavaScript 키를 사용한다. 서버용 REST 키는 공개하지 않는다.

생성한 동네는 방문자 브라우저의 별도 IndexedDB `our-neighborhood-created-v1`에 저장한다. 마감이즈커밍의 Firebase·Drive·기존 저장 구조와 연결하지 않는다. 브라우저 데이터를 삭제하면 생성한 동네도 사라진다.
