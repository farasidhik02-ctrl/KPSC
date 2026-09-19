import fs from 'fs';
import path from 'path';

const root = process.cwd();
const out = path.join(root, 'dist');

/* =========================================================
   SITE CONFIG
   ========================================================= */

const SITE_URL = 'https://www.keralapscnotes.qd.je';
const SITE_NAME = 'Kerala PSC Notes';

const HOME_TITLE =
  'Kerala PSC Notes | Free Study Notes & Exam Preparation';

const HOME_DESCRIPTION =
  'Free, syllabus-based Kerala PSC study notes and question bank covering history, geography, economics, constitution, science, current affairs and more.';

/* =========================================================
   BUILD SETUP
   ========================================================= */

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.cpSync(path.join(root, 'public'), out, {
  recursive: true
});

/* =========================================================
   CATEGORIES
   ========================================================= */

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
  History: [
    'Kerala History',
    'Indian History',
    'World History'
  ],

  Geography: [
    'Kerala Geography',
    'Indian Geography',
    'World & General Geography'
  ],

  Economics: [
    'Economic Concepts',
    'Indian Economy',
    'Kerala Economy'
  ]
};

/* =========================================================
   HELPERS
   ========================================================= */

const slug = s =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

function absolute(urlPath = '/') {
  if (/^https?:\/\//i.test(urlPath)) return urlPath;

  return `${SITE_URL}${
    urlPath.startsWith('/') ? urlPath : `/${urlPath}`
  }`;
}

function jsonLd(data) {
  return `
  <script type="application/ld+json">
  ${JSON.stringify(data)}
  </script>`;
}

function write(file, html) {
  const target = path.join(out, file);

  fs.mkdirSync(path.dirname(target), {
    recursive: true
  });

  fs.writeFileSync(target, html);
}

/* =========================================================
   FRONT MATTER PARSER
   ========================================================= */

function parse(f) {
  const text = fs.readFileSync(f, 'utf8');

  const match = text.match(
    /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
  );

  if (!match) return null;

  const data = {};
  let key = '';

  for (const line of match[1].split('\n')) {
    const field = line.match(
      /^([\w_]+):\s*(.*)$/
    );

    if (field) {
      key = field[1];

      data[key] = field[2]
        .replace(/^['"]|['"]$/g, '');

      if (key === 'tags') {
        data.tags = [];
      }
    } else if (
      /^\s*-\s+/.test(line) &&
      key === 'tags'
    ) {
      data.tags.push(
        line
          .replace(/^\s*-\s+/, '')
          .replace(/^['"]|['"]$/g, '')
      );
    }
  }

  data.body = match[2];

  data.slug = slug(
    data.title ||
    path.basename(f, '.md')
  );

  return data;
}

/* =========================================================
   LOAD CONTENT
   ========================================================= */

const contentDir = path.join(root, 'content');

const files = fs.existsSync(contentDir)
  ? fs
      .readdirSync(contentDir)
      .filter(x => x.endsWith('.md'))
  : [];

const items = files
  .map(file =>
    parse(path.join(contentDir, file))
  )
  .filter(Boolean);

/* =========================================================
   MARKDOWN RENDERER
   ========================================================= */

function md(s) {
  if (!s) return '';

  const lines = s
    .replace(/\r/g, '')
    .split('\n');

  let html = '';
  let i = 0;

  const inline = text => {
    let safe = esc(text);

    /*
       Images.

       Supports both:
       ![](/uploads/image.webp)

       and Pages CMS style:
       ![](</uploads/image name.webp>)
    */

    safe = safe.replace(
      /!\[([^\]]*)\]\((?:&lt;)?(.*?)(?:&gt;)?\)/g,
      (match, alt, src) => {
        const cleanSrc = src
          .replace(/^&lt;/, '')
          .replace(/&gt;$/, '')
          .trim();

        return `
          <img
            src="${cleanSrc}"
            alt="${alt}"
          >
        `;
      }
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
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
      line
    );

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

    if (!trimmed) {
      i++;
      continue;
    }

    /* Horizontal rule */

    if (
      /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
    ) {
      html += '<hr>';
      i++;
      continue;
    }

    /* Headings */

    if (/^###\s+/.test(trimmed)) {
      html += `
        <h3>
          ${inline(
            trimmed.replace(/^###\s+/, '')
          )}
        </h3>
      `;

      i++;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      html += `
        <h2>
          ${inline(
            trimmed.replace(/^##\s+/, '')
          )}
        </h2>
      `;

      i++;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      html += `
        <h2>
          ${inline(
            trimmed.replace(/^#\s+/, '')
          )}
        </h2>
      `;

      i++;
      continue;
    }

    /* Tables */

    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers =
        tableCells(line);

      i += 2;

      const rows = [];

      while (
        i < lines.length &&
        lines[i].trim() &&
        lines[i].includes('|')
      ) {
        rows.push(
          tableCells(lines[i])
        );

        i++;
      }

      html += `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${headers
                  .map(
                    cell =>
                      `<th>${inline(cell)}</th>`
                  )
                  .join('')}
              </tr>
            </thead>

            <tbody>
              ${rows
                .map(
                  row => `
                    <tr>
                      ${row
                        .map(
                          cell =>
                            `<td>${inline(cell)}</td>`
                        )
                        .join('')}
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;

      continue;
    }

    /* Blockquotes */

    if (/^>\s?/.test(trimmed)) {
      const quote = [];

      while (
        i < lines.length &&
        /^>\s?/.test(
          lines[i].trim()
        )
      ) {
        quote.push(
          lines[i]
            .trim()
            .replace(/^>\s?/, '')
        );

        i++;
      }

      html += `
        <blockquote>
          ${quote
            .map(x => inline(x))
            .join('<br>')}
        </blockquote>
      `;

      continue;
    }

    /* Unordered lists */

    if (/^[-*]\s+/.test(trimmed)) {
      const list = [];

      while (
        i < lines.length &&
        /^[-*]\s+/.test(
          lines[i].trim()
        )
      ) {
        list.push(
          lines[i]
            .trim()
            .replace(/^[-*]\s+/, '')
        );

        i++;
      }

      html += `
        <ul>
          ${list
            .map(
              x =>
                `<li>${inline(x)}</li>`
            )
            .join('')}
        </ul>
      `;

      continue;
    }

    /* Ordered lists */

    if (/^\d+\.\s+/.test(trimmed)) {
      const list = [];

      while (
        i < lines.length &&
        /^\d+\.\s+/.test(
          lines[i].trim()
        )
      ) {
        list.push(
          lines[i]
            .trim()
            .replace(
              /^\d+\.\s+/,
              ''
            )
        );

        i++;
      }

      html += `
        <ol>
          ${list
            .map(
              x =>
                `<li>${inline(x)}</li>`
            )
            .join('')}
        </ol>
      `;

      continue;
    }

    /* Paragraph */

    const paragraph = [trimmed];

    i++;

    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(
        lines[i].trim()
      ) &&
      !/^>\s?/.test(
        lines[i].trim()
      ) &&
      !/^[-*]\s+/.test(
        lines[i].trim()
      ) &&
      !/^\d+\.\s+/.test(
        lines[i].trim()
      ) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(
        lines[i].trim()
      ) &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        isTableDivider(
          lines[i + 1]
        )
      )
    ) {
      paragraph.push(
        lines[i].trim()
      );

      i++;
    }

    html += `
      <p>
        ${paragraph
          .map(x => inline(x))
          .join('<br>')}
      </p>
    `;
  }

  return html;
}

/* =========================================================
   SEO HEAD
   ========================================================= */

function seoHead({
  title,
  description,
  canonical,
  type = 'website',
  schema = []
}) {
  const url = absolute(canonical);

  return `
    <title>${esc(title)}</title>

    <meta
      name="description"
      content="${esc(description)}"
    >

    <meta
      name="robots"
      content="index, follow"
    >

    <link
      rel="canonical"
      href="${esc(url)}"
    >

    <meta
      property="og:site_name"
      content="${SITE_NAME}"
    >

    <meta
      property="og:title"
      content="${esc(title)}"
    >

    <meta
      property="og:description"
      content="${esc(description)}"
    >

    <meta
      property="og:type"
      content="${type}"
    >

    <meta
      property="og:url"
      content="${esc(url)}"
    >

    <meta
      name="twitter:card"
      content="summary"
    >

    <meta
      name="twitter:title"
      content="${esc(title)}"
    >

    <meta
      name="twitter:description"
      content="${esc(description)}"
    >

    ${schema.map(jsonLd).join('\n')}
  `;
}

/* =========================================================
   SITE-WIDE SCHEMA
   ========================================================= */

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: HOME_DESCRIPTION
};

