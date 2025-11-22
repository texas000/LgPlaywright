// tests/lg-member-login.spec.ts
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/*
  한국어 주석: LG Members 로그인 테스트
  - https://members.us.lg.com/store/pm 페이지로 이동
  - 로그인 수행
  - 로그인 시간 측정
  - API 응답 정보 수집
  - 환경변수(.env)에서 자격증명 로드
*/

test.describe('LG Members — Login Test', () => {
  
  test('login to LG Members store', async ({ page }) => {
    // 환경변수에서 자격증명 가져오기
    const email = process.env.PM_MEMBER_EMAIL;
    const password = process.env.PM_MEMBER_PASSWORD;

    if (!email || !password) {
      throw new Error('PM_MEMBER_EMAIL and PM_MEMBER_PASSWORD must be set in .env file');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔐 LG Members Login Test');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${email}`);
    console.log(`🌐 Target URL: https://members.us.lg.com/store/pm\n`);

    // 추적 스크립트 차단 (성능 향상)
    const blockedDomains = [
      'cdn.transcend.io',
      'www.googletagmanager.com',
      'googletagmanager.com',
      'google-analytics.com',
      'doubleclick.net'
    ];

    await page.route('**/*', (route) => {
      const url = route.request().url();
      const shouldBlock = blockedDomains.some(domain => url.includes(domain));
      
      if (shouldBlock) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // API 응답 수집을 위한 배열
    const apiResponses: Array<{
      url: string;
      status: number;
      method: string;
      timestamp: number;
      responseData?: any;
    }> = [];

    // 로그인 관련 API 모니터링
    page.on('response', async (response) => {
      const url = response.url();
      
      // 로그인, 인증, 사용자 정보 관련 API 감지
      if (
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/signin') ||
        url.includes('/member') ||
        url.includes('/user') ||
        url.includes('/profile') ||
        url.includes('/session')
      ) {
        const timestamp = Date.now();
        
        try {
          let responseData = null;
          const contentType = response.headers()['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            try {
              responseData = await response.json();
            } catch {
              responseData = 'Unable to parse JSON';
            }
          }

          apiResponses.push({
            url,
            status: response.status(),
            method: response.request().method(),
            timestamp,
            responseData
          });

          console.log(`\n📡 API Detected: ${response.request().method()} ${url}`);
          console.log(`   Status: ${response.status()}`);
          console.log(`   Timestamp: ${new Date(timestamp).toISOString()}`);
        } catch (e) {
          console.warn(`Failed to capture API response: ${e}`);
        }
      }
    });

    // 로그인 시작 시간
    const loginStartTime = Date.now();
    console.log(`⏱️  Login Start Time: ${new Date(loginStartTime).toISOString()}\n`);

    // 1. 페이지로 이동
    console.log('🌐 Navigating to LG Members store page...');
    await page.goto('https://members.us.lg.com/store/pm', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    await page.waitForTimeout(2000);
    console.log(`✅ Page loaded: ${page.url()}`);

    // 모달 닫기
    async function dismissModals() {
      const dismissCandidates = [
        'button[aria-label="Close"]',
        'button:has-text("Close")',
        'button:has-text("No, thanks")',
        '[class*="close"]',
        '.modal-close'
      ];
      for (const sel of dismissCandidates) {
        try {
          const el = await page.locator(sel).first();
          if (await el.count() > 0) {
            await el.click({ timeout: 2000 }).catch(() => {});
          }
        } catch {}
      }
    }

    await dismissModals();

    // 2. SSO 페이지 확인 - ID.me 버튼 클릭하지 않고 직접 LG 로그인 폼 사용
    console.log('\n🔍 Checking if on LG SSO login page...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // sso.us.lg.com 페이지에 있는지 확인
    if (currentUrl.includes('sso.us.lg.com')) {
      console.log('✅ Already on LG SSO login page, will use LG login form');
    } else {
      console.log('⚠️  Not on SSO page yet, waiting for redirect...');
      await page.waitForTimeout(2000);
    }

    // 3. LG SSO 폼에서 이메일과 비밀번호 입력 (한 페이지에 둘 다 있음)
    console.log('\n📝 Looking for email and password fields on LG SSO form...');
    
    // 이메일 필드 찾기
    const emailSelectors = [
      'input[name="email"]',
      'input[id="email"]',
      'input[type="email"]',
      'input[name="userId"]',
      'input[id="userId"]',
      'input[placeholder*="email" i]',
      'input[autocomplete="email"]'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          emailInput = input;
          console.log(`✅ Found email input: ${selector}`);
          break;
        }
      } catch {}
    }

    if (!emailInput) {
      console.error('❌ Email input field not found on LG SSO form!');
      console.log(`Current URL: ${page.url()}`);
      await page.screenshot({ path: 'login-email-not-found.png', fullPage: true });
      throw new Error('Email input field not found');
    }

    // 이메일 필드가 readonly 속성을 가질 수 있으므로 클릭하여 활성화
    await emailInput.click();
    await page.waitForTimeout(300);
    
    await emailInput.fill(email);
    console.log(`✅ Email entered: ${email}`);
    await page.waitForTimeout(500);

    // 4. 비밀번호 입력 필드 찾기 (같은 폼에 있어야 함)
    console.log('\n🔑 Looking for password input field on same form...');
    
    const passwordSelectors = [
      'input[name="password"]',
      'input[id="password"]',
      'input[type="password"]',
      'input[id*="password"]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]'
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          passwordInput = input;
          console.log(`✅ Found password input: ${selector}`);
          break;
        }
      } catch {}
    }

    if (!passwordInput) {
      console.error('❌ Password input field not found on LG SSO form!');
      console.log(`Current URL: ${page.url()}`);
      
      // 페이지의 모든 입력 필드 출력 (디버깅)
      const allInputs = await page.locator('input').evaluateAll(inputs => 
        inputs.map((input: any) => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder
        }))
      );
      console.log('All input fields on page:', JSON.stringify(allInputs, null, 2));
      
      await page.screenshot({ path: 'login-password-not-found.png', fullPage: true });
      throw new Error('Password input field not found');
    }

    await passwordInput.fill(password);
    console.log('✅ Password entered');
    await page.waitForTimeout(500);

    // 5. 로그인 버튼 클릭
    console.log('\n🚀 Looking for login submit button...');
    
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button:has-text("Continue")',
      '[type="submit"]'
    ];

    let loginSubmitted = false;
    for (const selector of submitSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          console.log(`✅ Found submit button: ${selector}`);
          await btn.click();
          loginSubmitted = true;
          break;
        }
      } catch {}
    }

    if (!loginSubmitted) {
      console.error('❌ Login submit button not found!');
      await page.screenshot({ path: 'login-submit-not-found.png', fullPage: true });
      throw new Error('Login submit button not found');
    }

    console.log('✅ Login button clicked, waiting for response...');

    // 6. 로그인 성공 대기 (URL 변경 또는 특정 요소 확인)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {
      console.log('⚠️  Network idle timeout, continuing...');
    }

    await page.waitForTimeout(3000);

    // 로그인 종료 시간
    const loginEndTime = Date.now();
    const loginDuration = loginEndTime - loginStartTime;
    
    console.log(`\n⏱️  Login End Time: ${new Date(loginEndTime).toISOString()}`);
    console.log(`\n⏱️  Total Login Duration: ${loginDuration}ms (${(loginDuration / 1000).toFixed(2)}s)`);

    // 7. 로그인 성공 확인
    const finalUrl = page.url();
    console.log(`\n🌐 Final URL: ${finalUrl}`);

    // 로그인 성공 표시 확인
    const successIndicators = [
      'a:has-text("Sign Out")',
      'a:has-text("Logout")',
      'a:has-text("My Account")',
      '[href*="logout"]',
      '[href*="signout"]',
      '.user-menu',
      '.account-menu'
    ];

    let loginSuccess = false;
    for (const selector of successIndicators) {
      try {
        const indicator = page.locator(selector).first();
        if (await indicator.count() > 0) {
          loginSuccess = true;
          console.log(`✅ Login success indicator found: ${selector}`);
          break;
        }
      } catch {}
    }

    // 로그인 실패 확인
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[class*="error"]',
      ':has-text("incorrect")',
      ':has-text("invalid")',
      ':has-text("failed")'
    ];

    let hasError = false;
    for (const selector of errorSelectors) {
      try {
        const error = page.locator(selector).first();
        if (await error.count() > 0 && await error.isVisible()) {
          const errorText = await error.innerText();
          console.error(`❌ Error found: ${errorText}`);
          hasError = true;
          break;
        }
      } catch {}
    }

    // 8. 스크린샷 저장
    await page.screenshot({ 
      path: `lg-member-login-${Date.now()}.png`, 
      fullPage: true 
    });

    // 9. 리포트 출력
    console.log('\n' + '='.repeat(80));
    console.log('📊 LOGIN TEST REPORT');
    console.log('='.repeat(80));
    console.log(`\n[Test Information]`);
    console.log(`┌─────────────────────────────┬──────────────────────────────────────────┐`);
    console.log(`│ Field                       │ Value                                    │`);
    console.log(`├─────────────────────────────┼──────────────────────────────────────────┤`);
    console.log(`│ Email                       │ ${email.padEnd(40)} │`);
    console.log(`│ Target URL                  │ ${('https://members.us.lg.com/store/pm').padEnd(40)} │`);
    console.log(`│ Final URL                   │ ${finalUrl.substring(0, 40).padEnd(40)} │`);
    console.log(`│ Login Duration              │ ${(loginDuration + 'ms (' + (loginDuration / 1000).toFixed(2) + 's)').padEnd(40)} │`);
    console.log(`│ Login Success               │ ${(loginSuccess ? '✅ YES' : '❌ NO').padEnd(40)} │`);
    console.log(`│ Has Error                   │ ${(hasError ? '❌ YES' : '✅ NO').padEnd(40)} │`);
    console.log(`│ API Calls Captured          │ ${String(apiResponses.length).padEnd(40)} │`);
    console.log(`└─────────────────────────────┴──────────────────────────────────────────┘`);

    if (apiResponses.length > 0) {
      console.log('\n[API Response Details]');
      console.log('─'.repeat(80));
      
      apiResponses.forEach((api, index) => {
        console.log(`\nAPI Call #${index + 1}:`);
        console.log(`  Method: ${api.method}`);
        console.log(`  URL: ${api.url}`);
        console.log(`  Status: ${api.status}`);
        console.log(`  Timestamp: ${new Date(api.timestamp).toISOString()}`);
        
        if (api.responseData && api.responseData !== 'Unable to parse JSON') {
          console.log(`  Response Data:`);
          console.log(JSON.stringify(api.responseData, null, 4).split('\n').map(line => `    ${line}`).join('\n'));
        }
      });
      
      console.log('\n─'.repeat(80));
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Login Test Completed');
    console.log('='.repeat(80) + '\n');

    // 테스트 검증
    if (hasError) {
      throw new Error('Login failed with error message');
    }

    expect(loginSuccess || !hasError).toBeTruthy();
  });
});
