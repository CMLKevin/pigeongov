/* ──────────────────────────────────────────────
   PigeonGov — Frontend Application (Charm Edition)
   ────────────────────────────────────────────── */

const DOMAIN_META = {
  tax: { icon: "T", label: "Tax", color: "pill-tax" },
  immigration: { icon: "I", label: "Immigration", color: "pill-immigration" },
  healthcare: { icon: "H", label: "Healthcare", color: "pill-healthcare" },
  benefits: { icon: "$", label: "Benefits", color: "pill-benefits" },
  education: { icon: "E", label: "Education", color: "pill-education" },
  veterans: { icon: "V", label: "Veterans", color: "pill-veterans" },
  identity: { icon: "ID", label: "Identity", color: "pill-identity" },
  legal: { icon: "L", label: "Legal", color: "pill-legal" },
  estate: { icon: "W", label: "Estate", color: "pill-estate" },
  retirement: { icon: "R", label: "Retirement", color: "pill-retirement" },
  unemployment: { icon: "U", label: "Unemployment", color: "pill-unemployment" },
  business: { icon: "B", label: "Business", color: "pill-business" },
  permits: { icon: "P", label: "Permits", color: "pill-permits" },
};

const LIFE_EVENTS = [
  { id: "new-baby", icon: "Baby", label: "New baby", description: "Born or adopted -- update insurance, taxes, and benefits.", workflowCount: 5 },
  { id: "marriage", icon: "Ring", label: "Marriage", description: "Filing status, name changes, insurance, and immigration.", workflowCount: 5 },
  { id: "divorce", icon: "Split", label: "Divorce", description: "Filing changes, custody, insurance, estate updates.", workflowCount: 6 },
  { id: "job-loss", icon: "Alert", label: "Job loss", description: "Unemployment, insurance, benefits screening.", workflowCount: 6 },
  { id: "retirement", icon: "Clock", label: "Retirement", description: "Social Security, Medicare, estate planning.", workflowCount: 6 },
  { id: "moving-states", icon: "Map", label: "Moving states", description: "Voter registration, ID, state taxes, benefits transfer.", workflowCount: 5 },
  { id: "death-of-spouse", icon: "Heart", label: "Death of spouse", description: "Survivor benefits, probate, tax, insurance.", workflowCount: 21 },
  { id: "buying-home", icon: "Home", label: "Buying a home", description: "Tax deductions, permits, estate planning.", workflowCount: 4 },
  { id: "starting-business", icon: "Biz", label: "Starting a business", description: "Licenses, permits, Schedule C, insurance.", workflowCount: 4 },
  { id: "becoming-disabled", icon: "Aid", label: "Becoming disabled", description: "SSDI, Medicaid, VA claims, estate directives.", workflowCount: 7 },
  { id: "aging-into-medicare", icon: "65", label: "Turning 65", description: "Medicare enrollment, Social Security, directives.", workflowCount: 3 },
  { id: "immigration-status-change", icon: "Flag", label: "Immigration status change", description: "Naturalization, work auth, voter reg, passport.", workflowCount: 7 },
  { id: "lost-health-insurance", icon: "Med", label: "Lost health insurance", description: "ACA special enrollment, Medicaid, CHIP, COBRA options.", workflowCount: 5 },
  { id: "had-income-change", icon: "$$", label: "Income change", description: "Benefits recertification, IDR recalc, APTC adjustment.", workflowCount: 6 },
  { id: "arrested-or-convicted", icon: "Gavel", label: "Arrested or convicted", description: "Expungement, collateral consequences, benefit impacts.", workflowCount: 5 },
  { id: "natural-disaster", icon: "Storm", label: "Natural disaster", description: "D-SNAP, LIHEAP emergency, casualty loss, FEMA aid.", workflowCount: 5 },
  { id: "turning-18", icon: "18", label: "Turning 18", description: "Voter registration, FAFSA, REAL ID, selective service.", workflowCount: 6 },
  { id: "turning-26", icon: "26", label: "Turning 26", description: "Aging off parent's insurance, ACA enrollment.", workflowCount: 3 },
  { id: "child-turning-18", icon: "Grad", label: "Child turning 18", description: "SSI/SSDI transition, child support, tax changes.", workflowCount: 5 },
  { id: "received-inheritance", icon: "Gift", label: "Received inheritance", description: "Medicaid/SSI asset reporting, estate tax, probate.", workflowCount: 5 },
];

