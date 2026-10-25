import { readFile, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
const report = JSON.parse(await readFile("content/import-report.json", "utf8"));
const data = JSON.parse(await readFile("content/site.json", "utf8"));
const audit = [];
const pages = [];
for (const p of data.pages)
  for (const item of [p, ...(p.posts || [])])
    if (report.failures.some((f) => (item.html || "").includes("/" + f.path)))
      pages.push({ slug: p.slug, id: item.id, url: item.url });
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < pages.length) {
      const p = pages[cursor++];
      try {
        const r = await fetch(p.url, { signal: AbortSignal.timeout(10000) });
        const html = await r.text();
        await writeFile(
          `output/sources/recheck-${p.slug}-${p.id || "page"}.html`,
          html,
        );
        const doc = new JSDOM(html, { url: p.url }).window.document;
        p.images = [...doc.querySelectorAll("#ctt_con img,#bo_v_con img")].map(
          (i) => i.src,
        );
        audit.push({ page: p.url, images: p.images });
      } catch (e) {
        audit.push({ page: p.url, error: e.message });
      }
    }
  }),
);
console.log(`Rechecked ${pages.length} live source pages.`);
const recovered = [];
cursor = 0;
let done = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < report.failures.length) {
      const f = report.failures[cursor++];
      const log = { original: f.url, attempts: [] };
      let candidates = [f.url];
      const u = new URL(f.url);
      if (u.host === "cdhouse.hithis.net")
        candidates.push(
          "http://www.xn--6j1bk21a14cu1h05l.com" + u.pathname,
          "http://www.xn--6j1bv7plonp9b.com" + u.pathname,
          "http://sitenext700.hithis.net" + u.pathname,
        );
      for (const p of pages)
        for (const src of p.images || [])
          if (new URL(src).pathname === u.pathname && !candidates.includes(src))
            candidates.push(src);
      let ok = false;
      async function tryImage(url) {
        try {
          const r = await fetch(url, {
            headers: { Referer: data.origin + "/" },
            signal: AbortSignal.timeout(8000),
          });
          const b = Buffer.from(await r.arrayBuffer());
          const image =
            b.subarray(0, 3).toString("hex") === "ffd8ff" ||
            b.subarray(1, 4).toString() === "PNG" ||
            (b.subarray(0, 4).toString() === "RIFF" &&
              b.subarray(8, 12).toString() === "WEBP");
          log.attempts.push({ url, status: r.status, finalUrl: r.url, image });
          if (r.ok && image && b.length > 500) {
            await writeFile(f.path, b);
            recovered.push({ original: f.url, recovered: url, path: f.path });
            return true;
          }
        } catch (e) {
          log.attempts.push({ url, error: e.cause?.code || e.message });
        }
        return false;
      }
      for (const url of candidates) {
        if (await tryImage(url)) {
          ok = true;
          break;
        }
      }
      if (!ok)
        try {
          const url =
            "https://archive.org/wayback/available?url=" +
            encodeURIComponent(f.url);
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const a = await r.json();
          log.archive = a.archived_snapshots;
          const snap = a.archived_snapshots?.closest;
          if (snap?.available)
            ok = await tryImage(
              snap.url
                .replace(/^http:/, "https:")
                .replace(/\/web\/(\d+)\//, "/web/$1id_/"),
            );
        } catch (e) {
          log.archiveError = e.message;
        }
      log.recovered = ok;
      audit.push(log);
      if (++done % 15 === 0)
        console.log(
          `Checked ${done}/${report.failures.length}; recovered ${recovered.length}`,
        );
    }
  }),
);
report.failures = report.failures.filter(
  (f) => !recovered.some((r) => r.original === f.url),
);
report.recovered.push(...recovered);
report.recheckedOn = "2026-10-25";
await writeFile("content/import-report.json", JSON.stringify(report, null, 2));
await writeFile(
  "content/recovery-audit.json",
  JSON.stringify({ checkedOn: "2026-10-25", audit }, null, 2),
);
console.log({
  newlyRecovered: recovered.length,
  totalRecovered: report.recovered.length,
  remaining: report.failures.length,
});
