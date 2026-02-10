document.addEventListener('DOMContentLoaded', () => {
  fetch('code/data/articles.json')
    .then(res => res.json())
    .then(articles => {
      // global sort: newest first
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));

      document.querySelectorAll('[data-articles]').forEach(container => {
        const limit = parseInt(container.dataset.limit || '999', 10);
        const tagFilter = container.dataset.tags
          ? container.dataset.tags.split(',').map(t => t.trim())
          : null;

        let list = articles;

        if (tagFilter) {
          list = list.filter(a =>
            Array.isArray(a.tags) &&
            tagFilter.some(tag => a.tags.includes(tag))
          );
        }

        list.slice(0, limit).forEach(article => {
          container.appendChild(renderArticle(container, article));
        });
      });
    });
});

/* ---- renderers ---- */

function renderArticle(container, article) {
  // Sidebar photo cards
  if (container.classList.contains('sidebar-article-grid')) {
    const card = document.createElement('a');
    card.href = article.url;
    card.className = 'sidebar-card';

    card.innerHTML = `
      <div class="sidebar-thumb">
        <img src="${article.image}" alt="">
      </div>
      <div class="sidebar-meta">
        <h4>${article.title}</h4>
        <p class="sidebar-desc">${article.description || ''}</p>
        <time>${article.date}</time>
      </div>
    `;
    return card;
  }

  // Main grid cards
  const card = document.createElement('a');
  card.href = article.url;
  card.className = 'article-card';
  card.innerHTML = `
    <div class="article-thumb">
      <img src="${article.image}" alt="">
    </div>
    <div class="article-meta">
      <h3>${article.title}</h3>
      <p class="article-desc">${article.description || ''}</p>
      <time>${article.date}</time>
    </div>
  `;
  return card;
}

