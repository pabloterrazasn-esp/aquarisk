const EVIDENCE_LIBRARY_URL = "/assets/evidence-library.v1.json?v=20260312-1";

const PUBLICATION_TYPE_LABELS = {
  all: "Todo",
  "official-report": "Reporte oficial",
  "review-perspective": "Revision / perspectiva",
  "research-article": "Articulo de investigacion"
};

const PUBLICATION_TOPIC_LABELS = {
  all: "Todos los temas",
  governance: "Gobernanza",
  drought: "Sequia",
  groundwater: "Aguas subterraneas",
  floods: "Inundaciones",
  "remote-sensing": "Observacion satelital",
  irrigation: "Irrigacion",
  "climate-risk": "Riesgo climatico"
};

document.addEventListener("DOMContentLoaded", () => {
  initLanguageSwitcher();
  initPublicationsPage();
  initHomeNavScroll();
  initMotionSystem();
});

function initLanguageSwitcher() {
  const langLinks = document.querySelectorAll("[data-lang]");
  const currentUrl = window.location.href.replace(/#.*$/, "");

  langLinks.forEach((link) => {
    const lang = link.getAttribute("data-lang");

    if (lang === "es") {
      link.href = currentUrl;
      link.classList.add("is-active");
      return;
    }

    const target = encodeURIComponent(currentUrl);
    link.href = `https://translate.google.com/translate?sl=es&tl=${lang}&u=${target}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

async function initPublicationsPage() {
  if (document.body.dataset.page !== "publications") {
    return;
  }

  const featuredRoot = document.querySelector("[data-publications-featured]");
  const gridRoot = document.querySelector("[data-publications-grid]");
  const trackRoot = document.querySelector("[data-reading-tracks]");
  const typeFilterRoot = document.querySelector("[data-filter-type]");
  const topicFilterRoot = document.querySelector("[data-filter-topic]");
  const searchInput = document.querySelector("[data-publications-search]");
  const statusRoot = document.querySelector("[data-publications-status]");
  const totalRoot = document.querySelector("[data-publications-total]");
  const topicCountRoot = document.querySelector("[data-publications-topic-count]");
  const regionCountRoot = document.querySelector("[data-publications-region-count]");
  const updatedRoot = document.querySelector("[data-publications-updated]");

  if (
    !featuredRoot ||
    !gridRoot ||
    !trackRoot ||
    !typeFilterRoot ||
    !topicFilterRoot ||
    !searchInput ||
    !statusRoot
  ) {
    return;
  }

  statusRoot.textContent = "Cargando biblioteca curada...";

  try {
    const response = await fetch(EVIDENCE_LIBRARY_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`No se pudo cargar la biblioteca (${response.status})`);
    }

    const library = await response.json();
    const publications = Array.isArray(library.publications) ? library.publications : [];
    const publicationById = new Map(publications.map((item) => [item.id, item]));
    const state = {
      type: "all",
      topic: "all",
      query: ""
    };

    const topicCount = new Set(publications.flatMap((item) => item.topics || [])).size;
    const regionCount = new Set(publications.flatMap((item) => item.regions || [])).size;

    if (totalRoot) {
      totalRoot.textContent = String(publications.length);
    }
    if (topicCountRoot) {
      topicCountRoot.textContent = String(topicCount);
    }
    if (regionCountRoot) {
      regionCountRoot.textContent = String(regionCount);
    }
    if (updatedRoot) {
      updatedRoot.textContent = library.updatedLabel || library.updatedAt || "Actualizacion reciente";
    }

    renderFeaturedPublications(featuredRoot, library.featuredIds || [], publicationById);
    renderReadingTracks(trackRoot, library.readingTracks || [], publicationById);

    const activeTypeValues = new Set(publications.map((item) => item.type).filter(Boolean));
    const activeTopicValues = new Set(publications.flatMap((item) => item.topics || []));

    const rerenderLibrary = () => {
      renderFilterButtons(
        typeFilterRoot,
        PUBLICATION_TYPE_LABELS,
        activeTypeValues,
        state.type,
        (nextValue) => {
          state.type = nextValue;
          rerenderLibrary();
        }
      );

      renderFilterButtons(
        topicFilterRoot,
        PUBLICATION_TOPIC_LABELS,
        activeTopicValues,
        state.topic,
        (nextValue) => {
          state.topic = nextValue;
          rerenderLibrary();
        }
      );

      const filtered = publications.filter((item) => publicationMatchesFilters(item, state));
      renderPublicationGrid(gridRoot, filtered);

      if (filtered.length === 0) {
        statusRoot.textContent = "No hay coincidencias con los filtros actuales.";
        return;
      }

      statusRoot.textContent = `${filtered.length} publicaciones visibles de ${publications.length} en la biblioteca inicial.`;
    };

    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim().toLowerCase();
      rerenderLibrary();
    });

    rerenderLibrary();
  } catch (error) {
    console.error(error);
    statusRoot.textContent = "No se pudo cargar la biblioteca editorial. Revisa el artefacto JSON.";
    featuredRoot.innerHTML = "";
    trackRoot.innerHTML = "";
    gridRoot.innerHTML = [
      '<article class="publication-card publication-card-empty">',
      "<h3>Biblioteca no disponible</h3>",
      "<p>El sitio no pudo leer el archivo de publicaciones curadas. La pagina queda publicada, pero sin contenido cargado.</p>",
      "</article>"
    ].join("");
  }
}

function renderFilterButtons(root, labelMap, activeValues, activeValue, onSelect) {
  const options = Object.entries(labelMap).filter(([value]) => value === "all" || activeValues.has(value));
  root.innerHTML = options
    .map(([value, label]) => {
      const isActive = value === activeValue;
      return [
        `<button class="filter-chip${isActive ? " is-active" : ""}" type="button" data-filter-value="${escapeHtml(value)}">`,
        escapeHtml(label),
        "</button>"
      ].join("");
    })
    .join("");

  root.querySelectorAll("[data-filter-value]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.getAttribute("data-filter-value")));
  });
}

function publicationMatchesFilters(publication, state) {
  if (state.type !== "all" && publication.type !== state.type) {
    return false;
  }

  if (state.topic !== "all" && !(publication.topics || []).includes(state.topic)) {
    return false;
  }

  if (!state.query) {
    return true;
  }

  const haystack = [
    publication.title,
    publication.source,
    publication.authors,
    publication.summary,
    publication.whyItMatters,
    ...(publication.regions || []),
    ...(publication.topics || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(state.query);
}

function initHomeNavScroll() {
  if (document.body.dataset.page !== "home") {
    return;
  }

  const getFixedOffset = () => {
    const topbar = document.querySelector(".topbar");
    const header = document.querySelector(".site-header");
    return (topbar?.offsetHeight || 0) + (header?.offsetHeight || 0);
  };

  document.querySelectorAll("a[data-scroll-target]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("data-scroll-target");
      if (!targetId) {
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      const offset = getFixedOffset();
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", `#${targetId}`);
      } else {
        window.location.hash = targetId;
      }
    });
  });
}