/* =========================================================
   NAVIGATION
   ========================================================= */

function nav(active = '') {
  return `
    <div class="nav">

      <div class="nav-label">
        Subjects
      </div>

      ${cats
        .map(c =>
          subs[c]
            ? `
              <details
                ${active === c ? 'open' : ''}
              >
                <summary>
                  ${esc(c)}
                  <span class="chev">›</span>
                </summary>

                <a
                  href="/category/${slug(c)}/"
                >
                  All ${esc(c)}
                </a>

                ${subs[c]
                  .map(
                    s => `
                      <a
                        href="/category/${slug(c)}/${slug(s)}/"
                      >
                        ${esc(s)}
                      </a>
                    `
                  )
                  .join('')}

              </details>
            `
            : `
              <a
                class="${
                  active === c
                    ? 'active'
                    : ''
                }"
                href="/category/${slug(c)}/"
              >
                ${esc(c)}
              </a>
            `
        )
        .join('')}
    </div>
  `;
}

function articleSidebar(active = '') {
  return `
    <aside class="article-sidebar">

      <div class="article-sidebar-title">
        Categories
      </div>

      ${nav(active)}

    </aside>
  `;
}

/* =========================================================
   FOOTER
   ========================================================= */

function footer() {
  return `
    <footer class="site-footer">

      <div class="footer-links">

        <a href="/about/">
          About
        </a>

        <a href="/contact/">
          Contact
        </a>

        <a href="/privacy/">
          Privacy Policy
        </a>

        <a href="/disclaimer/">
          Disclaimer
        </a>

      </div>

      <p>
        © ${new Date().getFullYear()}
        Kerala PSC Notes.
        Independent study resource.
      </p>

    </footer>
  `;
}

