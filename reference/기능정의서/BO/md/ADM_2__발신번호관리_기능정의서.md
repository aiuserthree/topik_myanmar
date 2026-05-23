# 발신번호 관리 기능정의서 (어드민)

| Role | 1Depth | 2Depth | 3Depth | 4Depth | 타입 | 화면명 | 화면 ID | PC/MO | spec | 접근 권한 | 기능 설명 | 관련 요구사항ID | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 어드민 | 발신번호 관리 | 승인 관리 | 승인 대기 | - | page | 어드민 > 발신번호 관리 > 승인 관리 > 승인 대기 | ADM_2_1_1_0_0_P | PC | 1차 | 심사 관리자 이상 | **1. 페이지 개요**<br>- 사용자가 등록 신청한 발신번호의 승인/반려 처리<br>- 서류 검토 및 승인 처리<br><br>**2. 승인 대기 목록 조회**<br>- 승인 대기 발신번호 목록 테이블 형태로 표시<br>  ㄴ 신청일시<br>  ㄴ 회원 정보 (회원명, 회원 유형)<br>  ㄴ 발신번호<br>  ㄴ 통신사<br>  ㄴ 명의자<br>  ㄴ 명의 구분 (본인/타인/타사)<br>  ㄴ 상태 (승인대기)<br>  ㄴ 검토 버튼<br>- 페이지네이션<br>  ㄴ 페이지당 20개씩 표시<br><br>**3. 검색 및 필터**<br>- 검색 기능<br>  ㄴ 회원명/발신번호 검색<br>- 필터 기능<br>  ㄴ 신청일 기간 필터<br>  ㄴ 회원 유형 필터 (개인/기업)<br>  ㄴ 명의 구분 필터<br><br>**4. 발신번호 상세 검토**<br>- "검토" 버튼 클릭 시 상세 검토 팝업 호출<br>- 표시 정보<br>  ㄴ **신청 정보**<br>    • 회원 정보 (상세)<br>    • 발신번호<br>    • 발신번호 용도<br>    • 통합용 사용 여부<br>    • 명의 구분<br>    • 연락처 정보<br>  ㄴ **서류 정보**<br>    • 본인인증 정보 (휴대폰 번호인 경우)<br>    • 제출 서류 목록<br>      - 통신서비스 이용증명원/통신사 가입증명서<br>      - 사업자등록증 (기업)<br>      - 재직증명서<br>      - 위임장 (타인/타사 명의)<br>      - 신분증 (타인 명의)<br>    • 서류 파일 다운로드 및 미리보기<br><br>**5. 검토 기능**<br>- 서류 확인 및 검증<br>  ㄴ 서류 파일 다운로드<br>  ㄴ 서류 내용 확인<br>  ㄴ 정보 일치 여부 확인<br>- 승인 처리<br>  ㄴ "승인" 버튼<br>  ㄴ 승인 완료 시 상태 변경<br>  ㄴ 승인 완료 알림 발송 (SMS/이메일)<br>  ㄴ 발송 서비스 사용 가능 처리<br>- 반려 처리<br>  ㄴ "반려" 버튼<br>  ㄴ 반려 사유 선택/입력 (필수)<br>  ㄴ 반려 알림 발송 (SMS/이메일)<br>  ㄴ 재신청 가능 처리<br>- 보완 요청<br>  ㄴ "보완 요청" 버튼<br>  ㄴ 추가 서류 요청 사유 입력<br>  ㄴ 보완 요청 알림 발송<br>- 메모 작성<br>  ㄴ 내부 검토 메모 작성<br>  ㄴ 검토 이력 기록<br><br>**6. 일괄 처리**<br>- 다중 선택<br>  ㄴ 체크박스로 다중 선택<br>  ㄴ 전체 선택/해제<br>- 일괄 승인<br>  ㄴ 선택한 항목 일괄 승인<br>  ㄴ 확인 팝업<br>- 일괄 반려<br>  ㄴ 선택한 항목 일괄 반려<br>  ㄴ 반려 사유 입력<br><br>**7. 검토 이력**<br>- 검토 이력 조회<br>  ㄴ 검토일시<br>  ㄴ 검토자<br>  ㄴ 검토 결과<br>  ㄴ 검토 메모 | ADM_REQ_004 | - 서류 검증 프로세스<br>- 알림 발송 시스템 |
| 어드민 | 발신번호 관리 | 승인 관리 | 승인 대기 | 상세 검토 | layer popup | 어드민 > 발신번호 관리 > 승인 관리 > 승인 대기 > 상세 검토 | ADM_2_1_1_1_0_LP | PC | 1차 | 심사 관리자 이상 | **1. 상세 검토 레이어 팝업**<br>- "검토" 버튼 클릭 시 레이어 팝업 호출<br>- 팝업 크기: 1200px × 800px<br>- 스크롤 가능<br><br>**2. 신청 정보 섹션**<br>- 회원 정보<br>  ㄴ 회원명, 회원 유형<br>  ㄴ 이메일, 전화번호<br>  ㄴ 가입일<br>- 발신번호 정보<br>  ㄴ 발신번호<br>  ㄴ 통신사<br>  ㄴ 명의자<br>  ㄴ 명의 구분<br>  ㄴ 발신번호 용도<br>  ㄴ 통합용 사용 여부<br>- 연락처 정보<br>  ㄴ 결과 수신 휴대폰번호<br>  ㄴ 결과 수신 이메일<br><br>**3. 서류 정보 섹션**<br>- 본인인증 정보 (휴대폰 번호인 경우)<br>  ㄴ 인증 완료 여부<br>  ㄴ 인증 일시<br>  ㄴ 인증 수단<br>- 제출 서류 목록<br>  ㄴ 서류명<br>  ㄴ 파일명<br>  ㄴ 다운로드 버튼<br>  ㄴ 미리보기 버튼<br>  ㄴ 파일 크기<br>  ㄴ 업로드 일시<br><br>**4. 검토 처리 섹션**<br>- 승인 버튼<br>  ㄴ 승인 확인 팝업<br>  ㄴ 승인 처리<br>- 반려 버튼<br>  ㄴ 반려 사유 선택/입력<br>  ㄴ 반려 확인 팝업<br>  ㄴ 반려 처리<br>- 보완 요청 버튼<br>  ㄴ 보완 요청 사유 입력<br>  ㄴ 보완 요청 처리<br><br>**5. 검토 메모 섹션**<br>- 검토 메모 입력<br>  ㄴ 메모 입력 필드<br>  ㄴ 저장 버튼<br>- 검토 이력<br>  ㄴ 이전 검토 메모 목록<br>  ㄴ 작성일시, 작성자<br><br>**6. 닫기**<br>- X 버튼 또는 "닫기" 버튼 | ADM_REQ_005 | - 서류 파일 다운로드<br>- 이미지 미리보기 |
| 어드민 | 발신번호 관리 | 승인 관리 | 승인 완료 | - | page | 어드민 > 발신번호 관리 > 승인 관리 > 승인 완료 | ADM_2_1_2_0_0_P | PC | 1차 | 심사 관리자 이상 | **1. 승인 완료 목록 조회**<br>- 승인 완료된 발신번호 목록<br>  ㄴ 승인일시<br>  ㄴ 회원 정보<br>  ㄴ 발신번호<br>  ㄴ 통신사<br>  ㄴ 명의자<br>  ㄴ 상태 (승인완료)<br>  ㄴ 관리 버튼<br><br>**2. 관리 기능**<br>- 발신번호 정지<br>  ㄴ 정지 사유 입력<br>  ㄴ 정지 처리<br>- 발신번호 삭제<br>  ㄴ 삭제 확인 팝업<br>  ㄴ 삭제 처리<br>- 상세 정보 조회<br>  ㄴ 승인 정보<br>  ㄴ 서류 정보<br>  ㄴ 사용 이력 | ADM_REQ_006 | - 발신번호 정지/삭제 기능 |
| 어드민 | 발신번호 관리 | 발신번호 목록 | - | - | page | 어드민 > 발신번호 관리 > 발신번호 목록 | ADM_2_2_0_0_0_P | PC | 1차 | 운영 관리자 이상 | **1. 전체 발신번호 목록 조회**<br>- 모든 승인 완료 발신번호 목록<br>  ㄴ 발신번호<br>  ㄴ 회원 정보<br>  ㄴ 통신사<br>  ㄴ 명의자<br>  ㄴ 등록일<br>  ㄴ 승인일<br>  ㄴ 상태 (승인완료/정지/삭제)<br>  ㄴ 사용 여부<br><br>**2. 검색 및 필터**<br>- 검색 기능<br>  ㄴ 발신번호/회원명 검색<br>- 필터 기능<br>  ㄴ 상태 필터<br>  ㄴ 회원 유형 필터<br>  ㄴ 등록일 기간 필터<br><br>**3. 관리 기능**<br>- 발신번호 정지/해제<br>- 발신번호 삭제<br>- 사용 이력 조회<br>- 발송 내역 조회 | ADM_REQ_007 | - 발신번호 통합 관리 |
| 어드민 | 발신번호 관리 | 발신프로필 관리 | 발신프로필 목록 | - | page | 어드민 > 발신번호 관리 > 발신프로필 관리 > 발신프로필 목록 | ADM_2_3_1_0_0_P | PC | 1차 | 운영 관리자 이상 | **1. 페이지 개요**<br>- 사용자가 등록한 카카오톡 채널(발신프로필) 목록 조회 및 관리<br>- 발신프로필 상태 동기화 및 관리<br><br>**2. 발신프로필 목록 조회**<br>- 발신프로필 목록 테이블 형태로 표시<br>  ㄴ 발신프로필 ID (@아이디 형태)<br>  ㄴ 회원 정보<br>  ㄴ 카카오톡 채널명<br>  ㄴ 상태 (등록/검수중/활성/중단/차단)<br>  ㄴ 브랜드메시지 사용여부 (Y/N)<br>  ㄴ 담당자 휴대폰 번호<br>  ㄴ 카테고리<br>  ㄴ 등록일<br>  ㄴ 관련 템플릿 개수<br>  ㄴ 관리 버튼<br><br>**3. 검색 및 필터**<br>- 검색 기능<br>  ㄴ 발신프로필 ID/회원명 검색<br>- 필터 기능<br>  ㄴ 상태 필터 (전체/등록/검수중/활성/중단/차단)<br>  ㄴ 회원 유형 필터<br>  ㄴ 등록일 기간 필터<br><br>**4. 관리 기능**<br>- 발신프로필 상세 정보 조회<br>- 발신프로필 상태 동기화 (카카오톡 채널과 동기화)<br>- 발신프로필 정지/해제<br>- 발신프로필 삭제 (템플릿이 없는 경우만)<br>- 관련 템플릿 목록 조회 | ADM_REQ_016 | - 발신프로필 통합 관리<br>- 카카오톡 채널 동기화 |
| 어드민 | 발신번호 관리 | 발신프로필 관리 | 발신프로필 상세 | - | layer popup | 어드민 > 발신번호 관리 > 발신프로필 관리 > 발신프로필 상세 | ADM_2_3_1_1_0_LP | PC | 1차 | 운영 관리자 이상 | **1. 발신프로필 상세 레이어 팝업**<br>- "관리" 버튼 클릭 시 레이어 팝업 호출<br>- 팝업 크기: 1000px × 700px<br><br>**2. 기본 정보 섹션**<br>- 발신프로필 ID (@아이디 형태)<br>- 카카오톡 채널명<br>- 회원 정보<br>- 등록일<br>- 상태 (등록/검수중/활성/중단/차단)<br>- 브랜드메시지 사용여부<br><br>**3. 담당자 정보 섹션**<br>- 담당자 휴대폰 번호<br>- 인증 여부<br><br>**4. 카테고리 정보 섹션**<br>- 선택된 카테고리 목록 (최대 3개)<br><br>**5. 등록 이력 섹션**<br>- 등록일시<br>- 등록자<br>- 상태 변경 이력<br>  ㄴ 변경일시<br>  ㄴ 이전 상태 → 변경 상태<br>  ㄴ 변경 사유<br><br>**6. 관련 템플릿 섹션**<br>- 등록된 템플릿 개수<br>- 템플릿 목록 조회 링크<br><br>**7. 관리 기능**<br>- 상태 동기화 버튼<br>  ㄴ 카카오톡 채널과 상태 동기화<br>- 정지/해제 버튼<br>  ㄴ 정지 사유 입력<br>  ㄴ 정지/해제 처리<br>- 삭제 버튼 (템플릿이 없는 경우만)<br>  ㄴ 삭제 확인 팝업<br>  ㄴ 삭제 처리 | ADM_REQ_017 | - 발신프로필 상세 관리 |