function initMotionSystem() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = Array.from(document.querySelectorAll("main section"));

  if (!sections.length) {
    return;
  }

  const revealSelector = [
    ".eyebrow",
    ".home-tag",
    ".home-overline",
    "h1",
    "h2",
    "h3",
    ".lead",
    ".hero-actions",
    ".action-row",
    ".home-hero-brief",
    ".home-positioning-band",
    ".image-frame",
    ".note-panel",
    ".principle-block",
    ".fact-block",
    ".axis-block",
    ".contact-card",
    ".home-method-item",
    ".home-field-card",
    ".home-story-media",
    ".home-tool-shot",
    ".home-dossier-row",
    ".home-publication-card",
    ".home-ods-card",
    ".home-contact-card",
    ".publication-card",
    ".publications-principle",
    ".publications-stat-card",
    ".publications-filter-panel",
    ".reading-track-card",
    ".cta-panel"
  ].join(", ");

  const revealTargets = [];
  const seen = new Set();

  sections.forEach((section) => {
    const localTargets = Array.from(section.querySelectorAll(revealSelector));
    localTargets.forEach((node, index) => {
      if (seen.has(node)) {
        return;
      }
      seen.add(node);
      node.classList.add("motion-target");
      node.style.setProperty("--motion-delay", `${Math.min(index * 70, 420)}ms`);
      revealTargets.push(node);
    });
  });

  if (reducedMotion) {
    revealTargets.forEach((node) => node.classList.add("motion-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("motion-visible");
        if (entry.target.matches(".image-frame, .home-story-media, .home-tool-shot, .publication-card, .contact-card")) {
          entry.target.classList.add("motion-zoomed");
        }
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  revealTargets.forEach((node) => revealObserver.observe(node));

  const parallaxTargets = Array.from(
    document.querySelectorAll(".home-hero-media, .home-closing-media, .image-frame img, .home-story-media img, .home-tool-shot img")
  );

  if (!parallaxTargets.length) {
    return;
  }

  let ticking = false;

  const updateParallax = () => {
    const viewportHeight = window.innerHeight || 1;
    const disableParallax = window.innerWidth < 900;

    parallaxTargets.forEach((node) => {
      if (disableParallax) {
        node.style.setProperty("--parallax-shift", "0px");
        return;
      }

      const rect = node.getBoundingClientRect();
      const centerOffset = rect.top + rect.height / 2 - viewportHeight / 2;
      const clamped = Math.max(-18, Math.min(18, centerOffset * -0.04));
      node.style.setProperty("--parallax-shift", `${clamped.toFixed(2)}px`);
    });

    ticking = false;
  };

  const requestParallax = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  updateParallax();
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax);
}

function renderFeaturedPublications(root, featuredIds, publicationById) {
  const featured = featuredIds
    .map((id) => publicationById.get(id))
    .filter(Boolean);

  renderPublicationGrid(root, featured, true);
}

function renderPublicationGrid(root, publications, featured = false) {
  if (!publications.length) {
    root.innerHTML = [
      '<article class="publication-card publication-card-empty">',
      "<h3>Sin resultados</h3>",
      "<p>No hay publicaciones que cumplan la seleccion actual.</p>",
      "</article>"
    ].join("");
    return;
  }

  root.innerHTML = publications
    .map((publication) => renderPublicationCard(publication, featured))
    .join("");
}

function renderPublicationCard(publication, featured) {
  const typeLabel = PUBLICATION_TYPE_LABELS[publication.type] || "Fuente";
  const topicPills = (publication.topics || [])
    .map((topic) => `<span>${escapeHtml(PUBLICATION_TOPIC_LABELS[topic] || topic)}</span>`)
    .join("");
  const regionPills = (publication.regions || [])
    .map((region) => `<span class="is-region">${escapeHtml(region)}</span>`)
    .join("");

  return [
    `<article class="publication-card${featured ? " is-featured" : ""}">`,
    '<div class="publication-meta">',
    `<span>${escapeHtml(typeLabel)}</span>`,
    `<span>${escapeHtml(String(publication.year))}</span>`,
    `<span>${escapeHtml(publication.source || "Fuente primaria")}</span>`,
    "</div>",
    `<h3><a href="${escapeHtml(publication.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(publication.title)}</a></h3>`,
    `<p class="publication-authors">${escapeHtml(publication.authors || "")}</p>`,
    `<p class="publication-summary">${escapeHtml(publication.summary || "")}</p>`,
    '<p class="publication-why"><strong>Por que importa.</strong> ',
    `${escapeHtml(publication.whyItMatters || "")}</p>`,
    '<div class="publication-chip-row">',
    topicPills,
    regionPills,
    "</div>",
    '<div class="publication-footer">',
    `<span class="publication-access">${escapeHtml(publication.access || "Fuente externa")}</span>`,
    `<a class="publication-link" href="${escapeHtml(publication.url)}" target="_blank" rel="noopener noreferrer">Abrir fuente</a>`,
    "</div>",
    "</article>"
  ].join("");
}

function renderReadingTracks(root, tracks, publicationById) {
  if (!tracks.length) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = tracks
    .map((track) => {
      const items = (track.publicationIds || [])
        .map((id) => publicationById.get(id))
        .filter(Boolean)
        .map(
          (publication) => [
            "<li>",
            `<a href="${escapeHtml(publication.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(publication.title)}</a>`,
            `<span>${escapeHtml(publication.source || "")}</span>`,
            "</li>"
          ].join("")
        )
        .join("");

      return [
        '<article class="reading-track-card">',
        `<span class="reading-track-label">${escapeHtml(track.label || "Ruta")}</span>`,
        `<h3>${escapeHtml(track.title || "")}</h3>`,
        `<p>${escapeHtml(track.description || "")}</p>`,
        `<ul class="reading-track-list">${items}</ul>`,
        "</article>"
      ].join("");
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