/* =========================================================
   NORMAL SITE SHELL
   ========================================================= */

function shell({
  title,
  description,
  canonical,
  body,
  active = '',
  schema = []
}) {
  return `
<!doctype html>

<html lang="en">

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
    <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-S50QTXPT9M"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-S50QTXPT9M');
  </script>

  ${seoHead({
    title,
    description,
    canonical,
    schema
  })}

  <link
    rel="stylesheet"
    href="/assets/style.css"
  >

</head>

<body>

  <div class="app">

    <aside class="sidebar">

      <a
        class="brand"
        href="/"
      >

        <span class="mark">
          K
        </span>

        <span>
          <strong>
            Kerala PSC
          </strong>

          <small>
            Focused Notes
          </small>
        </span>

      </a>

      ${nav(active)}

    </aside>

    <main>

      <div class="topbar">

        <button
          class="mobile"
          type="button"
        >
          ☰
        </button>

        <div class="search">

          <span>⌕</span>

          <input
            id="search"
            placeholder="Search all notes…"
            aria-label="Search all notes"
          >

        </div>

      </div>

      ${body}

      ${footer()}

    </main>

  </div>

  <script src="/assets/app.js"></script>

</body>

</html>
  `;
}

/* =========================================================
   ARTICLE SHELL
   ========================================================= */

