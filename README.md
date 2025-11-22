# LgPlaywright
LG PRD TEST - Add to Cart 자동화 테스트

## 📋 프로젝트 설명
이 프로젝트는 LG 웹사이트의 TV 제품 페이지에서 랜덤으로 제품을 선택하고 장바구니에 추가하는 과정을 자동화하는 Playwright 테스트입니다.

## 🛠️ 설치 방법
```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치
npx playwright install
```

## 🐛 로컬 디버깅 방법

### 1. 기본 실행 (Headless 모드)
백그라운드에서 빠르게 테스트를 실행합니다.
```bash
npx playwright test
```

### 2. Headed 모드로 실행 (추천 ⭐)
브라우저 창을 보면서 테스트를 실행합니다. 가장 직관적인 디버깅 방법입니다.
```bash
npx playwright test tests/lg-add-to-cart.spec.ts --headed
```

### 3. UI 모드로 실행
UI 모드는 각 단계를 시각적으로 확인하면서 디버깅할 수 있습니다.
```bash
npx playwright test --ui
```

### 4. 디버그 모드로 실행
브라우저가 열린 상태에서 단계별로 실행됩니다.
```bash
npx playwright test --debug
```

### 5. 슬로우 모션으로 실행
각 액션 사이에 지연을 추가하여 천천히 실행됩니다.
```bash
npx playwright test --headed --slow-mo=1000
```

### 6. 타임아웃 늘리기
타임아웃을 120초로 늘려서 실행합니다.
```bash
npx playwright test tests/lg-add-to-cart.spec.ts --headed --timeout=120000
```

### 7. 디버그 로그 확인
상세한 로그를 확인하려면:
```bash
DEBUG=pw:api npx playwright test
```

### 8. Trace 뷰어로 상세 분석
테스트 실패 시 자동으로 생성되는 trace 파일을 분석할 수 있습니다.
```bash
npx playwright show-trace test-results/.../trace.zip
```

## 📊 테스트 리포트 확인
```bash
# 테스트 실행 후 리포트 생성
npx playwright test

# HTML 리포트 열기
npx playwright show-report
```

## 🔍 스크린샷 및 비디오
- 테스트 실행 시 스크린샷이 자동으로 생성됩니다 (`lg-tvs-random-add-to-cart-*.png`)
- 실패 시 추가 디버깅 정보가 `test-results/` 폴더에 저장됩니다

## 📝 주요 기능
- ✅ LG TV 제품 목록에서 랜덤 제품 선택
- ✅ 제품 상세 페이지로 이동
- ✅ Add to Cart 버튼 자동 감지 및 클릭
- ✅ API 요청/응답 검증
- ✅ HTTP 상태 코드 확인
- ✅ JSON 응답 성공 여부 확인
- ✅ **추적 스크립트 차단** (성능 향상 및 노이즈 제거)
  - `cdn.transcend.io` 차단
  - `www.googletagmanager.com` 차단
  - Google Analytics 및 기타 분석 도구 차단

## ⚠️ 주의사항
이 테스트는 실제 운영 환경(Production)에서 실행됩니다. 실제 장바구니에 상품이 추가될 수 있으므로 주의하세요.

## ✅ 디버깅 결과

### 테스트 성공 로그 예시
```
찾은 제품 링크 개수: 12
선택한 제품 인덱스: 0, href: /us/tvs/lg-oled77g5wua-oled-4k-tv
제품 페이지로 이동: https://www.lg.com/us/tvs/lg-oled77g5wua-oled-4k-tv
시도중인 셀렉터: button:has-text("Add to Cart")
장바구니 API 감지: https://www.lg.com/us/common-mfe/api/cart/v3/items
성공적으로 클릭한 셀렉터: button:has-text("Add to Cart")
Add to Cart API status: 200
✅ 장바구니 추가 성공! Cart ID: 333017, 아이템 수: 1
🎉 Add to Cart API 성공 확인 완료!
```

### API 검증 내용
- ✅ HTTP 상태 코드: 200 (성공)
- ✅ API 엔드포인트: `/us/common-mfe/api/cart/v3/items`
- ✅ 장바구니 ID 확인
- ✅ 추가된 아이템 수 확인
- ✅ JSON 응답 구조 검증

### 문제 해결
1. **채팅 API 제외**: Sprinklr 채팅 API 응답이 먼저 감지되는 것을 방지
2. **타임아웃 최적화**: API 응답 대기 시간을 15초로 설정
3. **에러 처리**: API 감지 실패 시에도 UI 확인으로 대체 가능
4. **추적 스크립트 차단**: 불필요한 분석 도구 및 추적 스크립트 차단으로 테스트 속도 향상

### 차단된 도메인 목록
테스트 실행 시 다음 도메인의 JavaScript가 자동으로 차단됩니다:
- `cdn.transcend.io` - Transcend 개인정보 보호 플랫폼
- `www.googletagmanager.com` - Google Tag Manager
- `google-analytics.com` - Google Analytics
- `doubleclick.net` - Google 광고 추적

차단된 요청은 콘솔에 `🚫 차단된 요청: [URL]` 형식으로 표시됩니다.

## 🚀 GitHub Actions 자동화

### 워크플로우 설정
이 프로젝트는 GitHub Actions를 통해 자동으로 모니터링됩니다.

### 실행 트리거
- **스케줄**: 매 30분마다 자동 실행
- **수동 실행**: GitHub Actions 탭에서 "Run workflow" 버튼으로 수동 실행 가능
- **Push**: `main` 브랜치의 `tests/**` 또는 `.github/workflows/**` 파일 변경 시 자동 실행

### 워크플로우 기능
- ✅ Ubuntu 최신 환경에서 실행
- ✅ Node.js 18 사용
- ✅ Playwright 브라우저 자동 설치
- ✅ 타임아웃: 120초 (테스트별), 15분 (전체 job)
- ✅ HTML 리포트 자동 생성 및 업로드
- ✅ 실패 시 trace, 스크린샷, 비디오 저장 (30일 보관)
- ✅ Slack 알림 (선택 사항)

### Slack 알림 설정 (선택)
Slack 알림을 받으려면 다음을 설정하세요:

1. Slack Webhook URL 생성
2. GitHub Repository → Settings → Secrets and variables → Actions
3. New repository secret 추가:
   - Name: `SLACK_WEBHOOK`
   - Value: `your-slack-webhook-url`

### 워크플로우 실행 확인
```
GitHub Repository → Actions 탭 → LG Production Synthetic Monitor
```

### 아티팩트 다운로드
테스트 실행 후 다음을 다운로드할 수 있습니다:
- **html-report-[번호]**: HTML 형식의 테스트 리포트
- **test-artifacts-[번호]**: 스크린샷, trace 파일, 비디오

## 🔧 설정 파일

### playwright.config.ts
Playwright 설정은 `playwright.config.ts`에서 관리됩니다.

### .github/workflows/playwright-monitor.yml
GitHub Actions 워크플로우 설정 파일입니다.