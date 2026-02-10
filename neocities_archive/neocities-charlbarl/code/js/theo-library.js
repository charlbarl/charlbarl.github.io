(() => {
  "use strict";

  // Ensure DOM is ready (works with or without `defer`)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    /* ============================
       Article data by book tag
       ============================ */
    const ARTICLES_BY_BOOK = {
      genesis: [
        { title: "Creation and Order", url: "/articles/creation-order.html" },
        { title: "Adam as Priest", url: "/articles/adam-priest.html" }
      ],
      psalms: [
        { title: "Christ in the Psalms", url: "/articles/christ-psalms.html" },
        { title: "Praying with David", url: "/articles/praying-david.html" }
      ],
      romans: [
        { title: "Justification in Romans", url: "/articles/romans-justification.html" }
      ]
      // Add more: exodus, matthew, mark, john, etc.
    };

    /* ============================
       DOM references
       ============================ */
    const shelf = document.querySelector(".shelf"); // event root (not used for clicks now)
    const panel = document.getElementById("book-articles");
    const panelTitle = document.getElementById("book-articles-title");
    const panelList = document.getElementById("book-articles-list");

    if (!panel || !panelTitle || !panelList) {
      console.warn("[theo-library] Missing #book-articles area; script disabled.");
      return;
    }

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Open state tracking
    let openTag = null;
    let openAnchor = null;
    let openBookEl = null;

    /* ============================
       Utilities
       ============================ */
    function isModifiedClick(event) {
      return (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button === 1
      );
    }

    function getBookFromEvent(target) {
      const book = target.closest(".book");
      if (!book) return null;
      const anchor = book.querySelector("a");
      if (!anchor) return null;
      const tag = book.dataset.tag;
      if (!tag) return null;
      return { book, anchor, tag };
    }

    function getBookDisplayName(bookEl) {
      const t =
        bookEl.querySelector(".spine-title")?.textContent ||
        bookEl.textContent ||
        "";
      return t.trim();
    }

    function setAriaExpandedSelected(anchor, expanded) {
      anchor.setAttribute("aria-expanded", String(expanded));
      anchor.setAttribute("aria-controls", "book-articles");
      anchor.setAttribute("aria-selected", expanded ? "true" : "false");
    }

    function renderArticles(tag, displayName) {
      const articles = ARTICLES_BY_BOOK[tag] || [];
      panelTitle.textContent = displayName || "";
      panelList.innerHTML = "";

      if (!articles.length) {
        const li = document.createElement("li");
        li.textContent = "No articles yet.";
        panelList.appendChild(li);
        return;
      }

      for (const article of articles) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = article.url;
        a.textContent = article.title;
        li.appendChild(a);
        panelList.appendChild(li);
      }
    }

    function openPanel(tag, anchor, bookEl, displayName) {
      // Clear old selection
      if (openBookEl) openBookEl.classList.remove("is-selected");
      if (openAnchor) setAriaExpandedSelected(openAnchor, false);

      // Render and show panel
      renderArticles(tag, displayName);
      panel.hidden = false;

      // Mark selected book
      bookEl.classList.add("is-selected");
      setAriaExpandedSelected(anchor, true);

      // Track
      openTag = tag;
      openAnchor = anchor;
      openBookEl = bookEl;

      // Scroll into view
      panel.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest"
      });
    }

    function closePanel() {
      if (openBookEl) openBookEl.classList.remove("is-selected");
      if (openAnchor) setAriaExpandedSelected(openAnchor, false);
      panel.hidden = true;
      openTag = null;
      openAnchor = null;
      openBookEl = null;
    }

    /* ============================
       Events: neutralize link behavior on anchors
       ============================ */

    // Guard to suppress duplicate events from same tap (iOS ghost click, etc.)
    let guardUntil = 0;
    const now = () => Date.now();
    const isGuarded = () => now() < guardUntil;
    const tripGuard = (ms = 250) => { guardUntil = now() + ms; };

    // Core toggle logic (reuses your open/close)
    function toggleBookFromAnchor(anchorEl, originalEvent) {
      const book = anchorEl.closest(".book");
      if (!book) return;

      const tag = book.dataset.tag;
      if (!tag) return;

      if (isGuarded()) {
        // Swallow duplicates
        return;
      }

      const displayName = getBookDisplayName(book);

      if (openTag === tag) {
        // CLOSE
        closePanel();
        tripGuard(280);
      } else {
        // OPEN
        openPanel(tag, anchorEl, book, displayName);
        tripGuard(200);
      }

      // Stop any default/bubbling that could re-trigger
      if (originalEvent) {
        if (originalEvent.cancelable) originalEvent.preventDefault();
        originalEvent.stopPropagation();
        if (originalEvent.stopImmediatePropagation) originalEvent.stopImmediatePropagation();
      }
    }

    // Attach handlers directly to each .book a (no delegation)
    function bindAnchorHandlers() {
      const anchors = document.querySelectorAll(".book a");
      anchors.forEach((a) => {
        // Ensure ARIA baseline exists
        if (!a.hasAttribute("aria-controls")) a.setAttribute("aria-controls", "book-articles");
        if (!a.hasAttribute("aria-expanded")) a.setAttribute("aria-expanded", "false");
        if (!a.hasAttribute("aria-selected")) a.setAttribute("aria-selected", "false");

        // (1) Capture touchstart: earliest phase on mobile
        a.addEventListener("touchstart", (e) => {
          if (isModifiedClick(e)) return; // let special gestures pass if needed
          if (e.cancelable) e.preventDefault();
          toggleBookFromAnchor(a, e);
        }, { passive: false, capture: true });

        // (2) Capture pointerdown: covers pen/mouse/touch (extra safety)
        a.addEventListener("pointerdown", (e) => {
          if (isModifiedClick(e)) return;
          if (e.cancelable) e.preventDefault();
          // Do not toggle here (we toggle on click), but prevent default early
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }, { passive: false, capture: true });

        // (3) Capture click: final toggle point for mouse/touch synth click
        a.addEventListener("click", (e) => {
          if (isModifiedClick(e)) return; // allow cmd/ctrl-click if you ever want to open link in new tab (will likely be prevented)
          if (e.cancelable) e.preventDefault();
          toggleBookFromAnchor(a, e);
        }, { passive: false, capture: true });

        // (4) Keyboard: Enter/Space (on the anchor)
        a.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggleBookFromAnchor(a, e);
        });
      });
    }

    bindAnchorHandlers();

    // ESC: close panel and return focus to the last open anchor
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        closePanel();
        openAnchor?.focus?.();
      }
    });

    // Respect reduced motion: optional BG canvas removal
    if (prefersReducedMotion) {
      const bgCanvas = document.getElementById("bgCanvas");
      if (bgCanvas) bgCanvas.remove();
    }
  }
})();