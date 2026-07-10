/**
 * golden.js
 * --------------------------------------------------------------------------
 * 変換パイプラインの回帰テストハーネス（Node.js 標準ライブラリのみ使用）。
 *
 * main.html を解析して <script src> を文書順にロードし、ブラウザと同一の
 * グローバル環境を再現したうえで、全モード × 全 fixture の変換結果を
 * ゴールデンファイルとバイト単位で比較する。
 *
 * 使い方:
 *   node tools/golden.js capture              ゴールデンを生成（上書き）
 *   node tools/golden.js verify               ゴールデンと比較（不一致で exit 1）
 *   node tools/golden.js verify --probe-dead TextTransformer,JaTypoChecker
 *       指定グローバルを「アクセスした瞬間に throw するアクセサ」に差し替えて
 *       全マトリクスを実行する。全 PASS なら、そのグローバルが実行時に
 *       一切使われていないことの証明になる。
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const GOLDENS_DIR = path.join(__dirname, "goldens");

// ---------------------------------------------------------------------------
// main.html の解析（script ロード順・モードキーの唯一の情報源）
// ---------------------------------------------------------------------------

function readMainHtml() {
  return fs.readFileSync(path.join(ROOT, "main.html"), "utf8");
}

/** <script src="..."> を文書順に返す */
function parseScriptSrcs(html) {
  const srcs = [];
  const re = /<script\b[^>]*\bsrc="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  if (srcs.length === 0) throw new Error("main.html から <script src> が見つかりません");
  return srcs;
}

/** name="mode" のラジオの value を文書順に返す（タグは複数行にまたがる） */
function parseModeKeys(html) {
  const modes = [];
  const tagRe = /<input\b[\s\S]*?>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/name="mode"/.test(tag)) continue;
    const v = /value="([^"]+)"/.exec(tag);
    if (v) modes.push(v[1]);
  }
  if (modes.length === 0) throw new Error("main.html から mode ラジオが見つかりません");
  return modes;
}

/** 全スクリプトを文書順に現在のグローバルへロードする */
function loadScripts(srcs) {
  for (const src of srcs) {
    const file = path.join(ROOT, src.replace(/\//g, path.sep));
    const code = fs.readFileSync(file, "utf8");
    vm.runInThisContext(code, { filename: src });
  }
}

// ---------------------------------------------------------------------------
// パイプライン実行（app.js の AppCore._handleConvert / _buildPipeline を忠実に再現）
// ---------------------------------------------------------------------------

async function convert(modeKey, raw) {
  // _handleConvert: raw → toHalfWidth（本番の実装をそのまま使う）
  const normalized = globalThis.app.toHalfWidth(raw);

  const handlers = globalThis.ModeFunctionLists[modeKey];
  if (!Array.isArray(handlers)) {
    throw new Error(`ModeFunctionLists["${modeKey}"] がハンドラ配列ではありません`);
  }

  // _buildPipeline: 関数 / {process} 以外は警告してスキップ
  let current = normalized;
  for (const handler of handlers) {
    let result;
    if (typeof handler === "function") {
      result = handler(current);
    } else if (handler && typeof handler === "object" && typeof handler.process === "function") {
      result = handler.process(current);
    } else {
      console.warn(`[golden] 無効なハンドラをスキップ: ${modeKey}`);
      continue;
    }
    if (result && typeof result.then === "function") {
      current = String(await result);
    } else {
      current = String(result ?? "");
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// probe-dead: グローバルを throw するアクセサに差し替える
// ---------------------------------------------------------------------------

function armDeadProbes(names) {
  for (const name of names) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        throw new Error(`[probe-dead] グローバル "${name}" が実行時にアクセスされました`);
      },
      set() {
        throw new Error(`[probe-dead] グローバル "${name}" が実行時に代入されました`);
      },
    });
  }
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function listFixtures() {
  if (!fs.existsSync(FIXTURES_DIR)) throw new Error("tools/fixtures/ がありません");
  const names = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".txt")).sort();
  if (names.length === 0) throw new Error("tools/fixtures/ に .txt がありません");
  return names;
}

function goldenPath(modeKey, fixtureName) {
  return path.join(GOLDENS_DIR, modeKey, fixtureName);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command !== "capture" && command !== "verify") {
    console.error("使い方: node tools/golden.js <capture|verify> [--probe-dead A,B]");
    process.exit(2);
  }

  const probeIdx = args.indexOf("--probe-dead");
  const probeNames = probeIdx >= 0 ? (args[probeIdx + 1] || "").split(",").filter(Boolean) : [];

  const html = readMainHtml();
  const srcs = parseScriptSrcs(html);
  const modeKeys = parseModeKeys(html);
  loadScripts(srcs);

  if (probeNames.length > 0) {
    armDeadProbes(probeNames);
    console.log(`probe-dead 有効: ${probeNames.join(", ")}`);
  }

  const fixtures = listFixtures();
  console.log(`モード ${modeKeys.length} 件 × fixture ${fixtures.length} 件`);

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const modeKey of modeKeys) {
    for (const fixtureName of fixtures) {
      const raw = fs.readFileSync(path.join(FIXTURES_DIR, fixtureName), "utf8");
      const output = await convert(modeKey, raw);
      const outBuf = Buffer.from(output, "utf8");
      const gPath = goldenPath(modeKey, fixtureName);

      if (command === "capture") {
        fs.mkdirSync(path.dirname(gPath), { recursive: true });
        fs.writeFileSync(gPath, outBuf);
        pass++;
      } else {
        if (!fs.existsSync(gPath)) {
          fail++;
          failures.push(`${modeKey}/${fixtureName}: ゴールデンが存在しません`);
          continue;
        }
        const golden = fs.readFileSync(gPath);
        if (Buffer.compare(outBuf, golden) === 0) {
          pass++;
        } else {
          fail++;
          failures.push(`${modeKey}/${fixtureName}: 出力がゴールデンと不一致 (${outBuf.length}b vs ${golden.length}b)`);
        }
      }
    }
  }

  if (command === "capture") {
    console.log(`ゴールデン ${pass} 件を書き込みました → tools/goldens/`);
  } else {
    console.log(`PASS ${pass} / FAIL ${fail}`);
    if (fail > 0) {
      for (const f of failures) console.error("  FAIL " + f);
      process.exit(1);
    }
    console.log("全件一致（バイト単位）");
  }
}

main().catch((err) => {
  console.error("[golden] 実行エラー:", err);
  process.exit(1);
});
