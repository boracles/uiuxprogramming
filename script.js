const storageKey = "rehear-training-plans-v1";
const form = document.querySelector("#plan-form");
const steps = [...document.querySelectorAll(".flow-step")];
const progressItems = [...document.querySelectorAll(".progress-item")];
const titleInput = document.querySelector("#presentation-title");
const titleError = document.querySelector("#title-error");
const nicknameInput = document.querySelector("#nickname");
const nicknameCount = document.querySelector("#nickname-count");
const qnaOption = document.querySelector("#qna-option");
const qnaOptions = document.querySelector("#qna-options");
const planList = document.querySelector("#plan-list");
const emptyState = document.querySelector("#empty-state");
const planCount = document.querySelector("#plan-count");
const archiveStatus = document.querySelector("#archive-status");
const planDialog = document.querySelector("#plan-dialog");

function readPlans() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((plan) => plan && typeof plan.id === "string" && typeof plan.title === "string")
      .map((plan) => ({
        id: plan.id,
        title: plan.title.slice(0, 60),
        nickname: typeof plan.nickname === "string" ? plan.nickname.slice(0, 10) : "",
        duration: ["3", "5", "10"].includes(plan.duration) ? plan.duration : "5",
        qna: plan.qna === true,
        qnaCount: ["1", "2", "3"].includes(plan.qnaCount) ? plan.qnaCount : "2",
        cancelled: plan.cancelled === true,
        createdAt: typeof plan.createdAt === "string" ? plan.createdAt : ""
      }));
  } catch {
    return [];
  }
}

let plans = readPlans();
let currentStep = 1;

function savePlans() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

function showStep(number) {
  currentStep = number;
  steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== number; });
  progressItems.forEach((item, index) => {
    const isCurrent = index === number - 1;
    item.classList.toggle("is-current", isCurrent);
    item.classList.toggle("is-done", index < number - 1);
    if (isCurrent && number <= 3) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const heading = steps[number - 1].querySelector("h3");
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  document.querySelector("#planner").scrollIntoView({ block: "start", behavior: "smooth" });
}

function validateTitle() {
  const title = titleInput.value.trim();
  if (!title) {
    titleError.textContent = "발표 제목을 입력해 주세요. 공백만으로는 저장할 수 없습니다.";
    titleInput.setAttribute("aria-invalid", "true");
    titleInput.focus();
    return false;
  }
  titleError.textContent = "";
  titleInput.removeAttribute("aria-invalid");
  return true;
}

function getFormValues() {
  return {
    title: titleInput.value.trim(),
    nickname: nicknameInput.value.trim(),
    duration: form.querySelector('input[name="duration"]:checked').value,
    qna: qnaOption.checked,
    qnaCount: form.querySelector('input[name="qna-count"]:checked').value
  };
}

function qnaText(plan) {
  return plan.qna ? `질문 ${plan.qnaCount}개 포함` : "포함 안 함";
}

function updateSummary() {
  const values = getFormValues();
  document.querySelector("#summary-title").textContent = values.title;
  document.querySelector("#summary-nickname").textContent = values.nickname || "입력 안 함";
  document.querySelector("#summary-duration").textContent = `${values.duration}분`;
  document.querySelector("#summary-qna").textContent = qnaText(values);
}

titleInput.addEventListener("input", () => {
  if (titleInput.getAttribute("aria-invalid") === "true") validateTitle();
});

nicknameInput.addEventListener("input", () => {
  nicknameCount.textContent = `${nicknameInput.value.length} / 10자`;
});

qnaOption.addEventListener("change", () => {
  qnaOptions.hidden = !qnaOption.checked;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentStep === 1) document.querySelector("#info-next").click();
});

document.querySelector("#info-next").addEventListener("click", () => {
  if (validateTitle()) showStep(2);
});
document.querySelector("#option-prev").addEventListener("click", () => showStep(1));
document.querySelector("#option-next").addEventListener("click", () => {
  updateSummary();
  showStep(3);
});
document.querySelector("#edit-info").addEventListener("click", () => showStep(1));
document.querySelector("#edit-options").addEventListener("click", () => showStep(2));