## 상세 기능 설명

### 1. 승인 대기 페이지

#### 1.1 검색 및 필터 영역
```html
<div class="search-filter-bar">
    <div class="search-box">
        <input type="text" placeholder="회원명 또는 발신번호 검색" id="searchInput">
    </div>
    <div class="filter-group">
        <select id="ownerTypeFilter">
            <option value="">명의 구분 (전체)</option>
            <option value="self">본인</option>
            <option value="other">타인</option>
            <option value="company">타사</option>
        </select>
        <select id="memberTypeFilter">
            <option value="">회원 유형 (전체)</option>
            <option value="PERSONAL">개인</option>
            <option value="COMPANY">기업</option>
        </select>
        <input type="date" id="startDate">
        <input type="date" id="endDate">
        <button class="btn btn-primary" onclick="searchPending()">검색</button>
        <button class="btn btn-outline" onclick="resetSearch()">초기화</button>
    </div>
</div>
```

#### 1.2 승인 대기 목록 테이블 컬럼
| 컬럼명 | 설명 | 너비 | 정렬 |
|--------|------|------|------|
| 체크박스 | 다중 선택 (일괄 처리용) | 40px | 중앙 |
| 신청일시 | YYYY-MM-DD HH:mm | 140px | 중앙 |
| 회원명 | 회원 이름 + 이메일 | 180px | 좌측 |
| 발신번호 | 010-XXXX-XXXX 형식 | 130px | 중앙 |
| 통신사 | SKT/KT/LGU+ 등 | 80px | 중앙 |
| 명의자 | 명의자 이름 | 100px | 좌측 |
| 명의 구분 | 본인/타인/타사 뱃지 | 80px | 중앙 |
| 상태 | 승인대기/보완요청 뱃지 | 100px | 중앙 |
| 관리 | 검토 버튼 | 80px | 중앙 |