function articleShell({
  title,
  description,
  canonical,
  body,
  active = '',
  schema = []
}) {
  return `
<!doctype html>

<html lang="en">

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >

  ${seoHead({
    title,
    description,
    canonical,
    type: 'article',
    schema
  })}

  <link
    rel="stylesheet"
    href="/assets/style.css"
  >

</head>

<body>

  <main class="article-main">

    <div class="article-topbar">

      <a
        class="article-brand"
        href="/"
      >

        <span class="mark">
          K
        </span>

        <span>

          <strong>
            Kerala PSC
          </strong>

          <small>
            Focused Notes
          </small>

        </span>

      </a>

      <div class="search">

        <span>⌕</span>

        <input
          id="search"
          placeholder="Search all notes…"
          aria-label="Search all notes"
        >

      </div>

    </div>

    ${body}

    ${footer()}

  </main>

  <script src="/assets/app.js"></script>

</body>

</html>
  `;
}

/* =========================================================
   HOMEPAGE
   ========================================================= */

const homeBody = `

<section class="hero">

  <div class="eyebrow">
    Kerala PSC Preparation
  </div>

  <h1>
    Kerala PSC Notes
  </h1>

  <p>
    Free, syllabus-based study notes and
    question bank for Kerala PSC preparation.
  </p>

</section>

<div class="section-head">

  <div>

    <h2>
      Browse Subjects
    </h2>

    <p>
      Study topic by topic.
    </p>

  </div>

</div>

<div class="grid">

  ${cats
    .map(c => {
      const count = items.filter(
        x => x.category === c
      ).length;

      return `
        <a
          class="card"
          href="/category/${slug(c)}/"
          data-search="${esc(
            c.toLowerCase()
          )}"
        >

          <div class="icon">
            ${esc(c.charAt(0))}
          </div>

          <h3>
            ${esc(c)}
          </h3>

          <p>
            Study notes and revision material.
          </p>

          <div class="count">
            ${count}
            ${count === 1 ? 'note' : 'notes'}
          </div>

        </a>
      `;
    })
    .join('')}

</div>
`;

write(
  'index.html',
  shell({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonical: '/',
    body: homeBody,
    schema: [websiteSchema]
  })
);

/* =========================================================
   CATEGORY PAGES
   ========================================================= */

