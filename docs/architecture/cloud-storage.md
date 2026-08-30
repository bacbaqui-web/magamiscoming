# Cloud Storage

## 목적

사용자별 메타데이터와 큰 파일의 소유권, 저장 대체 경로와 Lifecycle을 정의한다.

## 데이터 소유권

- Firebase가 활성화되고 인증된 환경에서는 달력, 메모, 북마크 목록, 노동요 목록, 포모도로와 CLIP 목록 메타데이터를 Firestore에 저장한다.
- Firestore 데이터는 `users/{uid}` 아래 사용자 경계에 둔다.
- Google Drive는 북마크 이미지와 CLIP 미리보기 같은 큰 파일을 맡는다.
- Firebase가 비활성화되거나 사용할 수 없는 구성에서는 기존 Google Drive JSON 저장을 대체 경로로 유지한다.

## 주요 책임

- `appDataTransforms.js`: 기본값, 정규화와 기능별 분할·병합
- `appDataRuntime.js`: 브라우저 Runtime 상태 수집·로드 적용과 북마크 직렬화
- `metadataPort.js`: 인증된 사용자 메타데이터 읽기·쓰기 계약
- `filePort.js`: Drive 파일·폴더 작업 계약과 기존 Compatibility 호출 전달
- `firebaseMetadataStore.js`: Metadata Port 뒤에서 Firebase SDK를 호출하는 Firestore Adapter
- `driveFiles.js`: File Port 뒤에서 Drive REST API를 호출하는 Drive File Adapter
- `driveStatus.js`: 업로드 진행 상태와 저장 상태 표시
- `driveImageUrls.js`: 다운로드한 Drive 이미지의 Blob URL 생성·해제 Lifecycle
- `cloudSyncBackend.js`: 인증, 저장소 선택, 저장 큐와 로드 Lifecycle 조정 및 주입된 Compatibility 렌더 요청
- `cloudPersistenceHandlers.js`: 로그인 확인과 공통 저장 즉시 실행·예약
- `bookmarkCloudHandlers.js`, `workMusicCloudHandlers.js`: 공개 탭 저장 함수를 기능 Controller에 위임
- `cloudStateHandlers.js`: 공통·기능별 저장 계약 설치 조립

## 불변 조건

- 저장 방식 변경은 명시적인 승인과 마이그레이션 계획 없이 진행하지 않는다.
- Firebase와 Drive 대체 경로가 같은 기능 데이터를 의미하도록 유지한다.
- 저장 중 페이지 종료 경고와 저장 직렬화 동작을 보존한다.
- Blob URL, 파일 선택 권한과 플레이어 객체 같은 런타임 상태를 영구 데이터에 넣지 않는다.
- 로그인 세션이 없는 상태에서 사용자 데이터를 외부 저장소에 쓰지 않는다.
- Metadata Port는 AppAuthController에 현재 사용자가 없으면 Adapter 읽기·쓰기를 호출하지 않는다.
- Firestore 문서는 `users/{uid}/app/{section}_{id}`, 기능 컬렉션은 `users/{uid}/{collection}` 경로를 유지한다.
- Drive File Adapter는 기존 `magamiscoming`, `system`, `메모`, `북마크`, `클립뷰어`, `current` 폴더 이름과 JSON·텍스트 파일 이름 규칙을 유지한다.
- Google 인증 만료 감지와 자동 복구 요청은 Cloud Sync의 인증 Lifecycle에 남기고 File Port가 소유하지 않는다.

## 맡지 않는 책임

- 저장 계층은 기능별 DOM 렌더링과 사용자 인터랙션을 소유하지 않는다.
- 저장 계층은 공개 `window.render*`를 탐색하지 않고 AppComposer가 연결한 기능 인터페이스만 호출한다.
- 저장 계층은 기능 탭 배열과 항목을 직접 변경하지 않고 해당 Controller에 위임한다.
- 저장 계층은 YouTube 재생, CLIP 순서 계산과 달력 표시 규칙을 결정하지 않는다.
- File Port는 업로드 진행 UI와 Blob URL 생성·해제를 소유하지 않는다.