#### 1.3 상태별 뱃지 스타일
| 상태 | 클래스 | 색상 |
|------|--------|------|
| 승인대기 | badge-warning | 노란색 |
| 보완요청 | badge-info | 파란색 |
| 승인완료 | badge-success | 녹색 |
| 반려 | badge-danger | 빨간색 |
| 본인 | badge-success | 녹색 |
| 타인 | badge-warning | 노란색 |
| 타사 | badge-info | 파란색 |

#### 1.4 일괄 처리 버튼
```html
<div class="bulk-actions">
    <span>선택된 항목: <strong id="selectedCount">0</strong>건</span>
    <button class="btn btn-success" id="bulkApproveBtn" disabled onclick="handleBulkApprove()">
        일괄 승인
    </button>
    <button class="btn btn-danger" id="bulkRejectBtn" disabled onclick="openBulkRejectModal()">
        일괄 반려
    </button>
</div>
```

### 2. 상세 검토 모달

#### 2.1 모달 구조
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 발신번호 상세 검토                                                  ✕   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│ │ 신청 정보                    │  │ 서류 정보                        │   │
│ ├─────────────────────────────┤  ├─────────────────────────────────┤   │
│ │ 회원명:     홍길동           │  │ [✓] 본인인증 완료                │   │
│ │ 회원 유형:  개인             │  │     2024-11-19 14:30             │   │
│ │ 발신번호:   010-1234-5678   │  │                                  │   │
│ │ 통신사:     SKT             │  │ 제출 서류                         │   │
│ │ 명의자:     홍길동           │  │ ┌──────────────────────────────┐ │   │
│ │ 명의 구분:  [본인]          │  │ │ 통신서비스 이용증명원         │ │   │
│ │ 용도:       마케팅          │  │ │ doc_20241119.pdf   [다운로드] │ │   │
│ │ 통합용:     Y               │  │ └──────────────────────────────┘ │   │
│ └─────────────────────────────┘  │                                  │   │
│                                   └─────────────────────────────────┘   │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ 검토 이력                                                          │   │
│ ├───────────────────────────────────────────────────────────────────┤   │
│ │ 2024-11-19 10:00 | 신청 접수 | 시스템                              │   │
│ │ 2024-11-19 14:30 | 검토 시작 | 관리자A                             │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│           [보완 요청]      [반려]      [승인]           [닫기]          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2 검토 모달 열기
```javascript
function openReviewModal(id) {
    currentReviewId = id;
    
    // 데이터 로드 (실제 구현 시 API 호출)
    const data = loadCallerNumberDetail(id);
    
    // 신청 정보 렌더링
    document.getElementById('reviewCallerNumber').textContent = data.callerNumber;
    document.getElementById('reviewMember').textContent = `${data.memberName} (${data.memberEmail})`;
    document.getElementById('reviewOwnerType').textContent = getOwnerTypeText(data.ownerType);
    document.getElementById('reviewOwnerName').textContent = data.ownerName;
    document.getElementById('reviewCarrier').textContent = data.carrier;
    document.getElementById('reviewPurpose').textContent = data.purpose;
    
    // 서류 정보 렌더링
    renderDocuments(data.documents);
    
    // 검토 이력 렌더링
    renderReviewHistory(data.reviewHistory);
    
    openModal('reviewModal');
}
```

