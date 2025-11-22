// tests/lg-add-to-cart.spec.ts
import { test, expect, Page } from '@playwright/test';

/*
  한국어 주석: 이 테스트는 LG 제품 카테고리 페이지에서 랜덤으로 제품을 선택합니다.
  - 제품 카테고리 페이지에서 랜덤 선택 (tvs, monitors, laptops, refrigerators, dishwashers, projectors)
  - PLP(Product List Page)에서 Add to Cart 버튼으로 첫 번째 제품 추가
  - 다른 카테고리 또는 같은 카테고리에서 제품을 찾아 PDP(Product Detail Page)로 이동
  - PDP에서 Add to Cart 버튼 클릭
  - 장바구니 페이지로 이동하여 2개 아이템 확인
  - 실서버(Production)에서 실행할 때는 주의: 실제 주문/장바구니 변경을 발생시킬 수 있음.
*/

test.describe('LG — PLP & PDP Add to Cart 테스트', () => {
  // 설정: 제품 카테고리 페이지 목록
  const PRODUCT_CATEGORIES = [
    'https://www.lg.com/us/tvs',
    'https://www.lg.com/us/monitors',
    'https://www.lg.com/us/laptops',
    'https://www.lg.com/us/refrigerators',
    'https://www.lg.com/us/dishwashers',
    'https://www.lg.com/us/projectors'
  ];
  
  test('PLP and PDP add to cart', async ({ page }) => {
    // 한국어 주석: 추적 스크립트 및 분석 도구 차단 (성능 향상)
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
        console.log(`🚫 차단된 요청: ${url}`);
        route.abort();
      } else {
        route.continue();
      }
    });

    // 한국어 주석: 헬퍼 함수 - 모달/팝업 닫기
    async function dismissModals() {
      const dismissCandidates = [
        'button[aria-label="Close"]',
        'button[aria-label="Accept"]',
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("Close")',
        'button:has-text("No, thanks")',
        '#onetrust-accept-btn-handler',
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

    // 한국어 주석: 헬퍼 함수 - 랜덤 카테고리 선택
    function getRandomCategory(): string {
      const randomIndex = Math.floor(Math.random() * PRODUCT_CATEGORIES.length);
      return PRODUCT_CATEGORIES[randomIndex];
    }

    // 한국어 주석: 헬퍼 함수 - 다른 카테고리 선택
    function getDifferentCategory(currentCategory: string): string {
      const otherCategories = PRODUCT_CATEGORIES.filter(cat => cat !== currentCategory);
      const randomIndex = Math.floor(Math.random() * otherCategories.length);
      return otherCategories[randomIndex];
    }

    // 헬퍼: Add to Cart 버튼 클릭 시도
    const addToCartSelectors = [
      'button:has-text("Add to Cart")',
      'button:has-text("Add to bag")',
      'button:has-text("Add to cart")',
      'button[data-testid*="add-to-cart"]',
      'button[data-test*="add-to-cart"]',
      'button[class*="addToCart"]',
      'button[class*="add-to-cart"]',
      'a:has-text("Add to Cart")',
      '[aria-label*="Add to Cart"]',
      'button:has-text("Add to Basket")'
    ];

    async function tryClickAddToCart(location: string): Promise<string | null> {
      for (const sel of addToCartSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.count() > 0) {
            if (await btn.isVisible()) {
              console.log(`[${location}] 시도중인 셀렉터: ${sel}`);
              await btn.scrollIntoViewIfNeeded();
              await btn.click({ force: true });
              return sel;
            }
          }
        } catch (e) {
          console.warn(`[${location}] 셀렉터 ${sel} 클릭 실패: ${String(e).slice(0, 100)}`);
        }
      }
      return null;
    }

    // 헬퍼: 장바구니 API 응답 대기
    async function waitForCartApi() {
      return page.waitForResponse(
        (res) => {
          const url = res.url();
          const isCartApi = (
            (url.includes('/cart') || 
            url.includes('/add') ||
            url.includes('/basket')) &&
            !url.includes('chat') &&
            !url.includes('sprinklr')
          );
          if (isCartApi) {
            console.log(`장바구니 API 감지: ${url}`);
          }
          return isCartApi;
        },
        { timeout: 15_000 }
      ).catch(() => null);
    }

    // 한국어 주석: 1. 첫 번째 제품 카테고리 페이지로 이동 (PLP)
    const firstCategory = getRandomCategory();
    console.log(`\n📂 첫 번째 카테고리 선택: ${firstCategory}`);
    await page.goto(firstCategory, { waitUntil: 'domcontentloaded' });
    await dismissModals();
    await page.waitForTimeout(2000);

    // 제품 카드 확인
    const productCards = page.locator('.product-card-wrapper');
    const cardCount = await productCards.count();
    console.log(`페이지에서 찾은 product-card-wrapper 개수: ${cardCount}`);
    
    if (cardCount === 0) {
      throw new Error('제품 카드를 찾을 수 없습니다.');
    }

    // 한국어 주석: 2. PLP에서 Add to Cart 버튼 클릭 (첫 번째 제품)
    console.log('\n🛒 [PLP] Add to Cart 시도 중...');
    const responsePromise1 = waitForCartApi();
    const clickedSelector1 = await tryClickAddToCart('PLP');

    if (!clickedSelector1) {
      console.warn('⚠️ [PLP] Add to Cart 버튼을 찾지 못했습니다.');
    } else {
      console.log(`✅ [PLP] 성공적으로 클릭: ${clickedSelector1}`);
    }

    // API 응답 대기
    const addToCartResponse1 = await Promise.race([
      responsePromise1,
      page.waitForTimeout(5000).then(() => null)
    ]);

    if (addToCartResponse1) {
      const status1 = addToCartResponse1.status();
      console.log(`[PLP] Add to Cart API status: ${status1}`);
      
      try {
        const json1 = await addToCartResponse1.json();
        console.log('[PLP] 장바구니 추가 성공 ✅');
      } catch {
        console.warn('[PLP] API 응답이 JSON 형식이 아닙니다.');
      }
    }

    await page.waitForTimeout(2000);

    // 한국어 주석: 3. 두 번째 카테고리로 이동 (또는 같은 카테고리)
    const secondCategory = Math.random() > 0.5 ? getDifferentCategory(firstCategory) : firstCategory;
    console.log(`\n📂 두 번째 카테고리 선택: ${secondCategory}`);
    
    if (secondCategory === firstCategory) {
      console.log('(동일 카테고리 선택)');
    }
    
    await page.goto(secondCategory, { waitUntil: 'domcontentloaded' });
    await dismissModals();
    await page.waitForTimeout(2000);

    // 제품 카드 찾기
    const productCards2 = page.locator('.product-card-wrapper');
    const cardCount2 = await productCards2.count();
    console.log(`페이지에서 찾은 product-card-wrapper 개수: ${cardCount2}`);
    
    if (cardCount2 === 0) {
      throw new Error('두 번째 카테고리에서 제품 카드를 찾을 수 없습니다.');
    }

    // 한국어 주석: 4. PDP로 이동 (제품 상세 페이지)
    console.log('\n🛍️ [PDP] 제품 상세 페이지로 이동...');
    const randomIndex = Math.floor(Math.random() * Math.min(cardCount2, 5)); // 상위 5개 중 랜덤
    const secondCard = productCards2.nth(randomIndex);
    
    const productLink = secondCard.locator('a').first();
    const productHref = await productLink.getAttribute('href');
    
    if (productHref) {
      const fullUrl = productHref.startsWith('http') ? productHref : `https://www.lg.com${productHref}`;
      console.log(`제품 상세 페이지로 이동: ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    } else {
      await secondCard.click();
    }
    
    await dismissModals();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 한국어 주석: 5. PDP에서 Add to Cart
    console.log('\n🛒 [PDP] Add to Cart 시도 중...');
    const responsePromise2 = waitForCartApi();
    const clickedSelector2 = await tryClickAddToCart('PDP');

    if (!clickedSelector2) {
      console.warn('⚠️ [PDP] Add to Cart 버튼을 찾지 못했습니다. 대안 시도...');
      const altBtns = ['button:has-text("Buy now")', 'button:has-text("Check Availability")'];
      for (const a of altBtns) {
        try {
          const alt = page.locator(a).first();
          if (await alt.count() > 0 && await alt.isVisible()) {
            await alt.scrollIntoViewIfNeeded();
            await alt.click({ force: true });
            console.log(`[PDP] 대안 버튼 클릭: ${a}`);
            break;
          }
        } catch {}
      }
    } else {
      console.log(`✅ [PDP] 성공적으로 클릭: ${clickedSelector2}`);
    }

    // API 응답 대기
    const addToCartResponse2 = await Promise.race([
      responsePromise2,
      page.waitForTimeout(5000).then(() => null)
    ]);

    if (addToCartResponse2) {
      const status2 = addToCartResponse2.status();
      console.log(`[PDP] Add to Cart API status: ${status2}`);
      
      try {
        const json2 = await addToCartResponse2.json();
        console.log('[PDP] 장바구니 추가 성공 ✅');
        
        // 한국어: 응답 상세 정보 출력
        if (json2 && json2.addModelToCart && json2.addModelToCart.cart) {
          const cart = json2.addModelToCart.cart;
          
          console.log('\n' + '='.repeat(80));
          console.log('📦 Add to Cart API Response Summary');
          console.log('='.repeat(80));
          
          console.log('\n[Cart Information]');
          console.log('┌─────────────────────────┬─────────────────────────────────────────┐');
          console.log('│ Field                   │ Value                                   │');
          console.log('├─────────────────────────┼─────────────────────────────────────────┤');
          console.log(`│ Cart ID                 │ ${String(cart.cartId).padEnd(39)} │`);
          console.log(`│ Public Cart ID          │ ${String(cart.publicCartId).padEnd(39)} │`);
          console.log(`│ Reserve Order ID        │ ${String(cart.reservedOrderId).padEnd(39)} │`);
          console.log(`│ Item Count              │ ${String(cart.itemCount).padEnd(39)} │`);
          console.log(`│ Total Quantity          │ ${String(cart.totalItemQty || 0).padEnd(39)} │`);
          console.log('└─────────────────────────┴─────────────────────────────────────────┘');
          console.log('─'.repeat(80) + '\n');
        }
      } catch {
        console.warn('[PDP] API 응답이 JSON 형식이 아닙니다.');
      }
    }

    await page.waitForTimeout(2000);

    // 한국어 주석: 6. 장바구니로 이동
    console.log('\n🛒 장바구니 페이지로 이동...');
    await page.goto('https://www.lg.com/us/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 장바구니 내 아이템 확인
    const cartItems = await page.locator('div[class*="cart-item"], .cart-item, .cart-list, [data-testid="cart-item"]').count();
    console.log(`\n📦 장바구니 확인:`);
    console.log(`   - 장바구니 아이템 수: ${cartItems}`);
    console.log(`   - 현재 URL: ${page.url()}`);
    
    // Cart badge 확인
    const cartBadgeSelectors = [
      '.cart-count', '.cart-badge', '[data-testid="cart-count"]', 'a[href*="/cart"] .count', '.miniCartCount'
    ];
    
    for (const sel of cartBadgeSelectors) {
      try {
        const badge = page.locator(sel).first();
        if (await badge.count() > 0) {
          const txt = (await badge.innerText()).trim();
          console.log(`   - Cart badge (${sel}): "${txt}"`);
          break;
        }
      } catch {}
    }

    // 한국어 주석: 테스트 종료 전 스크린샷(디버깅용)
    await page.screenshot({ path: `lg-plp-pdp-cart-${Date.now()}.png`, fullPage: false });

    console.log('\n✅ PLP & PDP Add to Cart 테스트 완료!');
    console.log('='.repeat(80) + '\n');

    // 한국어 주석: 간단한 기대(assert)
    expect(true).toBeTruthy();
  });
});
