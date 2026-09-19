import { expect, test } from '@playwright/test';

import { restingGapBelowStickyHeader } from './sticky-header';

/**
 * The routing rules, exercised the way a reader meets them.
 *
 * Every case here is a link a person can actually follow. Where a control is
 * present in the DOM but hidden — the platform tabs sit inside the category
 * section, which is `hidden` while search results are showing — the test
 * drives the reachable order instead of forcing a click nobody can perform.
 */

const HOME = '.help-center-home';

/*
 * Two headings can be present at once: the results section, and the category
 * section behind it that is `hidden` while results show. So each is addressed
 * by what makes it itself, not by a class both of them carry.
 */
const RESULTS = 'section[aria-label="Search results"] h1';
const TITLE = '#help-center-category-title';

test('the bare URL opens the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator(HOME)).toBeVisible();
  await expect(page.locator('h1')).toHaveText('How can we help?');
  // Not the category view: the sidebar does not exist on this page.
  await expect(page.locator('.help-center-sidebar')).toHaveCount(0);
});

test('a home card opens its first subcategory', async ({ page }) => {
  await page.goto('/');

  await page.locator('.help-home-card', { hasText: 'Getting started' }).click();

  await expect(page).toHaveURL(/#setup-and-basic-use$/);
  await expect(page.locator(TITLE)).toHaveText('Setup and basic use');
  await expect(page.locator('.help-center-sidebar')).toBeVisible();
});

test('subcategory to article to home, by the brand mark', async ({ page }) => {
  await page.goto('/#setup-and-basic-use');

  await page.locator('.help-center-card-link').first().click();
  await expect(page.locator(TITLE)).toHaveText('How to install Bread Wallet');

  await page.locator('.help-center-desktop-brand').click();

  await expect(page.locator(HOME)).toBeVisible();
});

test('the brand mark is a way out of search results', async ({ page }) => {
  await page.goto('/');

  await page.locator('.help-home-popular button', { hasText: 'Guardian' }).click();
  await expect(page.locator(RESULTS)).toContainText('results for');

  await page.locator('.help-center-desktop-brand').click();

  // The regression this guards: the hash changed and nothing else, so the one
  // control promising a way out of the results kept rendering them.
  await expect(page.locator(HOME)).toBeVisible();
  await expect(page).toHaveURL(/\/(#)?$/);
});

test('a shared ?q= link opens the results it names', async ({ page }) => {
  await page.goto('/?q=guardian');

  await expect(page.locator(RESULTS)).toContainText('for “guardian”');
  await expect(page.locator('.help-center-card-link').first()).toBeVisible();
});

test('searching keeps the platform, and the platform keeps the search', async ({ page }) => {
  // The stated case — choosing Mobile with a search active — is not reachable:
  // the tabs live inside the section that is hidden while results show. This
  // is the same invariant in the order a reader can perform, plus the reverse.
  await page.goto('/#setup-and-basic-use');
  await page.locator('.help-center-platform-tabs button', { hasText: 'Mobile' }).click();
  await expect(page).toHaveURL(/platform=mobile/);

  await page.locator('.help-center-search input').fill('guardian');
  await expect(page.locator(RESULTS)).toContainText('for “guardian”');
  await expect(page).toHaveURL(/platform=mobile/);
  await expect(page).toHaveURL(/q=guardian/);

  // And clearing the search must not cost the platform.
  await page.locator('.help-center-search input').fill('');
  await expect(page).toHaveURL(/platform=mobile/);
  await expect(page).not.toHaveURL(/q=/);
});

test('the footer is on every page, not only the home page', async ({ page }) => {
  // It began inside the home page, which left the article pages — where a
  // reader is most likely to want the support form or the legal documents —
  // as the only ones without it.
  const footer = page.locator('.help-center-footer');
  const legal = footer.getByRole('link', { name: 'Privacy Policy' });

  for (const route of [
    '/',
    '/#setup-and-basic-use',
    '/#setup-and-basic-use/how-to-install-bread-wallet',
    '/?q=guardian'
  ]) {
    await page.goto(route);
    await expect(footer, route).toBeVisible();
    await expect(legal, route).toHaveAttribute('href', 'https://0xmiden.github.io/wallet/privacy/');
    // One contentinfo landmark per page: the security reminder inside <main>
    // is not one, and must not become one.
    await expect(page.getByRole('contentinfo'), route).toHaveCount(1);
  }
});

test('the header links sit on the centre line of the page', async ({ page }) => {
  // Centred by a three-track grid with equal outer columns, not by pushing
  // them out of the way of the button: with `space-between` the links landed
  // wherever the brand and the button happened to leave room.
  await page.goto('/');

  const nav = await page.locator('.help-home-nav').boundingBox();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  if (nav === null) throw new Error('the header nav was not rendered');

  const navCentre = nav.x + nav.width / 2;
  expect(Math.abs(navCentre - width / 2)).toBeLessThan(2);
});

test('the persistent brand carries the Help Center product label once', async ({ page }) => {
  for (const route of ['/', '/#setup-and-basic-use']) {
    await page.goto(route);
    await expect(page.locator('.public-brand'), route).toHaveText('Bread WalletHelp Center');
    await expect(page.locator('.public-product-name'), route).toHaveText('Help Center');
    const remainingBrands = page.locator('.help-center-brand:not(.public-brand)');
    for (let i = 0; i < (await remainingBrands.count()); i++) {
      await expect(remainingBrands.nth(i), route).toHaveText('Bread Wallet');
    }
  }
});

test('the footer brand sits at the left edge of the page, not in from it', async ({ page }) => {
  // Capped and centred, the frame left a wide gap before the logo — 183px
  // inside the content column at 1950, and 351px on the home page.
  await page.setViewportSize({ width: 1600, height: 900 });

  for (const [route, container] of [
    ['/', '.help-center-footer'],
    ['/#setup-and-basic-use', '.help-center-footer']
  ] as const) {
    await page.goto(route);
    const footer = await page.locator(container).boundingBox();
    const logo = await page.locator('.help-center-footer .help-center-brand').boundingBox();
    if (footer === null || logo === null) throw new Error(`no footer on ${route}`);

    // Within the footer's own padding, and nowhere near its middle.
    expect(logo.x - footer.x, route).toBeLessThan(40);
  }
});

test('the header links are pills that highlight on hover', async ({ page }) => {
  await page.goto('/');

  const background = (name: string) =>
    page
      .locator('.help-home-nav a', { hasText: name })
      .evaluate(element => getComputedStyle(element).backgroundColor);

  // The page the reader is on carries a tint at rest; the other does not.
  expect(await background('Help Center')).not.toBe('rgba(0, 0, 0, 0)');
  expect(await background('All topics')).toBe('rgba(0, 0, 0, 0)');

  await page.locator('.help-home-nav a', { hasText: 'All topics' }).hover();
  await expect
    .poll(() => background('All topics'))
    .not.toBe('rgba(0, 0, 0, 0)');
});

test('the footer is byte-for-byte the same markup on every page', async ({ page }) => {
  // "All pages must have the home page's footer." Asserting the rendered
  // markup rather than a handful of properties: the ways it drifted before —
  // a copyright moved into the sidebar, a brand column indented by a centred
  // frame — would each have slipped past a spot check.
  const footers: string[] = [];

  for (const route of ['/', '/#setup-and-basic-use', '/#guardian-protection/what-is-guardian']) {
    await page.goto(route);
    footers.push(await page.locator('.help-center-footer').innerHTML());
  }

  expect(footers[1], 'category page differs from home').toBe(footers[0]);
  expect(footers[2], 'article page differs from home').toBe(footers[0]);
});

test('every page states its copyright once, and the sidebar never covers the footer', async ({
  page
}) => {
  for (const route of ['/', '/#setup-and-basic-use', '/#guardian-protection/what-is-guardian']) {
    await page.goto(route);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.getByText(/©\s*\d{4} Bread Wallet\./), route).toHaveCount(1);

    // The footer used to be a grid item beside the sidebar, which — sticky and
    // 100vh — overflowed its row and painted 287px over it.
    const footer = await page.locator('.help-center-footer').boundingBox();
    const sidebar = await page.locator('.help-center-sidebar').count();
    if (footer === null) throw new Error(`no footer on ${route}`);

    if (sidebar > 0) {
      const box = await page.locator('.help-center-sidebar').boundingBox();
      if (box === null) throw new Error(`no sidebar box on ${route}`);
      expect(box.y + box.height, route).toBeLessThanOrEqual(footer.y + 1);
    }

    // The same footer on every page: full width, brand against the left edge.
    expect(footer.x, route).toBe(0);
  }
});

test('back to top appears once scrolled, returns the reader, and skips the home page', async ({
  page
}) => {
  const button = page.getByRole('button', { name: 'Back to top' });

  // Both a long listing and a short article. "What is Guardian?" scrolls 287px
  // in total, so a fixed 400px threshold left the button hidden in the footer
  // — the one place it is for.
  for (const route of ['/#setup-and-basic-use', '/#guardian-protection/what-is-guardian']) {
    await page.goto(route);
    await expect(button, route).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(button, route).toBeVisible();
  }

  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // Focus goes with the viewport. Scrolling alone would leave a keyboard
  // reader's focus in the footer they just left.
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id ?? ''))
    .toBe('help-center-content');

  // Not on the home page: one screen of hero, cards and footer.
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(button).toHaveCount(0);
});

