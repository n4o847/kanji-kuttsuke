const fs = require("fs");
const { promisify } = require("util");
const assert = require("assert");

const { sampleSize } = require("lodash");
const readlineSync = require("readline-sync");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Data taken from https://github.com/cjkvi/cjkvi-ids

(async () => {
  const content = await readFileAsync(`./cjkvi-ids/ids.txt`, { encoding: "utf8" });
  const lines = content.split(/\r\n|\r|\n/u);
  const partCount = new Map();

  const characterSet = new Set();
  const radicalSet = new Set();

  const stack = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }
    if (line.trim() === "") {
      continue;
    }

    const [codepoint, character, ...descriptions] = line.split("\t");

    assert(/^U\+[0-9A-F]{4,5}$/u.test(codepoint));

    characterSet.add(character);

    const unencoded = /[\u{2460}-\u{2473}]/u;

    // Remove unencoded DCs included
    if (unencoded.test(character)) {
      continue;
    }

    for (let description of descriptions) {
      // Remove Ideographic Description Characters
      description = description.replace(/[\u{2FF0}-\u{2FFB}]/gu, "");

      // Remove indication signs
      description = description.replace(/\[\w+\]/gu, "");

      // Workaround for U+2AAC9
      description = description.replace(/"/gu, "");

      // Leave as is if unencoded DCs included
      if (unencoded.test(description)) {
        description = character;
      }

      if (character === description) {
        radicalSet.add(character);
      }

      let parts = description.match(/(.)/gu);
      assert(parts !== null);
      parts.sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
      parts = parts.join("");
      stack.push([character, parts]);
      for (const part of parts) {
        partCount.set(part, partCount.has(part) ? partCount.get(part) + 1 : 1);
      }
    }
  }

  // for (const [character, parts] of stack) {
  //   parts.every((part) => characterSet.has(part)) || console.log("not in set: ", character, parts);
  // }

  // console.log([...radicalSet.keys()].sort((a, b) => partCount.get(b) - partCount.get(a)));

  // await writeFileAsync("./output.txt", [...partCount.entries()].sort(([_1, a], [_2, b]) => b - a).map(s => s.join("\t")).join("\n"));

  const pool = [];
  for (const radical of radicalSet) {
    for (const _ of Array(partCount.get(radical)).fill()) {
      pool.push(radical);
    }
  }

  for (; ;) {
    const sel = sampleSize(pool, 13);
    console.log([...sel.keys()].map(i => i + 1).join("\t"));
    console.log(sel.join("\t"));
    const input = readlineSync.question("> ");
    const nums = input.match(/\d+/g) || [];
    if (nums.length === 0) break;
    let searchParts = [];
    for (const num of nums) {
      searchParts.push(sel[num - 1]);
    }
    searchParts.sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
    searchParts = searchParts.join("");
    let found = false;
    for (const [character, parts] of stack) {
      if (parts === searchParts) {
        console.log(character);
        found = true;
      }
    }
    if (!found) {
      console.log("Not Found >_<");
    }
  }
})();
