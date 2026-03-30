async function loadCatalog() {
  const response = await fetch("/data/workflows.json");
  return response.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderHome(catalog) {
  const grid = document.querySelector("#workflow-grid");
  if (!grid) return;

  for (const workflow of catalog.workflows) {
    const card = el("article", "card workflow-card");
    card.append(
      el("p", "eyebrow", workflow.domain),
      el("h3", "", workflow.title),
      el("p", "lede", workflow.summary),
    );

    const meta = el("div", "workflow-meta");
    meta.append(
      el("span", "pill", workflow.status),
      ...workflow.tags.slice(0, 4).map((tag) => el("span", "pill", tag)),
    );
    card.append(meta);
    grid.append(card);
  }
}

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
      button.textContent = descriptor.title;
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

function renderReviewPage() {
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

const catalog = await loadCatalog();
const page = document.body.dataset.page;

if (page === "home") renderHome(catalog);
if (page === "planner") renderPlanner(catalog);
if (page === "review") renderReviewPage(catalog);