test('a focused search box is ringed by its pill, not by a rectangle inside it', async ({ page }) => {
  /*
   * The affordance belongs to the wrapper on both search boxes: it is the
   * shape the control actually has. An outline on the input draws a rectangle
   * inside the pill, which is what this guards.
   *
   * It has happened twice. The rule that suppresses the input's own outline
   * named the category search only, so extending :focus-visible to the home
   * page switched a rectangle on inside a search box that had never shown one.
   * Driven with real keyboard focus, because :focus-visible does not reliably
   * fire on a programmatic .focus().
   */
  for (const [route, wrapper] of [
    ['/', '.help-home-search-form'],
    ['/#setup-and-basic-use', '.help-center-search']
  ] as const) {
    await page.goto(route);

    const input = page.locator(`${wrapper} input`);
    await input.click();

    const outline = await input.evaluate(element => {
      const style = getComputedStyle(element);
      return `${style.outlineStyle} ${style.outlineWidth}`;
    });
    expect(outline, `${route}: the input itself must not draw a ring`).toContain('none');

    // The wrapper still has to show the focus, or suppressing the input's
    // outline would be an accessibility regression rather than a fix.
    const shadow = await page
      .locator(wrapper)
      .evaluate(element => getComputedStyle(element).boxShadow);
    expect(shadow, `${route}: the wrapper must show the focus instead`).not.toBe('none');
  }
});

