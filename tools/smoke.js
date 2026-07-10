/**
 * smoke.js
 * --------------------------------------------------------------------------
 * UI 配線のスモークテスト（Node.js 標準ライブラリのみ）。
 *
 * golden.js が検証するのは「変換パイプライン」だけで、app.js の DOM 初期化・
 * イベントバインドは通らない。本スクリプトは最小限の document スタブを立てて
 * main.html の全スクリプトをロードし、実際に
 *   初期化 → Convert クリック → 出力反映 → Ctrl+Enter → Copy クリック
 * を通しで動かして、UI 層の配線が生きていることを確認する。
 *
 * 使い方: node tools/smoke.js   （失敗時は exit 1）
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// 最小 DOM スタブ
// ---------------------------------------------------------------------------

function makeEl(tag) {
  const el = {
    tagName: tag,
    value: "",
    disabled: false,
    textContent: "",
    _attrs: {},
    _listeners: {},
    _classes: new Set(),
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(type, fn) { (this._listeners[type] || (this._listeners[type] = [])).push(fn); },
    dispatch(type, event) {
      for (const fn of this._listeners[type] || []) fn(event || {});
    },
    focus() {},
    select() {},
  };
  el.classList = {
    add(...cs) { cs.forEach((c) => el._classes.add(c)); },
    remove(...cs) { cs.forEach((c) => el._classes.delete(c)); },
    toggle(c, force) {
      const on = force === undefined ? !el._classes.has(c) : !!force;
      if (on) el._classes.add(c); else el._classes.delete(c);
      return on;
    },
    contains(c) { return el._classes.has(c); },
  };
  return el;
}

const els = {
  inputText: makeEl("textarea"),
  outputText: makeEl("textarea"),
  convertBtn: makeEl("button"),
  copyBtn: makeEl("button"),
  toast: makeEl("div"),
  toastMessage: makeEl("span"),
};
const appRoot = makeEl("div");
const checkedRadio = { value: "officeAction" };

globalThis.document = {
  readyState: "complete",
  getElementById: (id) => els[id] || null,
  querySelector: (sel) => {
    if (sel === ".app") return appRoot;
    if (sel === 'input[name="mode"]:checked') return checkedRadio;
    return null;
  },
  addEventListener: () => {},
  execCommand: () => true, // コピーのフォールバック経路
};

// ---------------------------------------------------------------------------
// main.html のスクリプトを文書順にロード（document スタブがあるので
// app.js は本番同様に initDOM まで走る）
// ---------------------------------------------------------------------------

const html = fs.readFileSync(path.join(ROOT, "main.html"), "utf8");
const srcs = [];
const re = /<script\b[^>]*\bsrc="([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) srcs.push(m[1]);
for (const src of srcs) {
  const code = fs.readFileSync(path.join(ROOT, src.replace(/\//g, path.sep)), "utf8");
  vm.runInThisContext(code, { filename: src });
}

// ---------------------------------------------------------------------------
// スモーク本体
// ---------------------------------------------------------------------------

async function main() {
  // 1) 起動確認: root.app は起動済みインスタンス
  assert.ok(globalThis.app && typeof globalThis.app.run === "function", "root.app が初期化されていない");
  const modes = globalThis.app.listModes();
  for (const key of ["officeAction", "officeActionTight", "finalOfficeAction", "pct", "pct_eng", "paragraph", "html"]) {
    assert.ok(modes.includes(key), `モード ${key} が未登録`);
  }

  // 2) Convert クリック → 出力がゴールデンと一致
  const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "例文_1.txt"), "utf8");
  const golden = fs.readFileSync(path.join(__dirname, "goldens", "officeAction", "例文_1.txt"), "utf8");
  els.inputText.value = fixture;
  els.convertBtn.dispatch("click");
  await new Promise((r) => setTimeout(r, 300)); // 非同期パイプラインの完了待ち
  assert.strictEqual(els.outputText.value, golden, "Convert クリックの出力がゴールデンと不一致");
  assert.ok(els.toastMessage.textContent.includes("変換が完了"), "変換完了トーストが出ていない");
  assert.strictEqual(els.convertBtn.disabled, false, "変換後もボタンが disabled のまま");

  // 3) Ctrl+Enter ショートカット → 再変換が走る
  els.outputText.value = "";
  els.inputText.dispatch("keydown", { ctrlKey: true, metaKey: false, altKey: false, key: "Enter", preventDefault() {} });
  await new Promise((r) => setTimeout(r, 300));
  assert.strictEqual(els.outputText.value, golden, "Ctrl+Enter の出力がゴールデンと不一致");

  // 4) Copy クリック → フォールバック経路（execCommand）で成功トースト
  els.copyBtn.dispatch("click");
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(els.toastMessage.textContent.includes("コピー"), "コピートーストが出ていない");

  console.log("smoke: OK（起動 / Convert / Ctrl+Enter / Copy がすべて動作）");
  process.exit(0);
}

main().catch((err) => {
  console.error("smoke: FAILED:", err && err.message ? err.message : err);
  process.exit(1);
});