// All 36 workflows
const ALL_WORKFLOWS = [
  { id: "tax/1040", domain: "tax", title: "Federal individual return", summary: "Form 1040 with OBBB Act deductions, capital gains (Schedule D/8949), NIIT, and 10-state tax integration for the 2025 filing season.", status: "active", audience: "household" },
  { id: "immigration/family-visa-intake", domain: "immigration", title: "Family visa packet intake", summary: "Build a household-centered family visa or adjustment packet checklist before attorney or human review.", status: "active", audience: "household" },
  { id: "immigration/naturalization", domain: "immigration", title: "Naturalization eligibility review", summary: "N-400 eligibility assessment with residence, physical presence, and civics readiness checks.", status: "active", audience: "individual" },
  { id: "immigration/green-card-renewal", domain: "immigration", title: "Green card renewal", summary: "I-90 filing organizer for green card renewal or replacement.", status: "active", audience: "individual" },
  { id: "immigration/daca-renewal", domain: "immigration", title: "DACA renewal", summary: "DACA renewal eligibility check with timeline and documentation readiness.", status: "active", audience: "individual" },
  { id: "immigration/work-authorization", domain: "immigration", title: "Work authorization (EAD)", summary: "I-765 work authorization application organizer with category and timeline tracking.", status: "active", audience: "individual" },
  { id: "healthcare/aca-enrollment", domain: "healthcare", title: "Healthcare enrollment planner", summary: "Organize household, income, and coverage evidence for marketplace enrollment review.", status: "active", audience: "household" },
  { id: "healthcare/medicare-enrollment", domain: "healthcare", title: "Medicare enrollment planner", summary: "Medicare eligibility assessment with IRMAA calculation and late enrollment penalty estimation.", status: "active", audience: "individual" },
  { id: "education/fafsa", domain: "education", title: "FAFSA readiness planner", summary: "FAFSA readiness assessment with dependency status, income documentation, and school selection.", status: "active", audience: "individual" },
  { id: "education/student-loan-repayment", domain: "education", title: "Student loan repayment planner", summary: "IDR comparison with SAVE transition advisor, PSLF tracking, and RAP/IBR/ICR plan comparison.", status: "active", audience: "individual" },
  { id: "education/529-planner", domain: "education", title: "529 savings planner", summary: "Project 529 plan growth and explore state tax deduction benefits.", status: "active", audience: "household" },
  { id: "unemployment/claim-intake", domain: "unemployment", title: "Unemployment claim intake", summary: "Organize claimant identity, separation facts, and wage evidence for state unemployment review.", status: "active", audience: "individual" },
  { id: "benefits/snap", domain: "benefits", title: "SNAP benefits eligibility", summary: "SNAP (food stamps) eligibility assessment using FPL-based income tests and benefit estimation.", status: "active", audience: "household" },
  { id: "benefits/section8", domain: "benefits", title: "Section 8 Housing Choice Voucher", summary: "Section 8 housing voucher eligibility assessment based on income and area median income limits.", status: "active", audience: "household" },
  { id: "benefits/wic", domain: "benefits", title: "WIC program eligibility", summary: "WIC eligibility assessment for women, infants, and children based on income.", status: "active", audience: "household" },
  { id: "benefits/liheap", domain: "benefits", title: "LIHEAP energy assistance", summary: "LIHEAP eligibility assessment for home energy assistance based on income and utility needs.", status: "active", audience: "household" },
  { id: "benefits/medicaid", domain: "benefits", title: "Medicaid eligibility assessment", summary: "MAGI-based Medicaid eligibility review with FPL threshold analysis.", status: "active", audience: "household" },
  { id: "benefits/ssdi-application", domain: "benefits", title: "SSDI application intake", summary: "SSDI application intake with SGA check and five-step evaluation summary.", status: "active", audience: "individual" },
  { id: "veterans/disability-claim", domain: "veterans", title: "VA disability compensation claim", summary: "VA disability claim intake with combined rating estimation using VA math and evidence checklist.", status: "active", audience: "individual" },
  { id: "veterans/gi-bill", domain: "veterans", title: "Post-9/11 GI Bill benefits", summary: "GI Bill entitlement estimation including housing allowance and remaining benefits months.", status: "active", audience: "individual" },
  { id: "veterans/va-healthcare", domain: "veterans", title: "VA healthcare enrollment", summary: "VA healthcare priority group determination and copay estimation based on service and income.", status: "active", audience: "individual" },
  { id: "identity/passport", domain: "identity", title: "Passport application planner", summary: "Passport application readiness assessment with document checklist and fee estimation.", status: "active", audience: "individual" },
  { id: "identity/name-change", domain: "identity", title: "Name change planner", summary: "Name change planning with court petition steps and cascading document update checklist.", status: "active", audience: "individual" },
  { id: "identity/voter-registration", domain: "identity", title: "Voter registration guide", summary: "Voter registration readiness assessment with state-specific deadline tracking.", status: "active", audience: "individual" },
  { id: "identity/real-id", domain: "identity", title: "REAL ID readiness checker", summary: "REAL ID document readiness assessment with required documentation checklist.", status: "active", audience: "individual" },
  { id: "legal/small-claims", domain: "legal", title: "Small claims court filing", summary: "Small claims case preparation with filing fee estimate, evidence checklist, and statute of limitations check.", status: "active", audience: "individual" },
  { id: "legal/expungement", domain: "legal", title: "Criminal record expungement", summary: "Expungement eligibility assessment with waiting period estimation and documentation requirements.", status: "active", audience: "individual" },
  { id: "legal/child-support-modification", domain: "legal", title: "Child support modification", summary: "Child support modification assessment with income change analysis and threshold evaluation.", status: "active", audience: "individual" },
  { id: "estate/basic-will", domain: "estate", title: "Basic will planner", summary: "Will planning intake with asset inventory, beneficiaries, executor selection, and state requirements.", status: "active", audience: "individual" },
  { id: "estate/power-of-attorney", domain: "estate", title: "Power of attorney planner", summary: "POA planning with agent selection, power scope, and state-specific requirements.", status: "active", audience: "individual" },
  { id: "estate/advance-directive", domain: "estate", title: "Advance directive planner", summary: "Advance directive planning for healthcare preferences, agent selection, and distribution wishes.", status: "active", audience: "individual" },
  { id: "retirement/ssa-estimator", domain: "retirement", title: "Social Security benefit estimator", summary: "Estimate Social Security retirement benefits at ages 62, 67, and 70 using AIME/PIA calculation.", status: "active", audience: "individual" },
  { id: "business/license-starter", domain: "business", title: "Business license planner", summary: "Map local license, zoning, and entity-registration follow-up tasks for a new business.", status: "preview", audience: "business" },
  { id: "permits/local-permit-planner", domain: "permits", title: "Local permit planner", summary: "Local permit scoping and evidence collection for construction, renovation, and zoning.", status: "preview", audience: "individual" },
  { id: "benefits/ssi", domain: "benefits", title: "SSI eligibility assessment", summary: "Supplemental Security Income eligibility for aged 65+, blind, or disabled with income exclusion math and state supplements.", status: "active", audience: "individual" },
  { id: "benefits/tanf", domain: "benefits", title: "TANF cash assistance", summary: "Temporary Assistance for Needy Families with state-specific benefits, time limits, and categorical eligibility chains.", status: "active", audience: "household" },
];