test('every hover state actually changes something', async ({ page }) => {
  /*
   * Three bugs this session were the same shape: a rule that exists, reads
   * correctly, and does nothing. The underline-on-hover rule named a root
   * class that is not in the markup. The sidebar hover set --help-copy over
   * --text-body, two tokens that were different on the dark ground and are
   * both #484848 on the light one, and painted a 6% tint that survived the
   * inversion as twenty-one channel steps from white.
   *
   * Reading the CSS cannot catch that. Hovering can — but only if it watches
   * the right properties. The first version of this test compared every
   * property at once and passed the dead sidebar hover, because a global rule
   * underlines any link in the shell and that alone counted as "something
   * changed". A surface is checked for a surface change; a text link is
   * allowed to answer with its underline.
   */
  const SURFACE = ['backgroundColor', 'color', 'borderTopColor', 'transform', 'opacity'] as const;
  const TEXT = ['color', 'textDecorationLine'] as const;

  const targets = [
    ['/', '.help-home-card', 'a home category card', SURFACE, null],
    ['/', '.help-home-section-link', 'the View all topics link', TEXT, null],
    ['/', '.help-home-nav a:not([aria-current])', 'a header nav pill', SURFACE, null],
    ['/#setup-and-basic-use', '.help-center-card', 'a subcategory article card', SURFACE, null],
    [
      '/#setup-and-basic-use',
      '.help-center-navigation-heading:not(.is-active)',
      'a sidebar group heading',
      SURFACE,
      null
    ],
    [
      '/#setup-and-basic-use',
      '.help-center-category-list a:not(.is-active)',
      'a sidebar subcategory',
      SURFACE,
      // The only open group is the active one, and its single subcategory is
      // the active row. Open another to get at a resting one, which is what a
      // reader does before hovering it anyway.
      'Manage wallet'
    ],
    [
      '/#setup-and-basic-use',
      ".help-center-platform-tabs button[aria-selected='false']",
      'the unselected platform tab',
      SURFACE,
      null
    ],
    ['/#setup-and-basic-use', '.help-center-sidebar-utility', 'the sidebar glossary link', SURFACE, null],
    [
      '/#moving-across-chains/what-is-the-difference-between-a-solver-route-and-a-canonical-bridge',
      '.help-center-article-body figure > a',
      'a diagram link',
      TEXT,
      null
    ]
  ] as const;

  /*
   * Returns the channels, not a string, so the change can be weighed. "Any
   * difference at all" was not a strong enough bar: the group headings hovered
   * to a 6% accent tint, which is a real change and an invisible one — 21
   * channel steps from white, against 36 for the 10% the rest of the sidebar
   * uses. A test that passes a hover nobody can see is not testing the thing
   * that matters.
   */
  const read = (locator: ReturnType<typeof page.locator>, props: readonly string[]) =>
    locator.evaluate((element, names) => {
      const style = getComputedStyle(element) as unknown as Record<string, string>;
      const channels: number[] = [];
      for (const name of names) {
        const value = style[name] ?? '';
        const numbers = value.match(/[\d.]+/g);
        if (name === 'backgroundColor' || name === 'color' || name === 'borderTopColor') {
          const [r, g, b] = (numbers ?? ['0', '0', '0']).map(Number) as [number, number, number];
          const alpha = numbers && numbers.length > 3 ? Number(numbers[3]) : 1;
          // Composite onto the parent, so a tint's real weight is measured
          // rather than its nominal alpha.
          const parent = element.parentElement;
          const backdrop = (parent ? getComputedStyle(parent).backgroundColor : 'rgb(255,255,255)')
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? [255, 255, 255];
          channels.push(
            ...[r, g, b].map((channel, index) =>
              Math.round(channel * alpha + (backdrop[index] as number) * (1 - alpha))
            )
          );
        } else if (name === 'textDecorationLine') {
          // An underline appearing or vanishing is perceptible whatever its
          // numbers say, so it is scored as such rather than by string length.
          channels.push(value === 'none' ? 0 : 100);
        } else {
          channels.push(...(numbers ?? []).map(Number), value.length);
        }
      }
      return channels;
    }, props as string[]);

  const distance = (a: readonly number[], b: readonly number[]) =>
    a.reduce((total, value, index) => total + Math.abs(value - (b[index] ?? 0)), 0);

  // 6% accent on white measures 21; the 10% the sidebar uses measures 36.
  const PERCEPTIBLE = 24;

  for (const [route, selector, label, props, openGroup] of targets) {
    await page.goto(route);
    if (openGroup !== null) {
      await page.locator('.help-center-navigation-heading', { hasText: openGroup }).click();
      await expect(page.locator(selector).first()).toBeVisible();
    }
    // Park the pointer somewhere harmless first: measuring "rest" while the
    // mouse still sits on the element from a previous step is how a hover
    // underline once got recorded as the resting state.
    await page.mouse.move(4, 4);
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded();

    const rest = await read(element, props);
    await element.hover();
    await expect
      .poll(() => read(element, props).then(hover => distance(rest, hover)), {
        message: `${label} changes too little on hover to be seen`
      })
      .toBeGreaterThanOrEqual(PERCEPTIBLE);
  }
});

