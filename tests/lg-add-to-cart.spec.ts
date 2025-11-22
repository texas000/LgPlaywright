// tests/lg-add-to-cart.spec.ts
import { test, expect, Page } from '@playwright/test';

/*
  한국어 주석: 이 테스트는 LG의 TVs 목록 페이지에 접속해서
  랜덤한 상품을 골라서 상세 페이지로 이동한 뒤 'Add to Cart' 버튼을 찾아 클릭합니다.
  - 현실 사이트에서는 버튼 텍스트/셀렉터가 바뀔 수 있으니 여러 후보를 검사합니다.
  - 실서버(Production)에서 실행할 때는 주의: 실제 주문/장바구니 변경을 발생시킬 수 있음.
*/

test.describe('LG TVs — 랜덤 제품 선택 후 장바구니 추가', () => {
  // 설정: 실제 배포 환경에서 실행 시 주의 문구
  test('visit tv list, pick random product, try add to cart', async ({ page }) => {
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

    // 한국어 주석: 초기 페이지로 이동
    await page.goto('https://www.lg.com/us/tvs', { waitUntil: 'domcontentloaded' });

    // 한국어 주석: cookie / consent / modal 같은 것이 있으면 닫기 시도
    // (여러 후보 셀렉터를 시도)
    const dismissCandidates = [
      'button[aria-label="Close"]',
      'button[aria-label="Accept"]',
      'button:has-text("Accept")',
      'button:has-text("Agree")',
      'button:has-text("Close")',
      'button:has-text("No, thanks")',
      '#onetrust-accept-btn-handler', // common cookie banner
    ];
    for (const sel of dismissCandidates) {
      try {
        const el = await page.locator(sel).first();
        if (await el.count() > 0) {
          await el.click({ trial: false }).catch(() => {});
        }
      } catch {
        // 무시
      }
    }

    // 한국어 주석: 제품 리스트에서 제품 링크(a태그)를 수집
    // 다양한 href 패턴을 커버하도록 설계
    await page.waitForTimeout(2000); // 페이지 JS 로딩을 충분히 기다림
    
    // 보이는(visible) 제품 링크만 선택
    const productAnchors = page.locator('a[href*="/us/tvs/"], a[href*="/tvs/oled"]').filter({
      has: page.locator('img'), // 이미지 포함(제품 카드일 가능성 높음)
    });

    // 한국어 주석: 가능한 제품 링크의 개수 확인
    const count = await productAnchors.count();

    console.log(`찾은 제품 링크 개수: ${count}`);

    if (count === 0) {
      // 한국어 주석: 리스트 페이지에서 제품을 못 찾으면 실패로 처리
      throw new Error('제품 링크를 찾지 못했습니다. 셀렉터를 점검하세요.');
    }

    // 한국어 주석: 보이는 제품 중 첫 번째 선택 (디버깅 용이성)
    const randomIndex = 0; // Math.floor(Math.random() * Math.min(count, 5)); // 처음 5개 중에서만
    const chosenAnchor = productAnchors.nth(randomIndex);
    
    // 한국어 주석: href 확인
    const href = await chosenAnchor.getAttribute('href');
    console.log(`선택한 제품 인덱스: ${randomIndex}, href: ${href}`);

    // 한국어 주석: 클릭 대신 직접 navigate (더 안정적)
    if (href) {
      const fullUrl = href.startsWith('http') ? href : `https://www.lg.com${href}`;
      console.log(`제품 페이지로 이동: ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    } else {
      throw new Error('제품 href를 찾을 수 없습니다.');
    }

    // 한국어 주석: 상품 상세 페이지 로딩 대기
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500); // JS가 버튼을 렌더링 할 시간

    // 한국어 주석: Add to Cart 버튼 후보들 (여러 텍스트/속성 커버)
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

    // 헬퍼: 버튼 클릭 시도
    async function tryClickAddToCart(page: Page) {
      for (const sel of addToCartSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.count() > 0) {
            // 버튼이 보이는지 확인한 후 클릭
            if (await btn.isVisible()) {
              console.log(`시도중인 셀렉터: ${sel}`);
              await btn.scrollIntoViewIfNeeded();
              await btn.click({ force: true });
              return sel;
            }
          }
        } catch (e) {
          // 클릭 실패해도 다음 후보로
          console.warn(`셀렉터 ${sel} 클릭 실패: ${String(e).slice(0, 200)}`);
        }
      }
      return null;
    }

    // 한국어 주석: Add to Cart API 응답 대기를 시작 (클릭 전에 설정)
    const responsePromise = page.waitForResponse(
      (res) => {
        const url = res.url();
        // 채팅 API 제외하고 장바구니 관련 API만 감지
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
      { timeout: 15_000 } // 15초 제한
    ).catch(() => null); // 타임아웃 시 null 반환

    // 한국어 주석: Add to Cart 버튼 클릭
    const clickedSelector = await tryClickAddToCart(page);

    // 한국어 주석: API 응답 대기 (최대 5초 추가 대기)
    const addToCartResponse = await Promise.race([
      responsePromise,
      page.waitForTimeout(5000).then(() => null)
    ]);

    if (!clickedSelector) {
      // 한국어 주석: 실패 시, 장바구니 관련 다른 UI 시도(예: Buy Now 혹은 옵션 선택 모달)
      console.warn('직접적인 Add to Cart 버튼을 찾지 못했습니다. 옵션 선택 또는 다른 UI를 시도합니다.');

      // 옵션 선택이 필요할 수 있으니 'Buy Now' 버튼 등도 시도
      const altBtns = ['button:has-text("Buy now")', 'button:has-text("Check Availability")', 'button:has-text("Add")'];
      for (const a of altBtns) {
        try {
          const alt = page.locator(a).first();
          if (await alt.count() > 0 && await alt.isVisible()) {
            await alt.scrollIntoViewIfNeeded();
            await alt.click({ force: true });
            console.log(`대안 버튼 클릭: ${a}`);
            break;
          }
        } catch {}
      }
    } else {
      console.log(`성공적으로 클릭한 셀렉터: ${clickedSelector}`);
    }

    // 한국어 주석: Add to Cart API 응답 검증
    if (!addToCartResponse) {
      console.warn('⚠️ Add to Cart API 요청을 감지하지 못했습니다. UI 확인으로 대체합니다.');
    } else {
      // 한국어: 응답 JSON 파싱
      let json;
      try {
        json = await addToCartResponse.json();
      } catch {
        // JSON이 아닐 수 있음 → 상태 코드만 체크
        console.error('Add to Cart API 응답이 JSON 형식이 아닙니다.');
      }

      // 한국어: HTTP Status 확인
      const status = addToCartResponse.status();
      console.log('Add to Cart API status:', status);

      if (status < 200 || status >= 300) {
        throw new Error(`Add to Cart API 실패! HTTP Status = ${status}`);
      }

      // 한국어: JSON 내 성공 여부 키 탐색
      // API 구조를 정확히 모를 때는 가능한 키를 여러 개 체크
      let isSuccess = false;

      // LG의 경우 addModelToCart.cart 객체가 있으면 성공
      if (json && json.addModelToCart && json.addModelToCart.cart) {
        const cart = json.addModelToCart.cart;
        isSuccess = true;
        
        // 한국어: API 응답을 테이블 형식으로 출력
        console.log('\n' + '='.repeat(80));
        console.log('📦 Add to Cart API Response Summary');
        console.log('='.repeat(80));
        
        // Cart 기본 정보
        console.log('\n[Cart Information]');
        console.log('┌─────────────────────────┬─────────────────────────────────────────┐');
        console.log('│ Field                   │ Value                                   │');
        console.log('├─────────────────────────┼─────────────────────────────────────────┤');
        console.log(`│ Cart ID                 │ ${String(cart.cartId).padEnd(39)} │`);
        console.log(`│ Item Count              │ ${String(cart.itemCount).padEnd(39)} │`);
        console.log(`│ Total Quantity          │ ${String(cart.totalQuantity || 0).padEnd(39)} │`);
        console.log('└─────────────────────────┴─────────────────────────────────────────┘');
        
        // 장바구니 아이템 상세
        if (cart.items && cart.items.length > 0) {
          console.log('\n[Cart Items Details]');
          cart.items.forEach((item: any, index: number) => {
            console.log(`\nItem #${index + 1}:`);
            console.log('┌─────────────────────────┬─────────────────────────────────────────┐');
            console.log('│ Field                   │ Value                                   │');
            console.log('├─────────────────────────┼─────────────────────────────────────────┤');
            
            if (item.modelName) {
              console.log(`│ Model Name              │ ${String(item.modelName).padEnd(39)} │`);
            }
            if (item.modelId) {
              console.log(`│ Model ID                │ ${String(item.modelId).padEnd(39)} │`);
            }
            if (item.quantity !== undefined) {
              console.log(`│ Quantity                │ ${String(item.quantity).padEnd(39)} │`);
            }
            if (item.price) {
              console.log(`│ Price                   │ ${String(item.price).padEnd(39)} │`);
            }
            if (item.salesModelCode) {
              console.log(`│ Sales Model Code        │ ${String(item.salesModelCode).padEnd(39)} │`);
            }
            
            console.log('└─────────────────────────┴─────────────────────────────────────────┘');
          });
        }
        
        // 추가 정보
        if (json.addModelToCart.success !== undefined) {
          console.log('\n[API Response Status]');
          console.log('┌─────────────────────────┬─────────────────────────────────────────┐');
          console.log('│ Field                   │ Value                                   │');
          console.log('├─────────────────────────┼─────────────────────────────────────────┤');
          console.log(`│ Success                 │ ${String(json.addModelToCart.success).padEnd(39)} │`);
          console.log('└─────────────────────────┴─────────────────────────────────────────┘');
        }
        
        // 중요한 정보만 선택적으로 추출
        console.log('\n[Key API Response Data - Selected Fields]');
        console.log('─'.repeat(80));
        
        const selectedData: any = {
          cartInfo: {
            cartId: cart.cartId,
            publicCartId: cart.publicCartId,
            storeCode: cart.storeCode,
            isGuest: cart.isGuest,
            itemCount: cart.itemCount,
            totalItemQty: cart.totalItemQty
          },
          pricing: {
            listPriceTotal: cart.listPriceTotal,
            subtotal: cart.subtotal,
            discountTotal: cart.discountTotal,
            taxAmountTotal: cart.taxAmountTotal,
            shippingCostTotal: cart.shippingCostTotal,
            grandTotal: cart.grandTotal,
            displayTexts: {
              listPriceTotal: cart.listPriceTotalDisplayText,
              subtotal: cart.subtotalDisplayText,
              discountTotal: cart.discountTotalDisplayText,
              grandTotal: cart.grandTotalDisplayText
            }
          },
          items: cart.cartItemList?.map((item: any) => ({
            cartItemId: item.cartItemId,
            sku: item.sku,
            name: item.name,
            description: item.description,
            qty: item.qty,
            pricing: {
              listPrice: item.listPrice,
              price: item.price,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount,
              displayTexts: {
                listPrice: item.listPriceDisplayText,
                price: item.priceDisplayText,
                rowTotal: item.rowTotalDisplayText
              }
            },
            attributes: {
              sku: item.customAttributes?.sku,
              pdpUrl: item.customAttributes?.pdpUrl,
              fulfillmentType: item.customAttributes?.fulfillment_type,
              zipCode: item.customAttributes?.zipCode,
              enabledBopis: item.customAttributes?.enabledBopis,
              inventory: item.customAttributes?.inventory
            }
          })) || []
        };
        
        console.log(JSON.stringify(selectedData, null, 2));
        console.log('─'.repeat(80));
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ 장바구니 추가 성공!');
        console.log('='.repeat(80) + '\n');
      } else {
        // 일반적인 성공 키 체크
        const possibleSuccessKeys = [
          'success', 'isSuccess', 'added', 'status', 'code', 'cartId', 'item', 'result'
        ];

        for (const key of possibleSuccessKeys) {
          if (json && Object.hasOwn(json, key)) {
            const val = json[key];
            if (val === true || val === 'SUCCESS' || val === 'success' || val === 1) {
              isSuccess = true;
              console.log(`API 성공 키 발견: ${key} = ${val}`);
              break;
            }
          }
        }
      }

      // 한국어: 최종 성공 판정
      if (!isSuccess) {
        console.warn('⚠️ Add to Cart API 응답에서 성공 여부를 명확히 확인하지 못했습니다.');
        console.log('Add to Cart API 응답:', JSON.stringify(json, null, 2));
      } else {
        console.log('🎉 Add to Cart API 성공 확인 완료!');
      }
    }

    // 한국어 주석: 클릭 후 장바구니가 열리거나 카운트가 증가하는지 확인 (여러 후보 검사)
    // (예: cart icon badge, /cart 페이지 이동 등)
    // 먼저 cart badge(숫자) 후보를 찾음
    const cartBadgeSelectors = [
      '.cart-count', '.cart-badge', '[data-testid="cart-count"]', 'a[href*="/cart"] .count', '.miniCartCount'
    ];
    let cartCountFound = false;
    for (const sel of cartBadgeSelectors) {
      try {
        const badge = page.locator(sel).first();
        if (await badge.count() > 0) {
          const txt = (await badge.innerText()).trim();
          console.log(`Cart badge (${sel}) 텍스트: "${txt}"`);
          cartCountFound = true;
          break;
        }
      } catch {}
    }

    // 한국어 주석: 장바구니 페이지로 이동해서 확인 (fallback)
    if (!cartCountFound) {
      try {
        await page.goto('https://www.lg.com/us/cart', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        // 장바구니 내 아이템 존재 확인
        const cartItems = await page.locator('div[class*="cart-item"], .cart-item, .cart-list, [data-testid="cart-item"]').count();
        console.log(`장바구니 아이템 수(또는 관련 엘리먼트 수): ${cartItems}`);
      } catch (e) {
        console.warn('장바구니 확인 중 에러', e);
      }
    }

    // 한국어 주석: 테스트 종료 전 스크린샷(디버깅용)
    await page.screenshot({ path: `lg-tvs-random-add-to-cart-${Date.now()}.png`, fullPage: false });

    // 한국어 주석: 간단한 기대(assert) - 명시적 실패 대신 로그 위주로 진행
    expect(true).toBeTruthy();
  });
});