for (const category of cats) {
  const categoryItems = items.filter(
    x => x.category === category
  );

  const categoryDescription =
    `Free Kerala PSC ${category} notes, study material and revision resources for Kerala PSC exam preparation.`;

  const rows = categoryItems.length
    ? categoryItems
        .map(
          x => `
            <a
              class="article-row"
              href="/content/${x.slug}/"
              data-search="${esc(
                (
                  x.title +
                  ' ' +
                  (x.tags || []).join(' ')
                ).toLowerCase()
              )}"
            >

              <h3>
                ${esc(x.title)}
              </h3>

              <div class="meta">
                ${esc(x.subcategory || category)}
              </div>

              <div class="tags">
                ${(x.tags || [])
                  .map(
                    t =>
                      `<span class="tag">${esc(t)}</span>`
                  )
                  .join('')}
              </div>

            </a>
          `
        )
        .join('')
    : `
      <div class="empty">
        Notes will be added here soon.
      </div>
    `;

  write(
    `category/${slug(category)}/index.html`,

    shell({
      title:
        `${category} Notes | Kerala PSC Notes`,

      description:
        categoryDescription,

      canonical:
        `/category/${slug(category)}/`,

      active:
        category,

      body: `
        <div class="breadcrumb">
          <a href="/">Home</a>
          /
          ${esc(category)}
        </div>

        <div class="section-head">

          <div>

            <div class="eyebrow">
              Kerala PSC
            </div>

            <h1>
              ${esc(category)}
            </h1>

            <p>
              Notes, facts and revision material.
            </p>

          </div>

        </div>

        <div class="article-list">
          ${rows}
        </div>
      `
    })
  );

  /* SUBCATEGORY PAGES */

  if (subs[category]) {
    for (
      const subcategory
      of subs[category]
    ) {
      const subItems =
        items.filter(
          x =>
            x.category === category &&
            x.subcategory === subcategory
        );

      const subRows =
        subItems.length
          ? subItems
              .map(
                x => `
                  <a
                    class="article-row"
                    href="/content/${x.slug}/"
                    data-search="${esc(
                      (
                        x.title +
                        ' ' +
                        (x.tags || [])
                          .join(' ')
                      ).toLowerCase()
                    )}"
                  >

                    <h3>
                      ${esc(x.title)}
                    </h3>

                    <div class="tags">

                      ${(x.tags || [])
                        .map(
                          t =>
                            `<span class="tag">${esc(t)}</span>`
                        )
                        .join('')}

                    </div>

                  </a>
                `
              )
              .join('')
          : `
            <div class="empty">
              Notes will be added here soon.
            </div>
          `;

      write(
        `category/${slug(category)}/${slug(subcategory)}/index.html`,

        shell({
          title:
            `${subcategory} | Kerala PSC Notes`,

          description:
            `Free ${subcategory} notes and revision material for Kerala PSC exam preparation.`,

          canonical:
            `/category/${slug(category)}/${slug(subcategory)}/`,

          active:
            category,

          body: `

            <div class="breadcrumb">

              <a href="/">
                Home
              </a>

              /

              <a
                href="/category/${slug(category)}/"
              >
                ${esc(category)}
              </a>

              /

              ${esc(subcategory)}

            </div>

            <div class="section-head">

              <div>

                <div class="eyebrow">
                  ${esc(category)}
                </div>

                <h1>
                  ${esc(subcategory)}
                </h1>

              </div>

            </div>

            <div class="article-list">
              ${subRows}
            </div>
          `
        })
      );
    }
  }
}

/* =========================================================
   ARTICLE / NOTE PAGES
   ========================================================= */