test('an On this page link lands below the sticky header on narrow screens', async ({ page }) => {
  // The same anchor jump the glossary's entry links make, on article sections.
  // Below 900px the header sticks to the top of the viewport, and a section
  // scrolled to the very top sat underneath it: 32px down, under a 77px header.
  // 900 is the widest width the header sticks at. The longest article with
  // more than one section, so the first section can be scrolled to the top.
  for (const width of [390, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('about:blank');
    await page.goto('/#security-and-recovery/how-do-i-keep-my-wallet-secure');

    const link = page.getByRole('navigation', { name: 'On this page' }).getByRole('link').first();
    await expect(link, `${width}px`).toBeVisible();
    const heading = page.locator(`[id="${((await link.getAttribute('href')) ?? '').slice(1)}"]`);

    await link.click();
    expect(
      await restingGapBelowStickyHeader(page, heading),
      `${width}px: the section heading is under the header`
    ).toBeGreaterThanOrEqual(0);
  }
});

test('the home header fits every width: no sideways scroll, pills centred or hidden', async ({ page }) => {
  /*
   * From 621 to 655px the page scrolled sideways, 35px at 621. Brand, pills
   * and button need 705px to sit with the pills centred, but the pills only
   * hid at 620 and below, so across the band the grid pushed the button past
   * the edge; up to 705 it also pulled the pills off the centre line and ran
   * the button into the header's padding.
   *
   * A sweep rather than a few points, so a longer label or a wider font fails
   * here instead of quietly reopening a band nobody measures. Either of the
   * header's two states passes: pills hidden, or pills centred with the button
   * inside the padding.
   */
  await page.goto('/');

  const widths = [
    ...Array.from({ length: 761 - 600 }, (_, i) => 600 + i),
    ...Array.from({ length: 34 }, (_, i) => 780 + i * 20)
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const state = await page.evaluate(() => {
      const header = document.querySelector('.help-home-header') as HTMLElement;
      const inner = header.getBoundingClientRect().right - parseFloat(getComputedStyle(header).paddingRight);
      const nav = (document.querySelector('.help-home-nav') as HTMLElement).getBoundingClientRect();
      const button = (document.querySelector('.help-home-header-action') as HTMLElement).getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        pillsShown: [...document.querySelectorAll('.help-home-nav a')].some(
          pill => getComputedStyle(pill).display !== 'none'
        ),
        offCentre: Math.abs(nav.left + nav.width / 2 - document.documentElement.clientWidth / 2),
        intoPadding: button.right - inner
      };
    });

    expect(state.overflow, `${width}px: the page scrolls sideways`).toBeLessThanOrEqual(0);
    if (state.pillsShown) {
      expect(state.offCentre, `${width}px: the pills are off the centre line`).toBeLessThan(2);
      expect(state.intoPadding, `${width}px: the button runs into the padding`).toBeLessThanOrEqual(0.5);
    }
  }
});

