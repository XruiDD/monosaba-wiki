import type { TutorialRecord } from "../types/wiki";

export interface TutorialDialogueSegment {
  text: string;
  annotation?: string;
}

export interface TutorialDialogueLine {
  segments: TutorialDialogueSegment[];
}

export interface TutorialChapter {
  id: string;
  title: string;
  lines: TutorialDialogueLine[];
}

const CHAPTER_TITLES = [
  "引子 · 三个阵营",
  "魔法与意志力",
  "地图与探索",
  "死亡与审判",
  "终章与悖演残响",
];

export function parseTutorialChapters(tutorial: TutorialRecord | undefined): TutorialChapter[] {
  const functions = (tutorial?.functions || [])
    .filter((entry) => /^cam\d+_warden_said\.mcfunction$/i.test(entry.name))
    .sort((left, right) => chapterNumber(left.name) - chapterNumber(right.name));

  if (functions.length > 0) {
    return functions.map((entry) => {
      const number = chapterNumber(entry.name);
      return {
        id: `cam${number}`,
        title: CHAPTER_TITLES[number - 1] || `第 ${number} 章`,
        lines: tellrawPayloads(entry.content)
          .map(parseTextComponent)
          .map(normalizeDialogueSegments)
          .filter((segments) => segments.length > 0)
          .map((segments) => ({ segments })),
      };
    });
  }

  return parseDocumentFallback(tutorial?.documents?.[0]?.content || "");
}

function chapterNumber(name: string) {
  return Number(name.match(/^cam(\d+)/i)?.[1] || 0);
}

function tellrawPayloads(source: string) {
  const normalized = source.replace(/\\\r?\n/g, "");
  const marker = /\brun\s+tellraw\s+@s\s+/g;
  const payloads: string[] = [];

  while (marker.exec(normalized) !== null) {
    const start = skipWhitespace(normalized, marker.lastIndex);
    const end = balancedValueEnd(normalized, start);
    if (end <= start) continue;
    payloads.push(normalized.slice(start, end));
    marker.lastIndex = end;
  }
  return payloads;
}

function balancedValueEnd(value: string, start: number) {
  const opening = value[start];
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  if (opening === '"' || opening === "'") return quotedValueEnd(value, start);
  if (!pairs[opening]) {
    const newline = value.indexOf("\n", start);
    return newline === -1 ? value.length : newline;
  }

  const stack = [pairs[opening]];
  let quote: string | null = null;
  let escaped = false;
  for (let index = start + 1; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) return index + 1;
    }
  }
  return value.length;
}

function quotedValueEnd(value: string, start: number) {
  const quote = value[start];
  let escaped = false;
  for (let index = start + 1; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === quote) return index + 1;
  }
  return value.length;
}

function skipWhitespace(value: string, start: number) {
  let index = start;
  while (/\s/.test(value[index] || "")) index += 1;
  return index;
}

function splitTopLevel(value: string) {
  const trimmed = value.trim();
  const body = (trimmed.startsWith("[") && trimmed.endsWith("]"))
    || (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ? trimmed.slice(1, -1)
    : trimmed;
  const parts: string[] = [];
  const stack: string[] = [];
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  let quote: string | null = null;
  let escaped = false;
  let start = 0;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) stack.pop();
    else if (char === "," && stack.length === 0) {
      const part = body.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }
  const tail = body.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseTextComponent(value: string): TutorialDialogueSegment[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return splitTopLevel(trimmed).flatMap(parseTextComponent);
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const text = decodeQuoted(trimmed);
    return text ? [{ text }] : [];
  }
  if (!trimmed.startsWith("{")) return [];

  const fields = parseFields(trimmed);
  const text = decodeScalar(fields.get("text"));
  const annotation = componentAnnotation(fields.get("hover_event") || fields.get("hoverEvent"));
  const segments: TutorialDialogueSegment[] = text ? [{ text, ...(annotation ? { annotation } : {}) }] : [];
  const extra = fields.get("extra");
  if (extra) segments.push(...parseTextComponent(extra));
  return segments;
}

function parseFields(value: string) {
  const fields = new Map<string, string>();
  for (const part of splitTopLevel(value)) {
    const colon = topLevelColon(part);
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim().replace(/^['"]|['"]$/g, "");
    fields.set(key, part.slice(colon + 1).trim());
  }
  return fields;
}

function topLevelColon(value: string) {
  const stack: string[] = [];
  const pairs: Record<string, string> = { "[": "]", "{": "}", "(": ")" };
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) stack.pop();
    else if (char === ":" && stack.length === 0) return index;
  }
  return -1;
}

function componentAnnotation(value: string | undefined) {
  if (!value?.trim().startsWith("{")) return "";
  const fields = parseFields(value);
  const content = fields.get("value") || fields.get("contents");
  return content ? parseTextComponent(content).map((segment) => segment.text).join("").trim() : "";
}

function decodeScalar(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.startsWith('"') || trimmed.startsWith("'") ? decodeQuoted(trimmed) : trimmed;
}

function decodeQuoted(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      // Fall through to the permissive SNBT decoder below.
    }
  }
  return trimmed.slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([\\"'])/g, "$1");
}

function normalizeDialogueSegments(segments: TutorialDialogueSegment[]) {
  const normalized = segments
    .map((segment) => ({ ...segment, text: segment.text.replace(/\s+/g, " ") }))
    .filter((segment) => segment.text.length > 0);

  while (normalized[0] && !normalized[0].text.trim()) normalized.shift();
  if (
    normalized[0]?.text.trim() === "["
    && normalized[1]?.text.trim() === "典狱长"
    && normalized[2]?.text.trim() === "]"
  ) normalized.splice(0, 3);
  while (normalized[0] && !normalized[0].text.trim()) normalized.shift();
  while (normalized.at(-1) && !normalized.at(-1)?.text.trim()) normalized.pop();
  if (normalized[0]) normalized[0].text = normalized[0].text.trimStart();
  if (normalized.at(-1)) normalized[normalized.length - 1].text = normalized.at(-1)!.text.trimEnd();

  return normalized.reduce<TutorialDialogueSegment[]>((result, segment) => {
    const previous = result.at(-1);
    if (previous && !previous.annotation && !segment.annotation) previous.text += segment.text;
    else result.push(segment);
    return result;
  }, []);
}

function parseDocumentFallback(content: string): TutorialChapter[] {
  const body = content.split("## warden said")[1] || "";
  return body.split(/\n\d+\.\s*cam\d+\n/).slice(1).map((part, index) => ({
    id: `cam${index + 1}`,
    title: CHAPTER_TITLES[index] || `第 ${index + 1} 章`,
    lines: part.trim().split("\n").map((line) => line.trim()).filter(Boolean)
      .map((text) => ({ segments: [{ text }] })),
  }));
}