#### 2.3 승인 처리
```javascript
function handleApprove() {
    confirmAction('이 발신번호를 승인하시겠습니까?', function() {
        // API 호출
        fetch(`/api/admin/caller-numbers/${currentReviewId}/approve`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('발신번호가 승인되었습니다.', 'success');
                closeModal('reviewModal');
                refreshPendingList();
            } else {
                showToast('승인 처리에 실패했습니다.', 'error');
            }
        })
        .catch(error => {
            showToast('승인 처리 중 오류가 발생했습니다.', 'error');
        });
    });
}
```

#### 2.4 반려 처리
```javascript
function handleReject() {
    const reasonType = document.getElementById('rejectReasonType').value;
    const reasonDetail = document.getElementById('rejectReasonDetail').value;
    
    if (!reasonType) {
        showToast('반려 사유 유형을 선택해주세요.', 'error');
        return;
    }
    
    if (!reasonDetail.trim()) {
        showToast('반려 사유를 입력해주세요.', 'error');
        return;
    }
    
    confirmAction('이 발신번호를 반려하시겠습니까?', function() {
        // API 호출
        fetch(`/api/admin/caller-numbers/${currentReviewId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reasonType, reasonDetail })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('발신번호가 반려되었습니다.', 'success');
                closeModal('reviewModal');
                refreshPendingList();
            } else {
                showToast('반려 처리에 실패했습니다.', 'error');
            }
        });
    });
}
```

#### 2.5 보완 요청 모달
```
┌──────────────────────────────────────────┐
│ 보완 요청                          ✕     │
├──────────────────────────────────────────┤
│                                          │
│ 보완 사유                                │
│ ┌────────────────────────────────────┐   │
│ │                                    │   │
│ │ 서류 확인이 어려워 재제출 요청     │   │
│ │                                    │   │
│ └────────────────────────────────────┘   │
│                                          │
│ 보완 요청 항목                           │
│ ☑ 통신서비스 이용증명원                  │
│ ☐ 사업자등록증                           │
│ ☐ 재직증명서                             │
│ ☐ 위임장                                 │
│ ☐ 신분증 사본                            │
│                                          │
│ 보완 기한                                │
│ ┌────────────────────────────────────┐   │
│ │ 2024-11-26                    📅   │   │
│ └────────────────────────────────────┘   │
│                                          │
├──────────────────────────────────────────┤
│              [취소]      [요청]          │
└──────────────────────────────────────────┘
```

```javascript
function saveSupplementRequest(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const reason = document.getElementById('supplementReason').value;
    const items = Array.from(document.querySelectorAll('input[name="supplementItem"]:checked'))
                       .map(cb => cb.value);
    const deadline = document.getElementById('supplementDeadline').value;
    
    if (!reason.trim()) {
        showToast('보완 사유를 입력해주세요.', 'error');
        return;
    }
    
    if (items.length === 0) {
        showToast('보완 요청 항목을 선택해주세요.', 'error');
        return;
    }
    
    if (!deadline) {
        showToast('보완 기한을 선택해주세요.', 'error');
        return;
    }
    
    // API 호출
    fetch(`/api/admin/caller-numbers/${currentReviewId}/supplement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, items, deadline })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('보완 요청이 전송되었습니다.', 'success');
            closeModal('supplementModal');
            closeModal('reviewModal');
            refreshPendingList();
        }
    });
}
```

### 3. 일괄 처리 기능

#### 3.1 체크박스 선택
```javascript
let selectedIds = [];

function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('input[name="callerNumberCheck"]');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
    
    if (checked) {
        selectedIds = Array.from(checkboxes).map(cb => cb.value);
    } else {
        selectedIds = [];
    }
    
    updateBulkActionButtons();
}

function toggleSelect(id) {
    const index = selectedIds.indexOf(id);
    if (index > -1) {
        selectedIds.splice(index, 1);
    } else {
        selectedIds.push(id);
    }
    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const count = selectedIds.length;
    document.getElementById('selectedCount').textContent = count;
    
    document.getElementById('bulkApproveBtn').disabled = count === 0;
    document.getElementById('bulkRejectBtn').disabled = count === 0;
}
```

#### 3.2 일괄 승인
```javascript
function handleBulkApprove() {
    if (selectedIds.length === 0) {
        showToast('선택된 항목이 없습니다.', 'error');
        return;
    }
    
    confirmAction(`선택한 ${selectedIds.length}건을 일괄 승인하시겠습니까?`, function() {
        fetch('/api/admin/caller-numbers/bulk-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
        })
        .then(response => response.json())
        .then(result => {
            showToast(`${result.processedCount}건이 승인되었습니다.`, 'success');
            
            // 테이블 UI 업데이트 (상태 컬럼: 8번째)
            selectedIds.forEach(id => {
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (row) {
                    row.querySelector('td:nth-child(8)').innerHTML = 
                        '<span class="badge badge-success">승인완료</span>';
                }
            });
            
            selectedIds = [];
            updateBulkActionButtons();
            setTimeout(() => refreshPendingList(), 1500);
        });
    });
}
```

#### 3.3 일괄 반려
```javascript
function openBulkRejectModal() {
    if (selectedIds.length === 0) {
        showToast('선택된 항목이 없습니다.', 'error');
        return;
    }
    document.getElementById('batchRejectCount').textContent = selectedIds.length;
    openModal('batchRejectModal');
}

function confirmBulkRejectFromModal() {
    const reason = document.getElementById('batchRejectReason').value;
    
    if (!reason.trim()) {
        showToast('반려 사유를 입력해주세요.', 'error');
        return;
    }
    
    fetch('/api/admin/caller-numbers/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, reason })
    })
    .then(response => response.json())
    .then(result => {
        showToast(`${result.processedCount}건이 반려되었습니다.`, 'success');
        
        // 테이블 UI 업데이트 (상태 컬럼: 8번째)
        selectedIds.forEach(id => {
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                row.querySelector('td:nth-child(8)').innerHTML = 
                    '<span class="badge badge-danger">반려</span>';
            }
        });
        
        closeModal('batchRejectModal');
        selectedIds = [];
        updateBulkActionButtons();
        setTimeout(() => refreshPendingList(), 1500);
    });
}
```

### 4. 승인 완료 페이지

#### 4.1 승인 완료 목록 테이블 컬럼
| 컬럼명 | 설명 | 너비 | 정렬 |
|--------|------|------|------|
| 승인일시 | YYYY-MM-DD HH:mm | 140px | 중앙 |
| 회원명 | 회원 이름 + 이메일 | 180px | 좌측 |
| 발신번호 | 010-XXXX-XXXX 형식 | 130px | 중앙 |
| 통신사 | SKT/KT/LGU+ 등 | 80px | 중앙 |
| 명의자 | 명의자 이름 | 100px | 좌측 |
| 상태 | 사용중/정지 뱃지 | 80px | 중앙 |
| 관리 | 상세/정지 버튼 | 150px | 중앙 |

#### 4.2 정지/해제 기능
```javascript
function handleSuspend(id, callerNumber) {
    currentSuspendId = id;
    document.getElementById('suspendCallerNumber').textContent = callerNumber;
    openModal('suspendModal');
}

function confirmSuspend() {
    const reason = document.getElementById('suspendReason').value;
    
    if (!reason.trim()) {
        showToast('정지 사유를 입력해주세요.', 'error');
        return;
    }
    
    fetch(`/api/admin/caller-numbers/${currentSuspendId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('발신번호가 정지되었습니다.', 'success');
            closeModal('suspendModal');
            
            // 테이블 UI 업데이트
            const row = document.querySelector(`tr[data-id="${currentSuspendId}"]`);
            if (row) {
                row.querySelector('.status-badge').innerHTML = 
                    '<span class="badge badge-danger">정지</span>';
                // 버튼 변경
                row.querySelector('.btn-warning').outerHTML = 
                    `<button class="btn btn-sm btn-success" onclick="handleUnsuspend('${currentSuspendId}')">해제</button>`;
            }
        }
    });
}

