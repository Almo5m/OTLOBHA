// اختبار وقائي: أي عمودين FK من نفس الجدول لنفس الجدول التاني (زي
// order_items.product_id و order_items.converted_product_id، اللي هما
// سبب علة "الأصناف مش ظاهرة" في التحديث ده) بيخلي PostgREST يرفض أي
// استعلام بيحاول يضم (embed) الجدول التاني من غير ما يحدد أنهي FK بالظبط
// (بصيغة `parent!fkey_name(...)`), ويرجّع خطأ بيتم تجاهله غالبًا لأن
// أغلب الاستعلامات في المشروع بتاخد بس `data` من غير `error`.
// الاختبار ده بيقرأ supabase/schema.sql فعليًا، يلاقي كل زوج جداول عنده
// أكتر من علاقة، وبعدين يفحص كل ملفات app/ و components/ للتأكد إن أي
// استعلام بيضم الجدول التاني من الجدول ده بيحدد الـ FK صراحة.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  const schemaPath = join(ROOT, "supabase/schema.sql");
  if (!existsSync(schemaPath)) return null;

  const sql = readFileSync(schemaPath, "utf-8");
  const fks = new Map<string, Set<string>>(); // "child->parent" -> set of column names

  const add = (child: string, col: string, parent: string) => {
    const key = `${child}->${parent}`;
    if (!fks.has(key)) fks.set(key, new Set());
    fks.get(key)!.add(col);
  };

  // الصيغة 1 (pg_dump): ALTER TABLE ONLY public.child ADD CONSTRAINT x FOREIGN KEY (col) REFERENCES public.parent(id)
  const alterPattern = /ALTER TABLE ONLY public\.(\w+)\s+ADD CONSTRAINT \w+ FOREIGN KEY \((\w+)\) REFERENCES public\.(\w+)\(/g;
  for (const match of sql.matchAll(alterPattern)) add(match[1], match[2], match[3]);

  // الصيغة 2 (schema.sql الحالي): مراجع inline جوه create table — "col uuid ... references public.parent(id)"
  const tablePattern = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/gi;
  for (const table of sql.matchAll(tablePattern)) {
    for (const line of table[2].split("\n")) {
      const ref = line.match(/^\s*(\w+)\s+[\w(),]+.*?references public\.(\w+)\(/i);
      if (ref) add(table[1], ref[1], ref[2]);
    }
  }

  return [...fks.entries()].filter(([, cols]) => cols.size > 1).map(([key]) => {
    const [child, parent] = key.split("->");
    return { child, parent };
  });
}

test("no PostgREST query embeds an ambiguous parent table without disambiguating the foreign key", (t) => {
  const ambiguous = findAmbiguousForeignKeys();
  if (ambiguous === null) {
    // supabase/schema.sql في .gitignore عمدًا، فلو الملف مش موجود عندك (مثلًا
    // على جهاز تاني أو CI) الاختبار بيتخطى نفسه بدل ما يفشل — بس الحماية
    // بتشتغل بس لما الملف يكون موجود، فخليه موجود على جهازك.
    t.skip("supabase/schema.sql مش موجود — الفحص متخطّى");
    return;
  }
  assert.ok(ambiguous.length > 0, "sanity check: expected to find at least the known ambiguous pairs in schema.sql");

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
