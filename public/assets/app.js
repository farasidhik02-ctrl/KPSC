const q = document.querySelector('#search');

if (q) {
  const wrapper = document.createElement('div');
  wrapper.className = 'site-search-results';
  q.parentElement.appendChild(wrapper);

  let searchIndex = [];

  fetch('/search-index.json')
    .then(res => res.json())
    .then(data => {
      searchIndex = data;
    })
    .catch(err => {
      console.error('Search index could not be loaded:', err);
    });

  q.placeholder = 'Search all notes…';

  q.addEventListener('input', e => {
    const search = e.target.value.toLowerCase().trim();

    if (search.length < 2) {
      closeSearch();
      return;
    }

    const words = search.split(/\s+/).filter(Boolean);

    const results = searchIndex
      .map(item => {
        const title = (item.title || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const subcategory = (item.subcategory || '').toLowerCase();

        /*
         * Remove generic wording that appears everywhere.
         * This stops "ker" matching simply because a note
         * contains "Kerala PSC Notes".
         */
        const body = (item.body || '')
          .toLowerCase()
          .replace(/kerala psc notes/g, '')
          .replace(/kerala psc/g, '');

        const fields = [
          title,
          tags,
          subcategory,
          category,
          body
        ];

        if (!words.every(word =>
          fields.some(field => field.includes(word))
        )) {
          return null;
        }

        let score = 0;

        /* Exact/full phrase matches */
        if (title === search) score += 1000;
        else if (title.startsWith(search)) score += 500;
        else if (title.includes(search)) score += 350;

        if (tags.includes(search)) score += 220;
        if (subcategory.includes(search)) score += 150;
        if (category.includes(search)) score += 100;
        if (body.includes(search)) score += 40;

        /* Individual word matches */
        words.forEach(word => {
          if (title.includes(word)) score += 80;
          if (tags.includes(word)) score += 50;
          if (subcategory.includes(word)) score += 30;
          if (category.includes(word)) score += 20;
          if (body.includes(word)) score += 5;
        });

        return {
          ...item,
          score,
          snippet: makeSnippet(item.body || '', search, words)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    renderResults(results, search);
  });

  function renderResults(results, search) {
    if (!results.length) {
      wrapper.innerHTML = `
        <div class="search-empty">
          No notes found for
          "<strong>${escapeHTML(search)}</strong>"
        </div>
      `;

      wrapper.classList.add('open');
      return;
    }

    wrapper.innerHTML = results.map(item => `
      <a class="search-result" href="${item.url}">

        <div class="search-result-title">
          ${escapeHTML(item.title)}
        </div>

        <div class="search-result-meta">
          ${escapeHTML(item.category)}
          ${
            item.subcategory
              ? ` · ${escapeHTML(item.subcategory)}`
              : ''
          }
        </div>

        ${
          item.snippet
            ? `
              <div class="search-result-snippet">
                ${escapeHTML(item.snippet)}
              </div>
            `
            : ''
        }

      </a>
    `).join('');

    wrapper.classList.add('open');
  }

  function makeSnippet(body, search, words) {
    if (!body) return '';

    /*
     * Strip common Markdown formatting so search results
     * don't look messy.
     */
    const clean = body
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_>`~-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const lower = clean.toLowerCase();

    let position = lower.indexOf(search);

    if (position === -1) {
      for (const word of words) {
        position = lower.indexOf(word);

        if (position !== -1) break;
      }
    }

    /*
     * If the match was only category/tag/title,
     * don't show a random body excerpt.
     */
    if (position === -1) return '';

    const before = 65;
    const after = 115;

    let start = Math.max(0, position - before);
    let end = Math.min(clean.length, position + search.length + after);

    let snippet = clean.slice(start, end).trim();

    if (start > 0) snippet = '…' + snippet;
    if (end < clean.length) snippet += '…';

    return snippet;
  }

  function closeSearch() {
    wrapper.innerHTML = '';
    wrapper.classList.remove('open');
  }

  document.addEventListener('click', e => {
    if (!q.parentElement.contains(e.target)) {
      wrapper.classList.remove('open');
    }
  });

  q.addEventListener('focus', () => {
    if (q.value.trim().length >= 2) {
      q.dispatchEvent(new Event('input'));
    }
  });
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}


/* Mobile sidebar */

const b = document.querySelector('.mobile');
const sb = document.querySelector('.sidebar');

if (b && sb) {
  b.onclick = () => sb.classList.toggle('open');
}