test('the sidebar names its categories without numbering them', async ({ page }) => {
  // Every group heading carried a 01–05 badge and every subcategory row a 01.
  // They were removed by Ivan's call on 2026-09-10; this keeps them gone.
  await page.goto('/#guardian-protection/what-is-guardian');

  const tree = page.getByRole('navigation', { name: 'Help Center categories' });
  await expect(tree).toBeVisible();

  const labels = await tree.locator('button, a').allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  for (const label of labels) expect(label.trim(), `"${label}" carries a number`).not.toMatch(/^\d|\d$/);
});

test('the previous and next cards name their direction without numbering it', async ({ page }) => {
  // Each card carried a 01, 02 or 03 beside Previous and Next. They were removed
  // by Ivan's call on 2026-09-10; this keeps them gone on an article and on a
  // subcategory page, whose cards are built from different positions.
  for (const path of ['/#security-and-recovery/how-do-i-keep-my-wallet-secure', '/#security-and-recovery']) {
    await page.goto('about:blank');
    await page.goto(path);

    const labels = page.getByRole('navigation', { name: /sequence/i }).locator('.help-center-sequence-meta');
    await expect(labels, path).toHaveCount(2);
    for (const label of await labels.allTextContents()) {
      expect(label, `${path}: "${label}" carries a number`).not.toMatch(/\d/);
    }
  }
});

test('search results show alone, even over an article with a side rail', async ({ page }) => {
  // Same cause as on the glossary: the hidden article behind the results used to
  // stay on screen because the rail layout's display: grid outranked [hidden].
  // Wide enough for the rail to sit beside the article, so that grid is in play.
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#common-issues-and-support/my-token-is-stuck-on-consuming-receiver-address');
  await expect(page.locator('.help-center-rail')).toBeVisible();
  await expect(page.locator('.help-center-category.has-rail')).toHaveCSS('display', 'grid');

  await page.locator('.help-center-search input').fill('guardian');

  await expect(page.locator(RESULTS)).toBeVisible();
  await expect(page.locator('.help-center-article-body')).toBeHidden();
});