for (const x of items) {
  const canonical =
    `/content/${x.slug}/`;

  const title =
    x.seo_title ||
    `${x.title} | Kerala PSC Notes`;

  const description =
    x.meta_description ||
    `Study ${x.title} for Kerala PSC with clear notes, important facts and revision material.`;

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${SITE_URL}/`
    },

    {
      '@type': 'ListItem',
      position: 2,
      name: x.category,
      item:
        `${SITE_URL}/category/${slug(x.category)}/`
    }
  ];

  if (x.subcategory) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: x.subcategory,
      item:
        `${SITE_URL}/category/${slug(x.category)}/${slug(x.subcategory)}/`
    });
  }

  breadcrumbItems.push({
    '@type': 'ListItem',
    position:
      breadcrumbItems.length + 1,
    name: x.title,
    item:
      `${SITE_URL}${canonical}`
  });

  const breadcrumbSchema = {
    '@context':
      'https://schema.org',

    '@type':
      'BreadcrumbList',

    itemListElement:
      breadcrumbItems
  };

  const articleSchema = {
    '@context':
      'https://schema.org',

    '@type':
      'Article',

    headline:
      x.title,

    description:
      description,

    mainEntityOfPage: {
      '@type':
        'WebPage',

      '@id':
        `${SITE_URL}${canonical}`
    },

    publisher: {
      '@type':
        'Organization',

      name:
        SITE_NAME,

      url:
        `${SITE_URL}/`
    }
  };

  const subBreadcrumb =
    x.subcategory
      ? `
        /
        <a
          href="/category/${slug(x.category)}/${slug(x.subcategory)}/"
        >
          ${esc(x.subcategory)}
        </a>
      `
      : '';

  write(
    `content/${x.slug}/index.html`,

    articleShell({
      title,
      description,
      canonical,
      active:
        x.category,

      schema: [
        articleSchema,
        breadcrumbSchema
      ],

      body: `

        <div class="article-page-container">

          <div class="breadcrumb article-breadcrumb">

            <a href="/">
              Home
            </a>

            /

            <a
              href="/category/${slug(x.category)}/"
            >
              ${esc(x.category)}
            </a>

            ${subBreadcrumb}

            /
            ${esc(x.title)}

          </div>

          <div class="article-layout">

            <article class="content article-content">

              <div class="eyebrow">

                ${esc(x.category)}

                ${
                  x.subcategory
                    ? ` / ${esc(x.subcategory)}`
                    : ''
                }

              </div>

              <h1 class="note-title">
                ${esc(x.title)}
              </h1>

              <div class="tags title-tags">

                ${(x.tags || [])
                  .map(
                    t =>
                      `<span class="tag">${esc(t)}</span>`
                  )
                  .join('')}

              </div>

              <div class="note-body">
                ${md(x.body)}
              </div>

            </article>

            ${articleSidebar(
              x.category
            )}

          </div>

        </div>
      `
    })
  );
}

/* =========================================================
   ABOUT PAGE
   ========================================================= */

write(
  'about/index.html',

  shell({
    title:
      'About | Kerala PSC Notes',

    description:
      'Learn about Kerala PSC Notes, an independent study resource providing syllabus-based notes and revision material for Kerala PSC aspirants.',

    canonical:
      '/about/',

    body: `

      <article class="content">

        <div class="eyebrow">
          About
        </div>

        <h1>
          About Kerala PSC Notes
        </h1>

        <p>
          Kerala PSC Notes is an independent
          study resource created to make Kerala
          PSC preparation simpler, faster and
          easier to revise.
        </p>

        <p>
          The website organises study material
          according to major Kerala PSC syllabus
          areas including history, geography,
          economics, constitution, science,
          current affairs, reasoning, languages
          and other exam topics.
        </p>

        <p>
          Our aim is to provide clear,
          syllabus-focused notes, important facts,
          question-based revision material and
          useful connections between related
          topics.
        </p>

        <h2>
          Independent study resource
        </h2>

        <p>
          Kerala PSC Notes is not an official
          website of the Kerala Public Service
          Commission and is not affiliated with
          or endorsed by the Commission.
        </p>

      </article>
    `
  })
);

/* =========================================================
   CONTACT PAGE
   ========================================================= */

write(
  'contact/index.html',

  shell({
    title:
      'Contact | Kerala PSC Notes',

    description:
      'Contact Kerala PSC Notes regarding corrections, feedback, study material or website enquiries.',

    canonical:
      '/contact/',

    body: `

      <article class="content">

        <div class="eyebrow">
          Contact
        </div>

        <h1>
          Contact Kerala PSC Notes
        </h1>

        <p>
          Found an error, have a correction,
          or want to send feedback about the
          website?
        </p>

        <p>
          You can contact us regarding study
          material, corrections, technical
          problems or general website enquiries.
        </p>

        <p>
          <strong>Email:</strong>
          Contact details will be added here.
        </p>

      </article>
    `
  })
);

/* =========================================================
   PRIVACY POLICY
   ========================================================= */

write(
  'privacy/index.html',

  shell({
    title:
      'Privacy Policy | Kerala PSC Notes',

    description:
      'Privacy Policy for Kerala PSC Notes.',

    canonical:
      '/privacy/',

    body: `

      <article class="content">

        <div class="eyebrow">
          Legal
        </div>

        <h1>
          Privacy Policy
        </h1>

        <p>
          Kerala PSC Notes respects the privacy
          of visitors to this website.
        </p>

        <h2>
          Information we may collect
        </h2>

        <p>
          The website may collect standard
          technical and usage information such
          as browser type, device information,
          pages visited, referring pages and
          general interaction data through
          analytics and similar technologies.
        </p>

        <h2>
          Cookies
        </h2>

        <p>
          This website may use cookies or similar
          technologies to operate the site,
          understand website usage and, where
          applicable, support advertising.
        </p>

        <h2>
          Analytics
        </h2>

        <p>
          We may use analytics services to
          understand how visitors use the
          website and to improve its content
          and performance.
        </p>

        <h2>
          Advertising
        </h2>

        <p>
          The website may display advertising
          provided by third-party advertising
          services. Advertising providers may
          use cookies or similar technologies
          in accordance with their own policies
          and applicable consent requirements.
        </p>

        <h2>
          External links
        </h2>

        <p>
          Kerala PSC Notes may contain links to
          external websites. We are not
          responsible for the privacy practices
          or content of those websites.
        </p>

        <h2>
          Updates
        </h2>

        <p>
          This Privacy Policy may be updated as
          the website develops or when new
          services, analytics tools or advertising
          technologies are introduced.
        </p>

      </article>
    `
  })
);

/* =========================================================
   DISCLAIMER
   ========================================================= */

write(
  'disclaimer/index.html',

  shell({
    title:
      'Disclaimer | Kerala PSC Notes',

    description:
      'Disclaimer for Kerala PSC Notes, an independent Kerala PSC study resource.',

    canonical:
      '/disclaimer/',

    body: `

      <article class="content">

        <div class="eyebrow">
          Legal
        </div>

        <h1>
          Disclaimer
        </h1>

        <p>
          Kerala PSC Notes is an independent
          educational and study resource.
        </p>

        <p>
          This website is not affiliated with,
          authorised by, endorsed by or operated
          by the Kerala Public Service Commission.
        </p>

        <p>
          The study material on this website is
          provided for educational and revision
          purposes. While efforts are made to
          maintain accurate and useful
          information, users should verify
          important exam notifications, dates,
          eligibility requirements, syllabus
          changes and official instructions
          through the Kerala Public Service
          Commission's official publications.
        </p>

        <p>
          Exam patterns, syllabi, rules and other
          official information may change over
          time.
        </p>

      </article>
    `
  })
);

/* =========================================================
   SEARCH INDEX
   ========================================================= */

const searchIndex = items.map(x => ({
  title:
    x.title,

  category:
    x.category,

  subcategory:
    x.subcategory || '',

  tags:
    x.tags || [],

  body:
    x.body || '',

  url:
    `/content/${x.slug}/`
}));

fs.writeFileSync(
  path.join(
    out,
    'search-index.json'
  ),

  JSON.stringify(
    searchIndex
  )
);

/* =========================================================
   SITEMAP
   ========================================================= */

const sitemapUrls = new Set();

/* Homepage */

sitemapUrls.add(
  `${SITE_URL}/`
);

/* Static pages */

[
  '/about/',
  '/contact/',
  '/privacy/',
  '/disclaimer/'
].forEach(p =>
  sitemapUrls.add(
    absolute(p)
  )
);

/* Categories */

for (const category of cats) {
  sitemapUrls.add(
    absolute(
      `/category/${slug(category)}/`
    )
  );

  if (subs[category]) {
    for (
      const subcategory
      of subs[category]
    ) {
      sitemapUrls.add(
        absolute(
          `/category/${slug(category)}/${slug(subcategory)}/`
        )
      );
    }
  }
}

/* Notes */

for (const item of items) {
  sitemapUrls.add(
    absolute(
      `/content/${item.slug}/`
    )
  );
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${[...sitemapUrls]
  .map(
    url => `
  <url>
    <loc>${esc(url)}</loc>
  </url>`
  )
  .join('')}
</urlset>
`;

fs.writeFileSync(
  path.join(
    out,
    'sitemap.xml'
  ),
  sitemap
);

/* =========================================================
   ROBOTS.TXT
   ========================================================= */

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(
  path.join(
    out,
    'robots.txt'
  ),
  robots
);

/* =========================================================
   FINISHED
   ========================================================= */

console.log(
  `Built ${items.length} notes successfully.`
);

console.log(
  `Site: ${SITE_URL}`
);

console.log(
  `Sitemap: ${SITE_URL}/sitemap.xml`
);
