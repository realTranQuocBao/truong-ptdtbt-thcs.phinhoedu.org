(function () {
  const dataCache = {};

  const page = document.body.dataset.page || "home";
  const currentFile = location.pathname.split("/").pop() || "index.html";

  async function getJson(path) {
    if (dataCache[path]) return dataCache[path];
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Cannot load ${path}`);
    dataCache[path] = await response.json();
    return dataCache[path];
  }

  function byDateDesc(a, b) {
    return String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
  }

  function formatDate(value) {
    if (!value) return "Đang cập nhật";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function categoryLabel(categories, id) {
    return (categories.find((item) => item.id === id) || {}).label || "Thông tin";
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = text;
    });
  }

  function renderShell(config, navigation, documents) {
    document.documentElement.style.setProperty("--hero-image", `url("${config.branding.heroImage}")`);

    // BANNER: gán ảnh local có thật vào khối banner (sửa lỗi banner không hiển thị)
    document.querySelectorAll("[data-banner-image]").forEach((img) => {
      if (config.branding.bannerImage) img.setAttribute("src", config.branding.bannerImage);
      img.setAttribute("alt", config.school.name);
    });

    // Ảnh quảng cáo sidebar (qc1)
    document.querySelectorAll("[data-ad-image]").forEach((img) => {
      if (config.branding.adImage) img.setAttribute("src", config.branding.adImage);
      img.setAttribute("alt", "Khẩu hiệu giáo dục");
    });

    setText("[data-school-name]", config.school.name);
    setText("[data-school-short]", config.school.shortName);
    setText("[data-school-department]", config.school.department);
    setText("[data-school-address]", config.contact.address);
    setText("[data-school-year]", config.school.schoolYear);

    const nav = document.querySelector("[data-nav]");
    if (nav) {
      nav.innerHTML = navigation.items
        .filter((item) => item.visible)
        .sort((a, b) => a.order - b.order)
        .map((item) => `<a href="${item.href}" class="${item.href === currentFile ? "is-active" : ""}">${item.label}</a>`)
        .join("");
    }

    const quickLinks = document.querySelector("[data-quick-links]");
    if (quickLinks) {
      quickLinks.innerHTML = config.quickLinks
        .map((item) => `<a class="btn btn-outline" href="${item.href}">${item.label}</a>`)
        .join("");
    }

    const footer = document.querySelector("[data-footer-links]");
    if (footer) {
      const featuredDoc = documents.items.find((doc) => doc.id === config.featuredDocumentId);
      const groups = navigation.footerGroups
        .map((group) => {
          const links = group.itemIds
            .map((id) => navigation.items.find((item) => item.id === id))
            .filter(Boolean)
            .map((item) => `<a href="${item.href}">${item.label}</a>`)
            .join("");
          return `<div><h3>${group.title}</h3><div class="footer-links">${links}</div></div>`;
        })
        .join("");
      const legal = featuredDoc
        ? `<div><h3>Văn bản quan trọng</h3><div class="footer-links"><a href="${featuredDoc.file}">Quyết định thành lập trường</a><a href="tai-lieu.html">Kho tài liệu</a></div></div>`
        : "";
      footer.innerHTML = groups + legal;
    }
  }

  function docActions(doc) {
    if (!doc.file) return `<span class="pill">Đang cập nhật file</span>`;
    return `<div class="card-actions"><a class="btn btn-primary" href="${doc.file}" target="_blank" rel="noopener">Xem PDF</a><a class="btn btn-outline" href="${doc.file}" download>Tải về</a></div>`;
  }

  function renderFeaturedDocument(config, documents) {
    const doc = documents.items.find((item) => item.id === config.featuredDocumentId);
    document.querySelectorAll("[data-featured-document]").forEach((node) => {
      if (!doc) return;
      node.innerHTML = `
        <div>
          <span class="pill">Văn bản quan trọng</span>
          <h2>${doc.title}</h2>
          <p>${doc.description}</p>
          <div class="meta">
            <span>Số: ${doc.decisionNumber || "Đang cập nhật"}</span>
            <span>Ngày ban hành: ${formatDate(doc.issuedAt)}</span>
            <span>Cơ quan ban hành: ${doc.issuedBy || "Đang cập nhật"}</span>
          </div>
          ${docActions(doc)}
        </div>
        ${doc.previewImage ? `<img class="doc-preview" src="${doc.previewImage}" alt="Preview ${doc.title}" loading="lazy">` : ""}
      `;
    });
  }

  function renderNews(articles, limit) {
    const list = document.querySelector("[data-article-list]");
    if (!list) return;
    const items = articles.items
      .filter((item) => item.status === "published")
      .sort(byDateDesc)
      .slice(0, limit || articles.items.length);
    list.innerHTML = items
      .map((item) => `
        <article class="article-item" data-category="${item.categoryId}">
          <time datetime="${item.publishedAt}">${formatDate(item.publishedAt)}</time>
          <h3>${item.title}</h3>
          <p>${item.excerpt}</p>
          <span class="pill">${categoryLabel(articles.categories, item.categoryId)}</span>
        </article>
      `)
      .join("");
  }

  function renderSidebar(documents, articles) {
    const docBox = document.querySelector("[data-sidebar-documents]");
    if (docBox) {
      const items = documents.items
        .slice()
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .slice(0, 6)
        .map((doc) => `<li><a href="${doc.file || "tai-lieu.html"}">${doc.title}</a></li>`)
        .join("");
      if (items) docBox.innerHTML = items;
    }

    const noticeBox = document.querySelector("[data-sidebar-notices]");
    if (noticeBox) {
      const items = articles.items
        .filter((item) => item.status === "published")
        .sort(byDateDesc)
        .slice(0, 5)
        .map((item) => `<li><a href="tin-tuc.html">${item.title}</a></li>`)
        .join("");
      if (items) noticeBox.innerHTML = items;
    }
  }

  // Ảnh thumbnail local cho tin tức (đều có thật trong assets/images/crawled/)
  const NEWS_THUMBS = [
    "assets/images/crawled/z7103213786157-6d3143896600677d942af280b0c5b1b5-a1701-47a5f044.jpg",
    "assets/images/crawled/z7105760154690-c7574d049d12ae0c9671e4eb16c7f1d3-c761f-c8ec86e7.jpg",
    "assets/images/crawled/z3350655312137-b8d565cd24101b0e6c58a2ccc987eaa9-92e1a-6aef6041.jpg",
    "assets/images/crawled/z3350655317486-cc63734defbad1d2d183deac9d8d7fa2-2add8-1bb70288.jpg",
    "assets/images/crawled/z3696668696617-1619c4ea94b805e9a2fa6677109ac161-8692c-a6151433.jpg",
    "assets/images/crawled/z4991400768798-7ec63017f58091a2b64e6c59883ca283-bd928-eb02ee4e.jpg",
    "assets/images/crawled/z4140856114099-da287e0bd50e011c3bd8fc791239a4dd-1-65f33-6c31ee80.jpg",
    "assets/images/crawled/z5050077319885-9c1b109ad22bbbf65a44c1805beecdf2-ce4d9-80401c97.jpg"
  ];

  function renderNewsGrid(articles, limit) {
    const grid = document.querySelector("[data-news-grid]");
    if (!grid) return;
    const items = articles.items
      .filter((item) => item.status === "published")
      .sort(byDateDesc)
      .slice(0, limit || articles.items.length);
    grid.innerHTML = items
      .map((item, index) => {
        const thumb = item.coverImage || item.thumbnail || NEWS_THUMBS[index % NEWS_THUMBS.length];
        return `
        <article class="news-card" data-category="${item.categoryId}">
          <img class="news-thumb" src="${thumb}" alt="${item.title}" loading="lazy">
          <div class="news-body">
            <time datetime="${item.publishedAt}">${formatDate(item.publishedAt)}</time>
            <h3><a href="tin-tuc.html">${item.title}</a></h3>
            <p>${item.excerpt}</p>
            <span class="pill">${categoryLabel(articles.categories, item.categoryId)}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderArticleFilters(articles) {
    const filters = document.querySelector("[data-article-filters]");
    if (!filters) return;
    filters.innerHTML = `<button class="filter-btn is-active" data-filter="all">Tất cả</button>` + articles.categories
      .map((item) => `<button class="filter-btn" data-filter="${item.id}">${item.label}</button>`)
      .join("");
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      filters.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-article-list] .article-item, [data-news-grid] .news-card").forEach((item) => {
        item.hidden = filter !== "all" && item.dataset.category !== filter;
      });
    });
  }

  function renderDocuments(documents, options) {
    const list = document.querySelector("[data-document-list]");
    if (!list) return;
    const mode = options && options.mode;
    const items = documents.items.filter((doc) => {
      if (mode === "public") return doc.categoryId === "cong-khai" || doc.documentType === "founding-decision";
      return true;
    });
    list.innerHTML = items
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
      .map((doc) => `
        <article class="doc-item" id="${doc.id === "cong-khai-thuc-don-ban-tru" ? "ban-tru" : doc.id}">
          <span class="doc-type">${categoryLabel(documents.categories, doc.categoryId)}</span>
          <h3>${doc.title}</h3>
          <p>${doc.description}</p>
          <div class="meta">
            <span>${doc.issuedBy || "Đơn vị ban hành đang cập nhật"}</span>
            <span>${doc.issuedAt ? formatDate(doc.issuedAt) : doc.schoolYear || "Đang cập nhật"}</span>
          </div>
          ${docActions(doc)}
        </article>
      `)
      .join("");
  }

  function renderGallery(gallery, limit) {
    const list = document.querySelector("[data-gallery-list]");
    if (!list) return;
    list.innerHTML = gallery.albums
      .slice(0, limit || gallery.albums.length)
      .map((album) => `
        <article class="card">
          <img class="album-cover" src="${album.coverImage}" alt="${album.title}" loading="lazy">
          <h3>${album.title}</h3>
          <p>${album.description}</p>
        </article>
      `)
      .join("");
  }

  function setupMenu() {
    const button = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  }

  async function init() {
    setupMenu();
    try {
      const [config, navigation, documents, articles, gallery] = await Promise.all([
        getJson("assets/data/site-config.json"),
        getJson("assets/data/navigation.json"),
        getJson("assets/data/documents.json"),
        getJson("assets/data/articles.json"),
        getJson("assets/data/gallery.json")
      ]);
      renderShell(config, navigation, documents);
      renderSidebar(documents, articles);
      renderFeaturedDocument(config, documents);
      renderNews(articles, page === "home" ? 3 : undefined);
      renderNewsGrid(articles, page === "home" ? 4 : undefined);
      renderArticleFilters(articles);
      renderDocuments(documents, { mode: page === "public" ? "public" : "all" });
      renderGallery(gallery, page === "home" ? 2 : undefined);
    } catch (error) {
      document.body.classList.add("data-fallback");
      console.warn(error);
    }
  }

  init();
})();