function handleUnsuspend(id) {
    confirmAction('이 발신번호의 정지를 해제하시겠습니까?', function() {
        fetch(`/api/admin/caller-numbers/${id}/unsuspend`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('정지가 해제되었습니다.', 'success');
                
                // 테이블 UI 업데이트
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (row) {
                    row.querySelector('.status-badge').innerHTML = 
                        '<span class="badge badge-success">사용중</span>';
                    // 버튼 변경
                    row.querySelector('.btn-success').outerHTML = 
                        `<button class="btn btn-sm btn-warning" onclick="handleSuspend('${id}', '...')">정지</button>`;
                }
            }
        });
    });
}
```

### 5. 발신프로필 관리 페이지

#### 5.1 발신프로필 목록 테이블 컬럼
| 컬럼명 | 설명 | 너비 | 정렬 |
|--------|------|------|------|
| 발신프로필 ID | @아이디 형태 | 150px | 좌측 |
| 회원명 | 회원 이름 + 이메일 | 180px | 좌측 |
| 채널명 | 카카오톡 채널명 | 150px | 좌측 |
| 상태 | 등록/검수중/활성/중단/차단 뱃지 | 100px | 중앙 |
| 브랜드메시지 | Y/N | 60px | 중앙 |
| 카테고리 | 카테고리명 | 100px | 중앙 |
| 등록일 | YYYY-MM-DD | 100px | 중앙 |
| 템플릿 수 | N개 | 80px | 중앙 |
| 관리 | 관리/동기화 버튼 | 150px | 중앙 |

#### 5.2 프로필 상태별 뱃지
| 상태 | 클래스 | 색상 |
|------|--------|------|
| 등록 | badge-secondary | 회색 |
| 검수중 | badge-info | 파란색 |
| 활성 | badge-success | 녹색 |
| 중단 | badge-warning | 노란색 |
| 차단 | badge-danger | 빨간색 |

#### 5.3 카카오 동기화
```javascript
function syncKakaoProfile(profileId) {
    showToast('카카오톡 채널과 동기화 중입니다...', 'info');
    
    fetch(`/api/admin/kakao-profiles/${profileId}/sync`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('동기화가 완료되었습니다.', 'success');
            
            // 상태 업데이트
            const row = document.querySelector(`tr[data-id="${profileId}"]`);
            if (row) {
                row.querySelector('.status-badge').innerHTML = getStatusBadge(result.newStatus);
            }
        } else {
            showToast('동기화에 실패했습니다: ' + result.message, 'error');
        }
    })
    .catch(error => {
        showToast('동기화 중 오류가 발생했습니다.', 'error');
    });
}
```

### 6. 데이터 연동

#### 6.1 API 엔드포인트
| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| /api/admin/caller-numbers/pending | GET | 승인 대기 목록 조회 |
| /api/admin/caller-numbers/approved | GET | 승인 완료 목록 조회 |
| /api/admin/caller-numbers | GET | 전체 발신번호 목록 조회 |
| /api/admin/caller-numbers/{id} | GET | 발신번호 상세 조회 |
| /api/admin/caller-numbers/{id}/approve | POST | 발신번호 승인 |
| /api/admin/caller-numbers/{id}/reject | POST | 발신번호 반려 |
| /api/admin/caller-numbers/{id}/supplement | POST | 보완 요청 |
| /api/admin/caller-numbers/{id}/suspend | POST | 발신번호 정지 |
| /api/admin/caller-numbers/{id}/unsuspend | POST | 발신번호 정지 해제 |
| /api/admin/caller-numbers/bulk-approve | POST | 일괄 승인 |
| /api/admin/caller-numbers/bulk-reject | POST | 일괄 반려 |
| /api/admin/kakao-profiles | GET | 발신프로필 목록 조회 |
| /api/admin/kakao-profiles/{id} | GET | 발신프로필 상세 조회 |
| /api/admin/kakao-profiles/{id}/sync | POST | 카카오 동기화 |
| /api/admin/kakao-profiles/{id}/suspend | POST | 발신프로필 정지 |

#### 6.2 요청/응답 예시

##### 승인 대기 목록 조회
```
GET /api/admin/caller-numbers/pending?search=홍길동&ownerType=self&page=1&size=20
```

```json
{
  "content": [
    {
      "id": "uuid-xxx-xxx",
      "callerNumber": "010-1234-5678",
      "memberName": "홍길동",
      "memberEmail": "hong@example.com",
      "carrier": "SKT",
      "ownerName": "홍길동",
      "ownerType": "self",
      "status": "PENDING",
      "requestDate": "2024-11-19T10:30:00"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "number": 0
}
```

##### 발신번호 상세 조회
```
GET /api/admin/caller-numbers/uuid-xxx-xxx
```

```json
{
  "id": "uuid-xxx-xxx",
  "callerNumber": "010-1234-5678",
  "member": {
    "name": "홍길동",
    "email": "hong@example.com",
    "type": "PERSONAL"
  },
  "carrier": "SKT",
  "ownerName": "홍길동",
  "ownerType": "self",
  "purpose": "마케팅",
  "isIntegrated": true,
  "documents": [
    {
      "id": "doc-xxx",
      "type": "CARRIER_CERTIFICATE",
      "fileName": "통신서비스이용증명원.pdf",
      "fileUrl": "/files/doc-xxx.pdf",
      "uploadedAt": "2024-11-19T10:00:00"
    }
  ],
  "reviewHistory": [
    {
      "date": "2024-11-19T10:30:00",
      "action": "SUBMITTED",
      "adminName": "시스템",
      "comment": "신청 접수"
    }
  ],
  "status": "PENDING",
  "requestDate": "2024-11-19T10:30:00"
}
```

##### 일괄 승인
```
POST /api/admin/caller-numbers/bulk-approve
Content-Type: application/json

{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

```json
{
  "success": true,
  "processedCount": 3,
  "failedCount": 0
}
```

### 7. 테스트 케이스

| TC ID | 테스트 항목 | 예상 결과 |
|-------|------------|----------|
| TC001 | 승인 대기 목록 조회 | 승인 대기 상태의 발신번호만 표시 |
| TC002 | 검색 (발신번호) | 검색어에 해당하는 발신번호 표시 |
| TC003 | 검색 (회원명) | 검색어에 해당하는 회원의 발신번호 표시 |
| TC004 | 명의 구분 필터 | 선택한 명의 구분만 표시 |
| TC005 | 상세 검토 모달 오픈 | 신청 정보, 서류 정보 표시 |
| TC006 | 승인 처리 | 확인 후 상태 변경, 토스트 표시 |
| TC007 | 반려 처리 | 사유 입력 후 상태 변경, 토스트 표시 |
| TC008 | 보완 요청 | 사유/항목/기한 입력 후 요청 발송 |
| TC009 | 일괄 승인 | 선택 항목 일괄 승인, 상태 업데이트 |
| TC010 | 일괄 반려 | 선택 항목 일괄 반려, 상태 업데이트 |
| TC011 | 정지 처리 | 사유 입력 후 정지, 버튼 변경 |
| TC012 | 정지 해제 | 확인 후 해제, 버튼 변경 |
| TC013 | 카카오 동기화 | 카카오 API 호출 후 상태 업데이트 |
| TC014 | 서류 다운로드 | 파일 다운로드 시작 |
| TC015 | 체크박스 전체 선택 | 모든 체크박스 선택/해제 |
| TC016 | 페이지네이션 | 페이지 이동 정상 동작 |