async function loadCatalog() {
  try {
    const response = await fetch("/data/workflows.json");
    return response.json();
  } catch {
    return { workflows: ALL_WORKFLOWS, descriptors: [] };
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// ── Hamburger menu ──

function initHamburger() {
  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector("#main-nav");
  if (!hamburger || !nav) return;

  hamburger.addEventListener("click", () => {
    const expanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !nav.contains(e.target)) {
      hamburger.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    }
  });
}

// ── Home Page ──

function groupByDomain(workflows) {
  const groups = {};
  for (const wf of workflows) {
    if (!groups[wf.domain]) groups[wf.domain] = [];
    groups[wf.domain].push(wf);
  }
  return groups;
}

function renderHome(catalog) {
  initHamburger();
  renderCatalog(catalog);
}

function renderCatalog(catalog) {
  const container = document.querySelector("#workflow-catalog");
  const filtersContainer = document.querySelector("#catalog-filters");
  const searchInput = document.querySelector("#catalog-search");
  if (!container) return;

  const workflows = ALL_WORKFLOWS;
  const grouped = groupByDomain(workflows);

  const domainOrder = [
    "tax", "immigration", "healthcare", "benefits", "education", "veterans",
    "identity", "legal", "estate", "retirement", "unemployment", "business", "permits",
  ];

  let activeDomain = null;

  // Build domain pills
  if (filtersContainer) {
    for (const domain of domainOrder) {
      if (!grouped[domain]) continue;
      const meta = DOMAIN_META[domain];
      const pill = el("button", `domain-pill ${meta.color}`, "");
      pill.innerHTML = `${meta.label} <span class="pill-count">${grouped[domain].length}</span>`;
      pill.dataset.domain = domain;
      pill.addEventListener("click", () => {
        if (activeDomain === domain) {
          activeDomain = null;
        } else {
          activeDomain = domain;
        }
        updatePillState();
        updateCatalog();
      });
      filtersContainer.append(pill);
    }
  }

  function updatePillState() {
    if (!filtersContainer) return;
    for (const pill of filtersContainer.querySelectorAll(".domain-pill")) {
      pill.classList.toggle("active", pill.dataset.domain === activeDomain);
    }
  }

  function updateCatalog() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    container.innerHTML = "";

    // If a domain is active, show that domain. Otherwise show all matching.
    const domainsToShow = activeDomain ? [activeDomain] : domainOrder;

    let hasResults = false;

    for (const domain of domainsToShow) {
      const domainWorkflows = (grouped[domain] || []).filter((wf) => {
        if (!query) return true;
        return (
          wf.title.toLowerCase().includes(query) ||
          wf.summary.toLowerCase().includes(query) ||
          wf.id.toLowerCase().includes(query)
        );
      });
      if (domainWorkflows.length === 0) continue;
      hasResults = true;

      const meta = DOMAIN_META[domain];
      const heading = el("h3", "", `${meta.label} (${domainWorkflows.length})`);
      container.append(heading);

      const list = el("div", "expand-workflow-list");
      for (const wf of domainWorkflows) {
        const item = el("div", "expand-workflow-item");
        item.innerHTML = `<span class="wf-cursor">&gt;</span> <span class="wf-id">${wf.id}</span> <span class="wf-desc">${wf.title}</span>`;
        list.append(item);
      }
      container.append(list);
    }

    if (!hasResults) {
      const empty = el("p", "", "No workflows match your search.");
      empty.style.color = "rgba(255, 255, 255, 0.5)";
      empty.style.fontStyle = "italic";
      container.append(empty);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      // If searching, clear active domain to search everything
      if (searchInput.value.trim()) {
        activeDomain = null;
        updatePillState();
      }
      updateCatalog();
    });
  }

  // Show first domain by default
  activeDomain = "tax";
  updatePillState();
  updateCatalog();
}

