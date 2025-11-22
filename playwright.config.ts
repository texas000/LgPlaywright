import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 한국어: 테스트 결과 리포트 생성 설정
  reporter: [
    ['list'],                                 // 콘솔에 출력
    ['html', { outputFolder: 'playwright-report' }], // HTML 리포트
    ['json', { outputFile: 'report.json' }]    // JSON 리포트
  ],

  use: {
    headless: true,                  // CI 환경은 headless로 돌림
    screenshot: 'only-on-failure',   // 실패 시 스크린샷 저장
    video: 'retain-on-failure',      // 실패 시 비디오 저장
    trace: 'retain-on-failure',      // 실패 시 trace 저장
    
    // 한국어: 특정 도메인의 JavaScript 차단 (성능 향상 및 노이즈 제거)
    // 추적 스크립트 및 분석 도구 차단
    bypassCSP: true,  // CSP 우회 허용
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});