document.querySelector("#save-plan").addEventListener("click", () => {
  if (!validateTitle()) {
    showStep(1);
    titleInput.focus();
    return;
  }
  const plan = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    ...getFormValues(),
    cancelled: false,
    createdAt: new Date().toISOString()
  };
  plans.unshift(plan);
  const persisted = savePlans();
  renderPlans();
  archiveStatus.textContent = persisted
    ? `‘${plan.title}’ 계획을 저장했습니다. 아래 목록에서 다시 열 수 있습니다.`
    : "계획을 현재 화면에 저장했습니다. 브라우저 저장 공간을 사용할 수 없어 새로고침하면 사라질 수 있습니다.";
  document.querySelector("#complete-message").textContent = `‘${plan.title}’ 계획을 내 계획에서 다시 열어볼 수 있습니다.`;
  showStep(4);
});

document.querySelector("#restart-button").addEventListener("click", () => {
  form.reset();
  qnaOptions.hidden = true;
  nicknameCount.textContent = "0 / 10자";
  titleError.textContent = "";
  titleInput.removeAttribute("aria-invalid");
  showStep(1);
  titleInput.focus();
});

function createText(tag, className, content) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  return element;
}

function renderPlans() {
  planList.replaceChildren();
  emptyState.hidden = plans.length !== 0;
  planList.hidden = plans.length === 0;
  const activeCount = plans.filter((plan) => !plan.cancelled).length;
  planCount.textContent = String(activeCount);
  planCount.setAttribute("aria-label", `진행 중인 계획 ${activeCount}개`);

  plans.forEach((plan) => {
    const card = document.createElement("li");
    card.className = `plan-card${plan.cancelled ? " is-cancelled" : ""}`;
    const top = document.createElement("div");
    top.className = "plan-card-top";
    top.append(createText("span", "plan-state", plan.cancelled ? "취소됨" : "저장됨"));
    const date = new Date(plan.createdAt);
    if (!Number.isNaN(date.getTime())) {
      top.append(createText("time", "plan-date", new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date)));
    }
    card.append(top);
    card.append(createText("h3", "plan-title", plan.title));
    card.append(createText("p", "plan-meta", `${plan.duration}분 연습 · ${qnaText(plan)}`));
    const actions = document.createElement("div");
    actions.className = "plan-actions";
    const openButton = createText("button", "button button-secondary", "내용 보기");
    openButton.type = "button";
    openButton.dataset.action = "open";
    openButton.dataset.id = plan.id;
    const toggleButton = createText("button", "button button-text", plan.cancelled ? "취소 되돌리기" : "계획 취소하기");
    toggleButton.type = "button";
    toggleButton.dataset.action = "toggle";
    toggleButton.dataset.id = plan.id;
    actions.append(openButton, toggleButton);
    card.append(actions);
    planList.append(card);
  });
}

planList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const plan = plans.find((item) => item.id === button.dataset.id);
  if (!plan) return;

  if (button.dataset.action === "open") {
    document.querySelector("#dialog-title").textContent = plan.title;
    document.querySelector("#dialog-status").textContent = plan.cancelled ? "취소된 계획입니다." : "저장된 계획입니다.";
    document.querySelector("#dialog-nickname").textContent = plan.nickname || "입력 안 함";
    document.querySelector("#dialog-duration").textContent = `${plan.duration}분`;
    document.querySelector("#dialog-qna").textContent = qnaText(plan);
    planDialog.showModal();
    return;
  }

  const wasCancelled = plan.cancelled;
  plan.cancelled = !wasCancelled;
  const persisted = savePlans();
  renderPlans();
  archiveStatus.textContent = persisted
    ? `‘${plan.title}’ 계획을 ${wasCancelled ? "다시 사용할 수 있습니다" : "취소했습니다"}.`
    : "상태를 현재 화면에서 바꿨지만, 브라우저 저장 공간을 사용할 수 없어 새로고침하면 사라질 수 있습니다.";
  const nextButton = [...planList.querySelectorAll('button[data-action="toggle"]')].find((item) => item.dataset.id === plan.id);
  nextButton?.focus();
});

document.querySelector("#dialog-close").addEventListener("click", () => planDialog.close());
document.querySelector("#dialog-done").addEventListener("click", () => planDialog.close());

const themeButton = document.querySelector("#theme-button");
themeButton.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  themeButton.textContent = dark ? "라이트 모드" : "다크 모드";
  themeButton.setAttribute("aria-pressed", String(dark));
});

renderPlans();
