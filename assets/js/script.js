'use strict';

// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); };

function bindSidebarToggle(sidebar) {
  const sidebarBtn = sidebar && sidebar.querySelector("[data-sidebar-btn]");
  if (!sidebarBtn || sidebarBtn.dataset.bound) return;
  sidebarBtn.dataset.bound = "true";
  sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });
}

// One sidebar markup (sidebar.html) for About, Resume and Research.
async function mountSharedSidebar() {
  const slot = document.querySelector("aside.sidebar[data-sidebar]");
  if (!slot) return;
  if (slot.childElementCount > 0) {
    bindSidebarToggle(slot);
    return;
  }

  const res = await fetch("/sidebar.html");
  if (!res.ok) return;
  const aside = new DOMParser()
    .parseFromString(await res.text(), "text/html")
    .querySelector("aside.sidebar");
  if (!aside) return;
  slot.replaceWith(aside);
  bindSidebarToggle(aside);
}

mountSharedSidebar();

// --------------  Dark mode toggle functionality ---------------------
const toggleSwitch = document.querySelector('input[type="checkbox"]');
const toggleIcon = document.getElementById('theme-switch-icon');

const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

function toggleDarkLightMode(mode) {
  if (!toggleSwitch || !toggleIcon) return;
  if (mode == DARK_THEME) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    toggleSwitch.checked = true;
    toggleIcon.name = "moon";
  } else if (mode === LIGHT_THEME) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    toggleSwitch.checked = false;
    toggleIcon.name = "sunny";
  }
}

function switchTheme(event) {
  if (event.target.checked) {
    toggleDarkLightMode(DARK_THEME);
  } else {
    toggleDarkLightMode(LIGHT_THEME);
  }
}

if (toggleSwitch) {
  toggleSwitch.addEventListener('change', switchTheme);

  const currentTheme = localStorage.getItem('theme');
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
      toggleDarkLightMode(DARK_THEME);
    } else {
      toggleDarkLightMode(LIGHT_THEME);
    }
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    toggleDarkLightMode(DARK_THEME);
  } else {
    toggleDarkLightMode(LIGHT_THEME);
  }
}

// ----------------------- Generate Page PDF ------------------------
const pubKeepWrappers = [];

function keepYearWithFirstPublication() {
  restorePubYearGroups();

  document.querySelectorAll("article.research .timeline-year").forEach((year) => {
    const list = year.nextElementSibling;
    if (!list || !list.classList.contains("timeline-list")) return;

    const firstItem = list.querySelector(":scope > .timeline-item");
    if (!firstItem) return;

    const keep = document.createElement("div");
    keep.className = "pub-keep-together";

    const firstList = document.createElement("ol");
    firstList.className = "timeline-list";

    year.before(keep);
    keep.append(year, firstList);
    firstList.append(firstItem);

    pubKeepWrappers.push({ keep, year, firstList, list, firstItem });
  });
}

function restorePubYearGroups() {
  while (pubKeepWrappers.length) {
    const { keep, year, list, firstItem } = pubKeepWrappers.pop();
    if (!keep.parentNode) continue;
    keep.before(year);
    if (list.firstChild) {
      list.insertBefore(firstItem, list.firstChild);
    } else {
      list.append(firstItem);
    }
    keep.remove();
  }
}

const SITE_ORIGIN = "https://pvillacorta.github.io";
const rewrittenFileLinks = [];

function absolutizeFileLinksForPrint() {
  restoreFileLinks();

  document.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href) return;

    // Relative files/... or ../files/... → absolute production URLs
    const relativeMatch = href.match(/^(?:\.\.\/)*(files\/.+)$/);
    if (!relativeMatch) return;

    rewrittenFileLinks.push({ anchor, href });
    anchor.setAttribute("href", `${SITE_ORIGIN}/${relativeMatch[1]}`);
  });
}

function restoreFileLinks() {
  while (rewrittenFileLinks.length) {
    const { anchor, href } = rewrittenFileLinks.pop();
    anchor.setAttribute("href", href);
  }
}

function fitPrintToOnePage() {
  const main = document.querySelector("main");
  if (!main || !document.body.classList.contains("cv-page")) return;

  resetPrintFit();
  keepYearWithFirstPublication();
  absolutizeFileLinksForPrint();
  // Research shares page 1 via a balanced two-column flow (no global zoom).
}

function resetPrintFit() {
  [
    document.querySelector("main"),
    document.querySelector(".sidebar"),
    document.querySelector("article.about"),
    document.querySelector("article.resume"),
    document.querySelector("article.research"),
  ].forEach((el) => {
    if (el) el.style.zoom = "";
  });
  restorePubYearGroups();
  restoreFileLinks();
}

window.addEventListener("beforeprint", fitPrintToOnePage);
window.addEventListener("afterprint", resetPrintFit);

// ----------------------- Research in-page smooth scroll ------------------------
(function initResearchSmoothScroll() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function highlightSection(target) {
    if (!target) return;
    target.classList.remove("section-highlight");
    void target.offsetWidth;
    target.classList.add("section-highlight");
    window.setTimeout(() => target.classList.remove("section-highlight"), 1200);
  }

  function scrollToHash(hash, { updateHistory = true } = {}) {
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;

    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    if (updateHistory) history.replaceState(null, "", hash);
    highlightSection(target);
  }

  document.querySelectorAll(".research-subnav-link[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || !document.querySelector(id)) return;
      event.preventDefault();
      scrollToHash(id);
    });
  });

  // Deep link e.g. /research/#talks
  if (location.hash && document.querySelector(location.hash)) {
    window.setTimeout(() => scrollToHash(location.hash, { updateHistory: false }), 50);
  }
})();
