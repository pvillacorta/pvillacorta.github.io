'use strict';

(async function assembleCV() {
  const status = document.getElementById("cv-status");
  const main = document.getElementById("cv-main");
  if (!main) return;

  const setStatus = (msg) => {
    if (status) status.textContent = msg;
  };

  try {
    setStatus("Loading Resume and Research…");

    const [aboutDoc, resumeDoc, researchDoc] = await Promise.all([
      fetchPage("../index.html"),
      fetchPage("../resume/"),
      fetchPage("../research/"),
    ]);

    const sidebar = aboutDoc.querySelector("aside.sidebar");
    const resume = resumeDoc.querySelector("article.resume");
    const research = researchDoc.querySelector("article.research");

    if (!sidebar || !resume || !research) {
      throw new Error("Could not find required sections to assemble the CV.");
    }

    addWebsiteLink(sidebar);

    // Rewrite asset / file paths so they resolve from /cv/
    rewritePaths(sidebar);
    rewritePaths(resume);
    rewritePaths(research);

    // Ensure sections are visible when printed / previewed on screen
    [resume, research].forEach((el) => el.classList.add("active"));

    // Drop research in-page subnav and CV-excluded blocks
    research.querySelector(".research-subnav")?.remove();
    [resume, research].forEach((root) => {
      root.querySelectorAll(".cv-exclude").forEach((el) => el.remove());
    });

    // One flow in document order so print columns can balance across sections.
    // A subsection may break at the column boundary and continue in the next.
    const sections = [...research.querySelectorAll("#journals, #conferences, #talks")];
    if (sections.length) {
      const flow = document.createElement("div");
      flow.className = "research-print-body";
      sections.forEach((section) => flow.append(section));
      research.append(flow);
    }

    const content = document.createElement("div");
    content.className = "main-content";
    content.append(resume, research);

    main.replaceChildren(sidebar, content);

    setStatus("CV ready. Opening print dialog…");

    const shouldPrint = new URLSearchParams(window.location.search).has("print");
    if (shouldPrint) {
      // Wait a tick for layout/fonts/icons
      requestAnimationFrame(() => {
        setTimeout(() => window.print(), 250);
      });
    } else if (status) {
      status.innerHTML = 'CV ready. <button type="button" onclick="window.print()">Print / Save as PDF</button>';
    }
  } catch (err) {
    console.error(err);
    setStatus(
      "Could not assemble the CV. Serve the site over HTTP (e.g. python -m http.server) and try again. " +
        (err && err.message ? err.message : "")
    );
  }
})();

function addWebsiteLink(sidebar) {
  const contacts = sidebar.querySelector(".contacts-list");
  if (!contacts) return;

  const item = document.createElement("li");
  item.className = "contact-item";
  item.innerHTML = `
    <div class="icon-box">
      <ion-icon name="globe-outline"></ion-icon>
    </div>
    <div class="contact-info">
      <p class="contact-title">Website</p>
      <a class="contact-link" href="https://pvillacorta.github.io" target="_blank" rel="noopener">pvillacorta.github.io</a>
    </div>
  `;
  contacts.append(item);
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  const text = await res.text();
  return new DOMParser().parseFromString(text, "text/html");
}

/**
 * Paths in section pages are relative to /, /resume/, or /research/.
 * From /cv/ we need ../ for site-root assets and files.
 */
function rewritePaths(...roots) {
  roots.forEach((root) => {
    root.querySelectorAll("[src], [href]").forEach((el) => {
      for (const attr of ["src", "href"]) {
        const val = el.getAttribute(attr);
        if (!val || val.startsWith("http") || val.startsWith("mailto:") || val.startsWith("#") || val.startsWith("data:") || val.startsWith("/")) {
          continue;
        }
        // Already rooted at parent (../files, ../assets) from resume/research — keep
        if (val.startsWith("../")) continue;
        // From home page: ./assets/... or assets/... or files/...
        if (val.startsWith("./")) {
          el.setAttribute(attr, `../${val.slice(2)}`);
        } else if (val.startsWith("assets/") || val.startsWith("files/")) {
          el.setAttribute(attr, `../${val}`);
        }
      }
    });
  });
}
