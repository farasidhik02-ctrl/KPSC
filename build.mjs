import fs from 'fs';
import path from 'path';

const root = process.cwd(),
  out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'public'), out, { recursive: true });

const cats = [
  'History',
  'Geography',
  'Economics',
  'Indian Constitution',
  'Kerala Governance & Administration',
  'Life Science',
  'Physics',
  'Chemistry',
  'Arts, Literature, Culture & Sports',
  'Computer',
  'Education Policies, Acts & Commissions',
  'Current Affairs',
  'Arithmetic & Reasoning',
  'English',
  'Regional Language'
];

const subs = {
  History: ['Kerala History', 'Indian History', 'World History'],
  Geography: ['Kerala Geography', 'Indian Geography', 'World & General Geography'],
  Economics: ['Economic Concepts', 'Indian Economy', 'Kerala Economy']
};

const slug = s =>
  s.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function parse(f) {
  let t = fs.readFileSync(f, 'utf8'),
    m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!m) return null;

  let d = {}, key = '';

  for (const l of m[1].split('\n')) {
    let x = l.match(/^([\w_]+):\s*(.*)$/);

    if (x) {
      key = x[1];
      d[key] = x[2].replace(/^['"]|['"]$/g, '');

      if (key === 'tags') d.tags = [];
    } else if (/^\s*-\s+/.test(l) && key === 'tags') {
      d.tags.push(
        l.replace(/^\s*-\s+/, '').replace(/^['"]|['"]$/g, '')
      );
    }
  }

  d.body = m[2];
  d.slug = slug(d.title || path.basename(f, '.md'));

  return d;
}

const files = fs
  .readdirSync(path.join(root, 'content'))
  .filter(x => x.endsWith('.md'));

const items = files
  .map(x => parse(path.join(root, 'content', x)))
  .filter(Boolean);

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

function md(s) {
  if (!s) return '';

  const lines = s.replace(/\r/g, '').split('\n');
  let html = '';
  let i = 0;

  const inline = text => {
    let safe = esc(text);

    /* Images */
    safe = safe.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">'
    );

    /* Links */
    safe = safe.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>'
    );

    /* Bold */
    safe = safe.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    /* Italic */
    safe = safe.replace(
      /(?<!\*)\*([^*]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return safe;
  };

  const isTableDivider = line =>
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

  const tableCells = line =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    /* Empty line */
    if (!trimmed) {
      i++;
      continue;
    }

    /* Horizontal rule */
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      html += '<hr>';
      i++;
      continue;
    }

    /* Headings */
    if (/^###\s+/.test(trimmed)) {
      html += `<h3>${inline(trimmed.replace(/^###\s+/, ''))}</h3>`;
      i++;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      html += `<h2>${inline(trimmed.replace(/^##\s+/, ''))}</h2>`;
      i++;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      html += `<h1>${inline(trimmed.replace(/^#\s+/, ''))}</h1>`;
      i++;
      continue;
    }

    /* Markdown table */
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = tableCells(line);

      i += 2;

      const rows = [];

      while (
        i < lines.length &&
        lines[i].trim() &&
        lines[i].includes('|')
      ) {
        rows.push(tableCells(lines[i]));
        i++;
      }

      html += `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${headers
                  .map(cell => `<th>${inline(cell)}</th>`)
                  .join('')}
              </tr>
            </thead>

            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row
                    .map(cell => `<td>${inline(cell)}</td>`)
                    .join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      continue;
    }

    /* Blockquote */
    if (/^>\s?/.test(trimmed)) {
      const quote = [];

      while (
        i < lines.length &&
        /^>\s?/.test(lines[i].trim())
      ) {
        quote.push(
          lines[i].trim().replace(/^>\s?/, '')
        );

        i++;
      }

      html += `
        <blockquote>
          ${quote.map(x => inline(x)).join('<br>')}
        </blockquote>
      `;

      continue;
    }

    /* Unordered list */
    if (/^[-*]\s+/.test(trimmed)) {
      const list = [];

      while (
        i < lines.length &&
        /^[-*]\s+/.test(lines[i].trim())
      ) {
        list.push(
          lines[i].trim().replace(/^[-*]\s+/, '')
        );

        i++;
      }

      html += `
        <ul>
          ${list
            .map(x => `<li>${inline(x)}</li>`)
            .join('')}
        </ul>
      `;

      continue;
    }

    /* Ordered list */
    if (/^\d+\.\s+/.test(trimmed)) {
      const list = [];

      while (
        i < lines.length &&
        /^\d+\.\s+/.test(lines[i].trim())
      ) {
        list.push(
          lines[i].trim().replace(/^\d+\.\s+/, '')
        );

        i++;
      }

      html += `
        <ol>
          ${list
            .map(x => `<li>${inline(x)}</li>`)
            .join('')}
        </ol>
      `;

      continue;
    }

    /* Normal paragraph */
    const paragraph = [trimmed];
    i++;

    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        isTableDivider(lines[i + 1])
      )
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }

    html += `<p>${paragraph.map(x => inline(x)).join('<br>')}</p>`;
  }

  return html;
}

function sidebar(active = '') {
  return `
  <aside class="sidebar">
    <div class="brand">
      <div class="mark">K</div>
      <div>
        <strong>Kerala PSC</strong>
        <small>Focused Notes</small>
      </div>
    </div>

    <nav class="nav">
      <a href="/" class="${active === 'Home' ? 'active' : ''}">⌂ Home</a>

      <div class="nav-label">Syllabus</div>

      ${cats.map(c =>
        subs[c]
          ? `
          <details ${active === c ? 'open' : ''}>
            <summary>${esc(c)} <span class="chev">›</span></summary>
            <a href="/category/${slug(c)}/">All ${esc(c)}</a>
            ${subs[c].map(s =>
              `<a href="/category/${slug(c)}/${slug(s)}/">${esc(s)}</a>`
            ).join('')}
          </details>
          `
          : `
          <a
            class="${active === c ? 'active' : ''}"
            href="/category/${slug(c)}/"
          >
            ${esc(c)}
          </a>
          `
      ).join('')}
    </nav>
  </aside>`;
}

function shell(title, desc, body, active = '') {
  return `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">

    <link rel="stylesheet" href="/assets/style.css">
  </head>

  <body>
    <div class="app">

      ${sidebar(active)}

      <main>
        <div class="topbar">
          <button class="mobile">☰</button>

          <div class="search">
            <span>⌕</span>
            <input id="search" placeholder="Search this page…">
          </div>
        </div>

        ${body}
      </main>
    </div>

    <script src="/assets/app.js"></script>
  </body>
  </html>`;
}

function articleSidebar(active = '') {
  return `
  <aside class="article-sidebar">

    <div class="article-sidebar-title">Categories</div>

    <nav class="nav">

      ${cats.map(c =>
        subs[c]
          ? `
          <details ${active === c ? 'open' : ''}>
            <summary>
              ${esc(c)}
              <span class="chev">›</span>
            </summary>

            <a href="/category/${slug(c)}/">
              All ${esc(c)}
            </a>

            ${subs[c].map(s =>
              `<a href="/category/${slug(c)}/${slug(s)}/">${esc(s)}</a>`
            ).join('')}
          </details>
          `
          : `
          <a
            class="${active === c ? 'active' : ''}"
            href="/category/${slug(c)}/"
          >
            ${esc(c)}
          </a>
          `
      ).join('')}

    </nav>
  </aside>`;
}

function articleShell(title, desc, body, active = '') {
  return `
  <!doctype html>
  <html lang="en">

  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">

    <link rel="stylesheet" href="/assets/style.css">
  </head>

  <body>

    <main class="article-main">

      <div class="article-topbar">

        <a class="article-brand" href="/">
          <span class="mark">K</span>

          <span>
            <strong>Kerala PSC</strong>
            <small>Focused Notes</small>
          </span>
        </a>

        <div class="search">
          <span>⌕</span>
          <input id="search" placeholder="Search this page…">
        </div>

      </div>

      ${body}

    </main>

    <script src="/assets/app.js"></script>
  </body>

  </html>`;
}


/* HOME PAGE */

const cards = cats.map(c => {
  let n = items.filter(x => x.category === c).length;

  return `
  <a
    class="card"
    data-search="${esc(c.toLowerCase())}"
    href="/category/${slug(c)}/"
  >

    <div class="icon">${esc(c[0])}</div>

    <h3>${esc(c)}</h3>

    <p>
      ${subs[c]
        ? subs[c].join(' · ')
        : 'Browse syllabus-based study material'}
    </p>

    <div class="count">
      ${n} ${n === 1 ? 'entry' : 'entries'}
    </div>

  </a>`;
}).join('');

write(
  'index.html',
  shell(
    'Kerala PSC Notes | Syllabus-Based Study Material',
    'Kerala PSC notes organised by syllabus category and topic for focused preparation.',
    `
    <section class="hero">
      <div class="eyebrow">Syllabus-based preparation</div>

      <h1>Kerala PSC Notes</h1>

      <p>
        Focused study material, organised exactly where you expect it.
        Choose a subject and start revising.
      </p>
    </section>

    <div class="section-head">
      <div>
        <h2>Browse subjects</h2>
        <p>Built around the Kerala PSC syllabus.</p>
      </div>
    </div>

    <section class="grid">
      ${cards}
    </section>
    `,
    'Home'
  )
);


/* CATEGORY PAGES */

for (const c of cats) {

  let ci = items.filter(x => x.category === c);

  let subnav = subs[c]
    ? `
      <section class="grid">
        ${subs[c].map(s => `
          <a
            class="card"
            data-search="${s.toLowerCase()}"
            href="/category/${slug(c)}/${slug(s)}/"
          >
            <div class="icon">${s[0]}</div>
            <h3>${s}</h3>
            <p>Browse ${s} material</p>
          </a>
        `).join('')}
      </section>
      `
    : '';

  let rows = ci.map(x => `
    <a
      class="article-row"
      data-search="${esc(
        (x.title + ' ' + (x.tags || []).join(' ')).toLowerCase()
      )}"
      href="/content/${x.slug}/"
    >

      <h3>${esc(x.title)}</h3>

      <div class="meta">
        ${esc(x.subcategory || c)}
      </div>

      <div class="tags">
        ${(x.tags || []).map(t =>
          `<span class="tag">${esc(t)}</span>`
        ).join('')}
      </div>

    </a>
  `).join('') || '<div class="empty">No content added yet.</div>';

  write(
    `category/${slug(c)}/index.html`,
    shell(
      `${c} | Kerala PSC Notes`,
      `Kerala PSC ${c} study material organised for quick revision.`,
      `
      <div class="breadcrumb">
        <a href="/">Home</a> / ${esc(c)}
      </div>

      <div class="section-head">
        <div>
          <h2>${esc(c)}</h2>

          <p>
            ${subs[c]
              ? 'Choose a subcategory or browse everything below.'
              : 'Browse all material in this category.'}
          </p>
        </div>
      </div>

      ${subnav}

      <div class="section-head">
        <div>
          <h2>All content</h2>
        </div>
      </div>

      <div class="article-list">
        ${rows}
      </div>
      `,
      c
    )
  );

  if (subs[c]) {

    for (const s of subs[c]) {

      let si = ci.filter(x => x.subcategory === s);

      let r = si.map(x => `
        <a
          class="article-row"
          data-search="${esc(
            (x.title + ' ' + (x.tags || []).join(' ')).toLowerCase()
          )}"
          href="/content/${x.slug}/"
        >

          <h3>${esc(x.title)}</h3>

          <div class="tags">
            ${(x.tags || []).map(t =>
              `<span class="tag">${esc(t)}</span>`
            ).join('')}
          </div>

        </a>
      `).join('') || '<div class="empty">No content added yet.</div>';

      write(
        `category/${slug(c)}/${slug(s)}/index.html`,
        shell(
          `${s} | Kerala PSC Notes`,
          `Kerala PSC ${s} study material and revision notes.`,
          `
          <div class="breadcrumb">
            <a href="/">Home</a> /
            <a href="/category/${slug(c)}/">${esc(c)}</a> /
            ${esc(s)}
          </div>

          <div class="section-head">
            <div>
              <h2>${esc(s)}</h2>
              <p>${esc(c)}</p>
            </div>
          </div>

          <div class="article-list">
            ${r}
          </div>
          `,
          c
        )
      );
    }
  }
}


/* INDIVIDUAL NOTE PAGES */

for (const x of items) {

  write(
    `content/${x.slug}/index.html`,

    articleShell(
      x.seo_title || x.title,
      x.meta_description || '',

      `
      <div class="article-page-container">

        <div class="breadcrumb article-breadcrumb">
          <a href="/">Home</a> /
          <a href="/category/${slug(x.category)}/">
            ${esc(x.category)}
          </a>
          ${x.subcategory ? ` / ${esc(x.subcategory)}` : ''}
        </div>

        <div class="article-layout">

          <article class="content article-content">

            <div class="eyebrow">
              ${esc(x.category)}
              ${x.subcategory ? ` / ${esc(x.subcategory)}` : ''}
            </div>

            <h1 class="note-title">
              ${esc(x.title)}
            </h1>

            <div class="tags title-tags">
              ${(x.tags || []).map(t =>
                `<span class="tag">${esc(t)}</span>`
              ).join('')}
            </div>

            <div class="note-body">
              ${md(x.body)}
            </div>

          </article>

          ${articleSidebar(x.category)}

        </div>

      </div>
      `,

      x.category
    )
  );
}


function write(rel, html) {
  let p = path.join(out, rel);

  fs.mkdirSync(path.dirname(p), {
    recursive: true
  });

  fs.writeFileSync(p, html);
}

const searchIndex = items.map(x => ({
  title: x.title,
  category: x.category,
  subcategory: x.subcategory || '',
  tags: x.tags || [],
  body: x.body || '',
  url: `/content/${x.slug}/`
}));

fs.writeFileSync(
  path.join(out, 'search-index.json'),
  JSON.stringify(searchIndex)
);

console.log(`Built ${items.length} content entries.`);
