import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.getByTestId('map-canvas')).toBeVisible();
  return errors;
}

/** Center of a marker button, in page coordinates. */
async function center(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('loads without errors and shows a readout', async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByTestId('probe-delay')).toContainText('ms');
  await expect(page.getByTestId('guidance')).not.toBeEmpty();
  await expect(page.getByTestId('stats')).toContainText('Green zone covers');
  expect(errors).toEqual([]);
});

test('tapping the map moves the player marker', async ({ page }) => {
  await open(page);
  const before = await page.getByTestId('probe-position').textContent();
  const map = (await page.getByTestId('map').boundingBox())!;
  await page.mouse.click(map.x + map.width * 0.8, map.y + map.height * 0.2);
  await expect(page.getByTestId('probe-position')).not.toHaveText(before!);
});

test('dragging a time source updates the map, stats and URL, and the URL restores it', async ({ page }) => {
  await open(page);
  const statsBefore = await page.getByTestId('stats').textContent();
  const from = await center(page, 'ts-0');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x - 200, from.y - 60, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('stats')).not.toHaveText(statsBefore!);
  // The URL is updated shortly after the state changes; a missing param means it hasn't been written yet.
  await expect.poll(() => new URL(page.url()).searchParams.get('ts') ?? '192,56').not.toBe('192,56');
  await page.waitForTimeout(400); // let the last drag position land in the URL

  const url = page.url();
  const label = await page.getByTestId('ts-0').getAttribute('aria-label');
  await page.goto(url);
  await expect(page.getByTestId('ts-0')).toHaveAttribute('aria-label', label!);
});

test('markers can be moved with the keyboard', async ({ page }) => {
  await open(page);
  const marker = page.getByTestId('ts-0');
  const before = await marker.getAttribute('aria-label');
  await marker.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(marker).not.toHaveAttribute('aria-label', before!);
});

test('time sources can be added and removed', async ({ page }) => {
  await open(page);
  await page.getByTestId('add-ts').click();
  await expect(page.getByTestId('ts-1')).toBeVisible();
  await expect(page.getByTestId('probe-delay')).toBeVisible();
  await page.getByRole('button', { name: 'Remove source 2' }).click();
  await expect(page.getByTestId('ts-1')).toHaveCount(0);
});

test('entering a position by yard line and steps moves the time source', async ({ page }) => {
  await open(page);
  const before = await page.getByTestId('ts-0').getAttribute('aria-label');
  await page.getByLabel('Yard line', { exact: true }).selectOption('30');
  await expect(page.getByTestId('ts-0')).not.toHaveAttribute('aria-label', before!);
  await expect(page.getByTestId('ts-0')).toHaveAttribute('aria-label', /30 yardline/);
});

test('switching to a gym uses feet instead of football jargon', async ({ page }) => {
  await open(page);
  await page.getByLabel('Gym / basketball court (94 × 50 ft)').check();
  await expect(page.getByTestId('probe-position')).toContainText('ft from the left end');
  await expect(page.getByTestId('jargon-form')).toHaveCount(0);
  await page.getByLabel('Custom size').check();
  await page.getByLabel('Length').fill('150');
  await expect(page.getByTestId('map')).toBeVisible();
});

test('temperature and tempo change the numbers', async ({ page }) => {
  await open(page);
  const delay = page.getByTestId('probe-delay');
  const before = await delay.textContent();
  await page.getByLabel('Temperature').fill('20');
  await expect(delay).not.toHaveText(before!);

  await page.getByRole('button', { name: '+ Add tempo section' }).click();
  await page.getByTestId('bpm-1').fill('90');
  await expect(page.getByTestId('tempo-table')).toContainText('90');
});

test('tempo and section name fields can be cleared and retyped', async ({ page }) => {
  await open(page);
  const bpm = page.getByTestId('bpm-0');
  await bpm.fill('');
  await expect(bpm).toHaveValue('');
  await bpm.pressSequentially('90');
  await expect(bpm).toHaveValue('90');
  await bpm.blur();
  await expect(page.getByText(/^\d+\.\d\d at 90 bpm$/)).toBeVisible();

  const name = page.getByLabel('Section 1 name');
  await name.fill('');
  await expect(name).toHaveValue('');
  await name.pressSequentially('Opener');
  await expect(name).toHaveValue('Opener');

  // Leaving a name or tempo blank puts something sensible back.
  await name.fill('');
  await bpm.fill('');
  await bpm.blur();
  await expect(name).toHaveValue('Section 1');
  await expect(bpm).toHaveValue('90');
});

test('markers explain themselves on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is a mouse feature');
  await open(page);
  for (const [id, text] of [['ts-0', 'Time source 1'], ['fp', 'Focal point'], ['probe', 'Player marker']] as const) {
    await page.getByTestId(id).hover();
    await expect(page.getByTestId(`${id}-tip`)).toContainText(text);
    await expect(page.getByTestId(`${id}-tip`)).toHaveCSS('opacity', '1');
  }
});

test('the sidebar and main column scroll independently on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'two-column layout is for wide screens');
  await open(page);
  const mapBefore = (await page.getByTestId('map').boundingBox())!;
  const sidebar = page.getByTestId('sidebar');
  const box = (await sidebar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const mapAfter = (await page.getByTestId('map').boundingBox())!;
  expect(Math.round(mapAfter.y)).toBe(Math.round(mapBefore.y));

  const main = page.getByTestId('main-column');
  const mbox = (await main.boundingBox())!;
  await page.mouse.move(mbox.x + mbox.width / 2, mbox.y + mbox.height / 2);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  expect(await sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
});

test('the delay demo can be started and stopped', async ({ page }) => {
  await open(page);
  const play = page.getByTestId('play');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'false');
});

test('the calculation explanation shows the numbers', async ({ page }) => {
  await open(page);
  await page.getByText('How is this calculated?').click();
  await expect(page.getByRole('table')).toContainText('Time source → player');
});

test('patterns toggle works', async ({ page }) => {
  const errors = await open(page);
  await page.getByText('Display').click();
  await page.getByLabel(/Add patterns/).check();
  await expect.poll(() => new URL(page.url()).searchParams.get('pat')).toBe('1');
  expect(errors).toEqual([]);
});

test('a shared link restores a customized setup', async ({ page }) => {
  await open(page, '?f=college&ts=100,60~250,90&fp=192,-20&pr=50,50&t=Opener:180&n=16&temp=90');
  await expect(page.getByTestId('ts-1')).toBeVisible();
  await expect(page.getByTestId('probe-delay')).toContainText('ms');
  await expect(page.getByLabel('Acceptable error')).toHaveValue('16');
});

test('the map stays visible while scrolling on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await open(page);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(200);
  const box = (await page.getByTestId('map').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(40);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`has no serious accessibility violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page);
    // Open every section so all controls are checked.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}