// ── Planner Page ──

function getValueAtPath(target, path) {
  return path.split(".").reduce((value, part) => (value && typeof value === "object" ? value[part] : undefined), target);
}

function setValueAtPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function buildInput(field, value) {
  if (field.type === "select") {
    const input = document.createElement("select");
    for (const option of field.options ?? []) {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      if (option.value === String(value ?? "")) optionNode.selected = true;
      input.append(optionNode);
    }
    return input;
  }

  if (field.type === "confirm") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    return input;
  }

  const input = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (input instanceof HTMLInputElement) {
    input.type = field.type === "date" ? "date" : "text";
  }
  input.value = value === undefined ? "" : String(value);
  if (field.placeholder && "placeholder" in input) input.placeholder = field.placeholder;
  return input;
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPlanner(catalog) {
  initHamburger();
  const workflowList = document.querySelector("#planner-workflow-list");
  const form = document.querySelector("#planner-form");
  const preview = document.querySelector("#planner-preview");
  const title = document.querySelector("#planner-title");
  const summary = document.querySelector("#planner-summary");
  const downloadButton = document.querySelector("#planner-download");
  const sampleButton = document.querySelector("#planner-sample");

  if (!workflowList || !form || !preview || !title || !summary || !downloadButton || !sampleButton) {
    return;
  }

  let selected = catalog.descriptors.find((item) => item.status === "active") ?? catalog.descriptors[0];
  let draft = structuredClone(selected.starterData);

  const updatePreview = () => {
    preview.textContent = JSON.stringify({ workflowId: selected.id, data: draft }, null, 2);
  };

  const renderSelectedWorkflow = () => {
    title.textContent = selected.title;
    summary.textContent = selected.summary;
    form.innerHTML = "";

    for (const section of selected.sections) {
      const sectionNode = el("section", "planner-section");
      sectionNode.append(el("p", "eyebrow", section.title));
      if (section.description) sectionNode.append(el("p", "lede", section.description));

      const fields = el("div", "planner-fields");
      for (const field of section.fields) {
        const label = document.createElement("label");
        label.append(el("span", "", field.label));

        const input = buildInput(field, getValueAtPath(draft, field.key));
        const commit = () => {
          const nextValue =
            input instanceof HTMLInputElement && input.type === "checkbox"
              ? input.checked
              : field.type === "currency" || field.type === "number"
                ? Number(input.value || 0)
                : input.value;
          setValueAtPath(draft, field.key, nextValue);
          updatePreview();
        };

        input.addEventListener("input", commit);
        input.addEventListener("change", commit);
        label.append(input);
        fields.append(label);
      }

      sectionNode.append(fields);
      form.append(sectionNode);
    }

    updatePreview();
  };

  const renderWorkflowList = () => {
    workflowList.innerHTML = "";
    for (const descriptor of catalog.descriptors) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = descriptor.id === selected.id ? "is-active" : "";

      const titleSpan = el("span", "", descriptor.title);
      button.append(titleSpan);

      const domain = descriptor.domain;
      if (domain) {
        const badge = el("span", `domain-badge domain-${domain}`, domain);
        button.append(badge);
      }

      button.addEventListener("click", () => {
        selected = descriptor;
        draft = structuredClone(descriptor.starterData);
        renderWorkflowList();
        renderSelectedWorkflow();
      });
      workflowList.append(button);
    }
  };

  downloadButton.addEventListener("click", () => {
    downloadJson(`${selected.id.replace(/[^\w]+/g, "-")}-starter.json`, {
      workflowId: selected.id,
      data: draft,
    });
  });

  sampleButton.addEventListener("click", async () => {
    const samplePath = `/data/examples/${selected.id.replace(/[^\w]+/g, "-")}-bundle.json`;
    const response = await fetch(samplePath);
    if (!response.ok) return;
    const bundle = await response.json();
    preview.textContent = JSON.stringify(bundle, null, 2);
  });

  renderWorkflowList();
  renderSelectedWorkflow();
}

