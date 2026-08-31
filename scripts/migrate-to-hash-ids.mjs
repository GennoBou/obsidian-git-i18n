import fs from "fs";
import path from "path";
import crypto from "crypto";

function toKey(originalText) {
    const normalized = originalText.replace(/\s+/g, " ").trim();
    // If short (<= 60 chars) and single-line without troublesome quotes, keep as raw key
    if (normalized.length <= 60 && !originalText.includes("\n") && !originalText.includes('"') && !originalText.includes("'")) {
        return normalized;
    }
    const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 6);
    // Sanitize slug: only letters, numbers, spaces, hyphens
    let slug = normalized.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 24).trim();
    return `${slug}...#${hash}`;
}

const existingJa = fs.existsSync("src/locales/ja.json")
    ? JSON.parse(fs.readFileSync("src/locales/ja.json", "utf8"))
    : {};

function walkDir(dir) {
    let files = [];
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            if (item !== "node_modules" && item !== "locales") {
                files = files.concat(walkDir(full));
            }
        } else if (full.endsWith(".ts") || full.endsWith(".svelte") || full.endsWith(".js") || full.endsWith(".mjs")) {
            files.push(full);
        }
    }
    return files;
}

const allFiles = walkDir("src");
const enDict = {};
const jaDict = {};

const normalizedToJa = new Map();
for (const [k, v] of Object.entries(existingJa)) {
    const norm = k.replace(/\s+/g, " ").trim();
    normalizedToJa.set(norm, v);
    normalizedToJa.set(k, v);
}

for (const file of allFiles) {
    if (file.includes("i18n.ts")) continue;
    let content = fs.readFileSync(file, "utf8");
    let modified = false;

    // Match t("...") safely
    content = content.replace(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g, (match, raw) => {
        const unescaped = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const key = toKey(unescaped);
        const norm = unescaped.replace(/\s+/g, " ").trim();
        enDict[key] = unescaped;
        jaDict[key] = normalizedToJa.get(norm) || normalizedToJa.get(unescaped) || unescaped;
        
        if (key !== unescaped) {
            modified = true;
            return `t(${JSON.stringify(key)}`;
        }
        return match;
    });

    // Match t('...') safely
    content = content.replace(/\bt\(\s*\'((?:[^\'\\]|\\.)*)\'/g, (match, raw) => {
        const unescaped = raw.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        const key = toKey(unescaped);
        const norm = unescaped.replace(/\s+/g, " ").trim();
        enDict[key] = unescaped;
        jaDict[key] = normalizedToJa.get(norm) || normalizedToJa.get(unescaped) || unescaped;
        
        if (key !== unescaped) {
            modified = true;
            return `t(${JSON.stringify(key)}`;
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(file, content, "utf8");
        console.log(`Updated file with slug#hash IDs: ${file}`);
    }
}

const sortedEn = {};
const sortedJa = {};
for (const k of Object.keys(enDict).sort((a, b) => a.localeCompare(b))) {
    sortedEn[k] = enDict[k];
    sortedJa[k] = jaDict[k] || enDict[k];
}

fs.writeFileSync("src/locales/en.json", JSON.stringify(sortedEn, null, 4) + "\n", "utf8");
fs.writeFileSync("src/locales/ja.json", JSON.stringify(sortedJa, null, 4) + "\n", "utf8");

const localize = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "description": "Custom UI translation overlay for obsidian-git-i18n. Edit translations below or specify a custom language.",
    "language": "ja",
    "translations": sortedJa
};
fs.writeFileSync("localize.json", JSON.stringify(localize, null, 4) + "\n", "utf8");

console.log(`Successfully migrated ${Object.keys(sortedEn).length} keys to slug#hash ID format!`);
