/* Search --------------------------------------------------------------- */
(() => {
  const input = document.querySelector("#archive-search");
  if (!input) return;

  const records = [...document.querySelectorAll(".searchable")];
  const label = document.querySelector(`label[for="${input.id}"]`);
  const status = document.createElement("span");

  const isResearchPage = document.body.classList.contains("research-page");
  const collaboratorsSection = isResearchPage
    ? document.querySelector("#collaborators")
    : null;
  const researchResultSections = isResearchPage
    ? ["papers", "books", "reports"]
        .map((id) => document.getElementById(id))
        .filter(Boolean)
    : [];

  status.id = "archive-search-status";
  status.className = "search-status";
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  input.setAttribute("aria-describedby", status.id);
  input.setAttribute("aria-keyshortcuts", "/ Escape");
  input.setAttribute("spellcheck", "false");

  if (label) label.appendChild(status);

  const normalize = (value) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const entryLabel = (count) => `${count} ${count === 1 ? "entry" : "entries"}`;

  const updateResearchSections = (queryIsActive) => {
    if (!isResearchPage) return;

    // The collaborator list is useful for browsing, but not as a search result:
    // every collaborator already appears in one or more searchable records.
    if (collaboratorsSection) {
      collaboratorsSection.hidden = queryIsActive;
    }

    researchResultSections.forEach((section) => {
      if (!queryIsActive) {
        section.hidden = false;
        return;
      }

      const hasVisibleResult = [...section.querySelectorAll(".searchable")]
        .some((record) => !record.classList.contains("is-hidden"));

      section.hidden = !hasVisibleResult;
    });
  };

  const updateSearch = () => {
    const query = normalize(input.value.trim());
    const queryIsActive = query.length > 0;
    let matches = 0;

    records.forEach((record) => {
      // Search is generated directly from visible record text so there is no
      // duplicated metadata to become stale as the page is edited.
      const matchesQuery =
        !queryIsActive || normalize(record.textContent).includes(query);

      record.classList.toggle("is-hidden", !matchesQuery);
      if (queryIsActive && matchesQuery) matches += 1;
    });

    updateResearchSections(queryIsActive);

    status.textContent = queryIsActive
      ? matches
        ? `${entryLabel(matches)} found`
        : "No matching entries"
      : "";

    status.dataset.state = queryIsActive
      ? matches
        ? "matches"
        : "empty"
      : "";
  };

  input.addEventListener("input", updateSearch);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditable =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isEditable
    ) {
      event.preventDefault();
      input.focus();
      input.select();
      return;
    }

    if (event.key === "Escape" && document.activeElement === input) {
      if (input.value) {
        input.value = "";
        updateSearch();
      } else {
        input.blur();
      }
    }
  });

  updateSearch();
})();

/* Mobile navigation edge indicators ----------------------------------- */

(() => {
  const rail = document.querySelector(".site-rail");
  const nav = rail?.querySelector(".primary-nav");
  if (!rail || !nav) return;

  const mobile = window.matchMedia("(max-width: 980px)");

  const updateNavEdges = () => {
    if (!mobile.matches) {
      rail.classList.remove("nav-can-scroll-left", "nav-can-scroll-right");
      return;
    }

    const tolerance = 2;
    const canScroll = nav.scrollWidth > nav.clientWidth + tolerance;

    rail.classList.toggle(
      "nav-can-scroll-left",
      canScroll && nav.scrollLeft > tolerance,
    );
    rail.classList.toggle(
      "nav-can-scroll-right",
      canScroll &&
        nav.scrollLeft + nav.clientWidth < nav.scrollWidth - tolerance,
    );
  };

  nav.addEventListener("scroll", updateNavEdges, { passive: true });
  window.addEventListener("resize", updateNavEdges);

  if (typeof mobile.addEventListener === "function") {
    mobile.addEventListener("change", updateNavEdges);
  } else {
    mobile.addListener(updateNavEdges);
  }

  requestAnimationFrame(updateNavEdges);
})();

/* Desktop sidebar auto-hide -------------------------------------------- */

(() => {
  const page = window.location.pathname.split("/").pop();
  const isAboutPage = !page || page === "index.html";
  const desktop = window.matchMedia("(min-width: 981px)");

  if (isAboutPage || !desktop.matches) return;

  const body = document.body;
  const rail = document.querySelector(".site-rail");
  if (!rail) return;

  body.classList.add("rail-autohide-enabled");

  const revealZone = document.createElement("div");
  revealZone.className = "rail-reveal-zone";
  revealZone.setAttribute("aria-hidden", "true");
  body.appendChild(revealZone);

  let timer;

  const cancelTimer = () => {
    window.clearTimeout(timer);
  };

  const showRail = () => {
    cancelTimer();
    body.classList.remove("rail-is-hidden");
  };

  const hideRail = () => {
    const focusIsInside = rail.contains(document.activeElement);
    if (
      !rail.matches(":hover") &&
      !revealZone.matches(":hover") &&
      !focusIsInside
    ) {
      body.classList.add("rail-is-hidden");
    }
  };

  const scheduleHide = (delay = 900) => {
    cancelTimer();
    timer = window.setTimeout(hideRail, delay);
  };

  // The first disappearance occurs twenty seconds after the page loads.
  scheduleHide(20000);

  revealZone.addEventListener("mouseenter", showRail);
  rail.addEventListener("mouseenter", showRail);
  rail.addEventListener("mouseleave", () => scheduleHide());

  // Keep keyboard navigation usable even when the rail is hidden.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") showRail();
  });

  rail.addEventListener("focusin", showRail);
  rail.addEventListener("focusout", () => scheduleHide());
})();

/* Internal page transitions -------------------------------------------- */

(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const showPage = () => {
    root.classList.remove("page-is-leaving");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.add("page-is-ready"));
    });
  };

  showPage();
  window.addEventListener("pageshow", showPage);

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (reducedMotion.matches) return;

    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.protocol !== window.location.protocol) return;

    const current = new URL(window.location.href);
    const sameDocument =
      destination.pathname === current.pathname &&
      destination.search === current.search;

    // Preserve ordinary in-page anchor behavior. A link to the current page
    // itself slowly scrolls back to the top instead of reloading or fading.
    const isDifferentAnchorOnSamePage =
      sameDocument && destination.hash && destination.hash !== current.hash;

    if (isDifferentAnchorOnSamePage) return;

    if (sameDocument) {
      event.preventDefault();

      const startY = window.scrollY;
      if (startY <= 1) return;

      // Move at a constant speed from the first frame to the last.
      const pixelsPerMillisecond = 0.58;
      const duration = Math.min(
        4400,
        Math.max(1100, startY / pixelsPerMillisecond),
      );
      const startTime = performance.now();
      root.classList.add("constant-scroll");

      const scrollStep = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        window.scrollTo(0, Math.round(startY * (1 - progress)));

        if (progress < 1) {
          requestAnimationFrame(scrollStep);
        } else {
          root.classList.remove("constant-scroll");
        }
      };

      requestAnimationFrame(scrollStep);
      return;
    }

    const path = destination.pathname.toLowerCase();
    const isPageLink =
      path.endsWith(".html") ||
      path.endsWith("/") ||
      !path.split("/").pop().includes(".");

    if (!isPageLink) return;

    event.preventDefault();
    root.classList.remove("page-is-ready");
    root.classList.add("page-is-leaving");

    const transitionDelay = window.matchMedia(
      "(max-width: 980px)",
    ).matches
      ? 667
      : 1000;

    window.setTimeout(() => {
      window.location.href = destination.href;
    }, transitionDelay);
  });
})();
