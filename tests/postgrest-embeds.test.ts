// اختبار وقائي: أي عمودين FK من نفس الجدول لنفس الجدول التاني (زي
// order_items.product_id و order_items.converted_product_id، اللي هما
// سبب علة "الأصناف مش ظاهرة" في التحديث ده) بيخلي PostgREST يرفض أي
// استعلام بيحاول يضم (embed) الجدول التاني من غير ما يحدد أنهي FK بالظبط
// (بصيغة `parent!fkey_name(...)`), ويرجّع خطأ بيتم تجاهله غالبًا لأن
// أغلب الاستعلامات في المشروع بتاخد بس `data` من غير `error`.
// الاختبار ده بيقرأ كل الـ migrations فعليًا، يلاقي كل زوج جداول عنده
// أكتر من علاقة، وبعدين يفحص كل ملفات app/ و components/ للتأكد إن أي
// استعلام بيضم الجدول التاني من الجدول ده بيحدد الـ FK صراحة.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && [".ts", ".tsx"].includes(extname(entry.name))) out.push(full);
  }
}

function findAmbiguousForeignKeys() {
  const migrationsDir = join(ROOT, "supabase/migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  const fks = new Map<string, Set<string>>(); // "child->parent" -> set of column names
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    let currentTable: string | null = null;
    for (const line of sql.split("\n")) {
      const tableMatch = line.match(/(?:create table|alter table)\s+(?:if not exists\s+)?public\.(\w+)/i);
      if (tableMatch) currentTable = tableMatch[1];

      const colMatch = line.match(/^\s*(?:add column(?: if not exists)?\s+)?(\w+)\s+uuid\s+(?:not null\s+)?references public\.(\w+)\(id\)/i);
      if (colMatch && currentTable) {
        const key = `${currentTable}->${colMatch[2]}`;
        if (!fks.has(key)) fks.set(key, new Set());
        fks.get(key)!.add(colMatch[1]);
      }
    }
  }

  return [...fks.entries()].filter(([, cols]) => cols.size > 1).map(([key]) => {
    const [child, parent] = key.split("->");
    return { child, parent };
  });
}

test("no PostgREST query embeds an ambiguous parent table without disambiguating the foreign key", () => {
  const ambiguous = findAmbiguousForeignKeys();
  assert.ok(ambiguous.length > 0, "sanity check: expected to find at least the known ambiguous pairs in the migrations");

  const sourceFiles: string[] = [];
  walk(join(ROOT, "app"), sourceFiles);
  walk(join(ROOT, "components"), sourceFiles);

  const violations: string[] = [];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");

    // كل استدعاء .from("جدول") متبوع بـ .select(...) على مدار الأسطر اللي بعده
    for (const fromMatch of content.matchAll(/\.from\(["'](\w+)["']\)/g)) {
      const table = fromMatch[1];
      const relevant = ambiguous.filter((a) => a.child === table);
      if (relevant.length === 0) continue;

      const windowText = content.slice(fromMatch.index!, fromMatch.index! + 1500);
      const selectMatch = windowText.match(/\.select\(([\s\S]*?)\)(?:\s*\.|\s*;|\s*\n\s*\})/);
      if (!selectMatch) continue;
      const selectArg = selectMatch[1];

      for (const { parent } of relevant) {
        // كل ظهور لاسم الجدول التاني كـ embed، سواء بدون alias أو بـ alias:parent(...)
        for (const embedMatch of selectArg.matchAll(new RegExp(`(?:^|[,\\s\`])(?:\\w+\\s*:\\s*)?${parent}\\s*([!(])`, "g"))) {
          const disambiguated = embedMatch[1] === "!";
          if (!disambiguated) {
            violations.push(`${file.replace(ROOT + "/", "")}: .from("${table}") يضم "${parent}" من غير تحديد الـ FK (متاح أكتر من علاقة بينهم)`);
          }
        }
      }
    }
  }

  assert.deepEqual(violations, []);
});
