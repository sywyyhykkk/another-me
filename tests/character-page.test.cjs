const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { runInNewContext } = require('node:vm');

const origin = { mode: 'manual', cityName: '昆明', countryName: '中国', latitude: 25.0389, longitude: 102.7183 };
const originKey = `manual:${origin.latitude}:${origin.longitude}`;
const clone = value => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(resolve => setImmediate(resolve));

function withoutImports(source) {
  return source.replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '').replace(/^export /gm, '');
}

function suggestion(name, gender, continent = 'SA') {
  return { success: true, data: { name, gender, continent, continentLabel: continent === 'SA' ? '南美洲' : '欧洲', locationLabel: '地球另一端', targetKind: 'unknown' } };
}

function characterPage(draft) {
  const storage = new Map([
    ['otherMe:locationMode', 'manual'],
    ['otherMe:selectedCity', { name: origin.cityName, country: origin.countryName, latitude: origin.latitude, longitude: origin.longitude }],
  ]);
  if (draft) storage.set('otherMe:characterDraft', clone(draft));
  const hooks = {}, requests = [], navigations = [];
  let originReads = 0;
  const uni = {
    getStorageSync: key => storage.has(key) ? clone(storage.get(key)) : '',
    setStorageSync: (key, value) => storage.set(key, clone(value)),
    removeStorageSync: key => storage.delete(key),
    hideKeyboard: () => {},
    navigateTo: options => { navigations.push(options.url); options.complete?.(); },
    navigateBack: () => {},
    reLaunch: options => navigations.push(options.url),
  };
  const context = {
    uni, Error,
    ref: value => ({ value }),
    computed: getter => ({ get value() { return getter(); } }),
    onLoad: callback => { hooks.load = callback; },
    onUnload: callback => { hooks.unload = callback; },
    buildOriginLocation: async () => { originReads++; return clone(origin); },
    suggestCharacter: payload => new Promise((resolve, reject) => requests.push({ payload: clone(payload), resolve, reject })),
  };
  const helpers = withoutImports(readFileSync(join(__dirname, '../utils/profileStorage.ts'), 'utf8'));
  const component = readFileSync(join(__dirname, '../pages/character-setup/index.vue'), 'utf8');
  const script = withoutImports(component.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]);
  const page = runInNewContext(`${stripTypeScriptTypes(helpers + '\n' + script)}\n;({name,gender,continent,continentLabel,locationLabel,error,suggesting,canContinue,selectGender,onNameInput,requestSuggestion,retry,goNext,goBack})`, context);
  return { page, requests, storage, navigations, originReads: () => originReads, load: async () => { hooks.load(); await flush(); }, unload: () => hooks.unload() };
}

test('切换性别后迟到的旧建议不会覆盖最新名字、性别和地区', async () => {
  const harness = characterPage();
  await harness.load();
  assert.equal(harness.requests[0].payload.gender, 'unspecified');

  harness.page.selectGender('female');
  assert.equal(harness.requests[1].payload.gender, 'female');
  harness.requests[1].resolve(suggestion('Isabel', 'female'));
  await flush();
  assert.equal(harness.page.name.value, 'Isabel');
  assert.equal(harness.page.canContinue.value, true);

  harness.requests[0].resolve(suggestion('Mateo', 'unspecified', 'EU'));
  await flush();
  assert.equal(harness.page.name.value, 'Isabel');
  assert.equal(harness.page.gender.value, 'female');
  assert.equal(harness.page.continent.value, 'SA');
  assert.equal(harness.page.suggesting.value, false);
  const saved = harness.storage.get('otherMe:characterDraft');
  assert.equal(saved.name, 'Isabel');
  assert.equal(saved.gender, 'female');
  assert.equal(saved.continent, 'SA');
});

test('用户在建议进行中输入的名字保留，继续时只整理首尾空格', async () => {
  const harness = characterPage();
  await harness.load();
  harness.page.onNameInput({ detail: { value: ' Anna Maria ' } });
  harness.requests[0].resolve(suggestion('Lucía', 'unspecified'));
  await flush();

  assert.equal(harness.page.name.value, ' Anna Maria ');
  assert.equal(harness.page.continent.value, 'SA');
  assert.equal(harness.page.canContinue.value, true);
  harness.page.goNext();
  assert.deepEqual(harness.navigations, ['/pages/avatar-select/index']);
  assert.equal(harness.storage.get('otherMe:characterDraft').name, 'Anna Maria');
});

test('建议失败会阻止继续，重试成功后保留进行中手填的名字', async () => {
  const harness = characterPage({ originKey, name: 'Isabel', gender: 'female', continent: 'SA' });
  await harness.load();
  assert.equal(harness.page.canContinue.value, true);

  const pending = harness.page.requestSuggestion(true);
  harness.page.onNameInput({ detail: { value: 'Renata' } });
  harness.requests[0].reject(new Error('地理服务暂时不可用'));
  await pending;
  assert.equal(harness.page.continent.value, undefined);
  assert.equal(harness.page.canContinue.value, false);
  assert.equal(harness.page.error.value, '地理服务暂时不可用');
  harness.page.goNext();
  assert.deepEqual(harness.navigations, []);

  harness.page.retry();
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.requests[1].payload.gender, 'female');
  assert.equal(harness.requests[1].payload.excludeName, undefined);
  harness.requests[1].resolve(suggestion('Julieta', 'female'));
  await flush();
  assert.equal(harness.page.name.value, 'Renata');
  assert.equal(harness.page.error.value, '');
  assert.equal(harness.page.canContinue.value, true);
  const saved = harness.storage.get('otherMe:characterDraft');
  assert.equal(saved.name, 'Renata');
  assert.equal(saved.continent, 'SA');
});

test('同一起点已有有效草稿时打开页面不重新请求随机名字', async () => {
  const draft = { originKey, name: 'Anna Maria', gender: 'female', continent: 'SA', continentLabel: '南美洲', locationLabel: '太平洋', targetKind: 'ocean' };
  const harness = characterPage(draft);
  await harness.load();

  assert.equal(harness.originReads(), 1);
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.page.name.value, draft.name);
  assert.equal(harness.page.gender.value, draft.gender);
  assert.equal(harness.page.continent.value, draft.continent);
  assert.equal(harness.page.continentLabel.value, draft.continentLabel);
  assert.equal(harness.page.locationLabel.value, draft.locationLabel);
  assert.equal(harness.page.canContinue.value, true);

  harness.page.goBack();
  harness.unload();
  const reopened = characterPage(harness.storage.get('otherMe:characterDraft'));
  await reopened.load();
  assert.equal(reopened.requests.length, 0);
  assert.equal(reopened.page.name.value, draft.name);
});