// ── Review Page ──

function renderReviewPage() {
  initHamburger();
  const upload = document.querySelector("#review-upload");
  const headline = document.querySelector("#review-headline");
  const flagsContainer = document.querySelector("#review-flags");
  const json = document.querySelector("#review-json");
  if (!upload || !headline || !flagsContainer || !json) return;

  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const bundle = JSON.parse(await file.text());
    headline.textContent = bundle.review?.headline ?? "No review headline found.";
    flagsContainer.innerHTML = "";
    for (const flag of bundle.validation?.flaggedFields ?? []) {
      const item = el("div", `flag ${flag.severity}`);
      item.innerHTML = `<strong>${flag.field}</strong><br>${flag.message}`;
      flagsContainer.append(item);
    }
    json.textContent = JSON.stringify(bundle, null, 2);
  });
}

// ── Docs Page ──

function renderDocsPage() {
  initHamburger();
  const tocLinks = document.querySelectorAll(".docs-sidebar .toc-list a");
  if (tocLinks.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
          });
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );

  document.querySelectorAll(".docs-content section[id]").forEach((section) => {
    observer.observe(section);
  });
}

// ── Boot ──

const catalog = await loadCatalog();
const page = document.body.dataset.page;

if (page === "home") renderHome(catalog);
if (page === "planner") renderPlanner(catalog);
if (page === "review") renderReviewPage(catalog);
if (page === "docs") renderDocsPage();

// ── Service Worker Registration ──

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
