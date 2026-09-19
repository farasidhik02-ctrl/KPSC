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
      wrapper.innerHTML = '';
      wrapper.classList.remove('open');
      return;
    }

    const words = search.split(/\s+/).filter(Boolean);

    const results = searchIndex
      .map(item => {
        const title = (item.title || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const subcategory = (item.subcategory || '').toLowerCase();
        const body = (item.body || '').toLowerCase();

        const haystack = [
          title,
          tags,
          category,
          subcategory,
          body
        ].join(' ');

        if (!words.every(word => haystack.includes(word))) {
          return null;
        }

        let score = 0;

        if (title.includes(search)) score += 100;
        if (tags.includes(search)) score += 60;
        if (subcategory.includes(search)) score += 40;
        if (category.includes(search)) score += 30;
        if (body.includes(search)) score += 10;

        words.forEach(word => {
          if (title.includes(word)) score += 15;
          if (tags.includes(word)) score += 8;
        });

        return { ...item, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (!results.length) {
      wrapper.innerHTML = `
        <div class="search-empty">
          No notes found for "<strong>${escapeHTML(search)}</strong>"
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
          ${item.subcategory ? ` · ${escapeHTML(item.subcategory)}` : ''}
        </div>

        ${
          item.tags && item.tags.length
            ? `
              <div class="search-result-tags">
                ${item.tags.slice(0, 3).map(tag =>
                  `<span>${escapeHTML(tag)}</span>`
                ).join('')}
              </div>
            `
            : ''
        }
      </a>
    `).join('');

    wrapper.classList.add('open');
  });

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
