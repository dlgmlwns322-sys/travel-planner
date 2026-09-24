import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.55.0/+esm";

const DEFAULT_CENTER = { lat: 34.6654, lng: 135.5013 };
const STORAGE_KEY_PREFIX = "namba-walk-planner-v2";
const DEFAULT_PARTICIPANTS = [];
let activeTripId = new URLSearchParams(location.search).get("trip");

function storageKey() {
  return `${STORAGE_KEY_PREFIX}:${activeTripId || "draft"}`;
}

const state = loadState();
attachActiveDayAccessors(state);
migrateLegacyCustomItems();
let mapsReady = false;
let map2d;
let map2dOverlays = [];
let mapDrawVersion = 0;
let legCalculationVersion = 0;
let selectedCandidate = null;
let movingStop = null;
let activeMainTab = "LIST";
let activeCategory = "전체";
let activeRouteCategory = "전체";
let alternativeTargetStopIndex = null;
let replacementTargetStopIndex = null;
let replacementInFlight = false;
let candidateViewMode = "DEFAULT";
let wishlistViewMode = "DEFAULT";
let wishlistPage = 1;
let lastSearchQuery = "";
let editingExpenseId = null;
let activeRankingPerson = null;
let activeExpenseDayFilter = null;
let activeExpenseCategoryFilter = null;
let ledgerPerPersonMode = false;
let customScheduleFormOpen = false;
let searchTimer;
let cloudSaveTimer;
let realtimeRefreshTimer;
let realtimeChannel;
let realtimeVersionTimer;
let syncToastTimer;
let cloudSavePending = false;
let cloudSaveInFlight = false;
let lastLocalCloudUpdate = "";
let lastKnownCloudUpdate = "";
let lastKnownContentSignature = "";
let cloudReady = false;
let supabase = null;
const clientInstanceId = crypto.randomUUID();

const els = {
  setupNotice: document.querySelector("#setupNotice"),
  search: document.querySelector("#placeSearch"),
  searchResults: document.querySelector("#searchResults"),
  itinerary: document.querySelector("#itinerary"),
  totalSummary: document.querySelector("#totalSummary"),
  openGoogleRouteButton: document.querySelector("#openGoogleRouteButton"),
  startTime: document.querySelector("#startTime"),
  map: document.querySelector("#map"),
  mapPlaceholder: document.querySelector("#mapPlaceholder"),
  mapStatus: document.querySelector("#mapStatus"),
  cloudStatus: document.querySelector("#cloudStatus"),
  cloudHint: document.querySelector("#cloudHint"),
  cloudButton: document.querySelector("#cloudButton"),
  tripSwitchButton: document.querySelector("#tripSwitchButton"),
  tripDialog: document.querySelector("#tripDialog"),
  tripList: document.querySelector("#tripList"),
  newTripForm: document.querySelector("#newTripForm"),
  newTripName: document.querySelector("#newTripName"),
  newTripPin: document.querySelector("#newTripPin"),
  joinTripForm: document.querySelector("#joinTripForm"),
  joinTripLink: document.querySelector("#joinTripLink"),
  dialog: document.querySelector("#placeDialog"),
  moveStopDialog: document.querySelector("#moveStopDialog"),
  moveStopName: document.querySelector("#moveStopName"),
  moveStopForm: document.querySelector("#moveStopForm"),
  moveStopDay: document.querySelector("#moveStopDay"),
  moveStopOrder: document.querySelector("#moveStopOrder"),
  hotelDialog: document.querySelector("#hotelDialog"),
  hotelForm: document.querySelector("#hotelForm"),
  hotelSelect: document.querySelector("#hotelSelect"),
  dialogName: document.querySelector("#dialogName"),
  dialogAddress: document.querySelector("#dialogAddress"),
  googleSearchLink: document.querySelector("#googleSearchLink"),
  wishlist: document.querySelector("#wishlist"),
  wishlistCount: document.querySelector("#wishlistCount"),
  wishlistPagination: document.querySelector("#wishlistPagination"),
  categoryFilters: document.querySelector("#categoryFilters"),
  wishlistViewFilters: document.querySelector("#wishlistViewFilters"),
  listTabButton: document.querySelector("#listTabButton"),
  routeTabButton: document.querySelector("#routeTabButton"),
  listPanel: document.querySelector("#listPanel"),
  routePanel: document.querySelector("#routePanel"),
  routeCandidates: document.querySelector("#routeCandidates"),
  routeCandidateFilters: document.querySelector("#routeCandidateFilters"),
  candidateViewFilters: document.querySelector("#candidateViewFilters"),
  favoriteCandidateButton: document.querySelector("#favoriteCandidateButton"),
  candidateDialog: document.querySelector("#candidateDialog"),
  candidateDialogTitle: document.querySelector("#candidateDialogTitle"),
  candidateDialogHint: document.querySelector("#candidateDialogHint"),
  stopEditTabs: document.querySelector("#stopEditTabs"),
  moveStopEditTabs: document.querySelector("#moveStopEditTabs"),
  favoriteCount: document.querySelector("#favoriteCount"),
  ledgerTabButton: document.querySelector("#ledgerTabButton"),
  ledgerPanel: document.querySelector("#ledgerPanel"),
  ledgerAnchor: document.querySelector("#ledgerAnchor"),
  rankingAnchor: document.querySelector("#rankingAnchor"),
  plannerPanel: document.querySelector(".planner-panel"),
  customScheduleSection: document.querySelector("#customScheduleSection"),
  ledgerTotal: document.querySelector("#ledgerTotal"),
  ledgerTotalLabel: document.querySelector("#ledgerTotalLabel"),
  ledgerBudgetStatus: document.querySelector("#ledgerBudgetStatus"),
  ledgerAmountToggle: document.querySelector("#ledgerAmountToggle"),
  exchangeRateText: document.querySelector("#exchangeRateText"),
  expenseAddButton: document.querySelector("#expenseAddButton"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseDay: document.querySelector("#expenseDay"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseOwner: document.querySelector("#expenseOwner"),
  expenseTitle: document.querySelector("#expenseTitle"),
  expensePlace: document.querySelector("#expensePlace"),
  expenseCurrency: document.querySelector("#expenseCurrency"),
  expenseCurrencyUnit: document.querySelector("#expenseCurrencyUnit"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expensePerPerson: document.querySelector("#expensePerPerson"),
  expensePerPersonLabel: document.querySelector("#expensePerPersonLabel"),
  expenseNote: document.querySelector("#expenseNote"),
  expenseCancelButton: document.querySelector("#expenseCancelButton"),
  dailyExpenseSummary: document.querySelector("#dailyExpenseSummary"),
  categoryExpenseSummary: document.querySelector("#categoryExpenseSummary"),
  expenseList: document.querySelector("#expenseList"),
  totalBudgetInput: document.querySelector("#totalBudgetInput"),
  dayBudgetInputs: document.querySelector("#dayBudgetInputs"),
  categoryBudgetInputs: document.querySelector("#categoryBudgetInputs"),
  unallocatedBudget: document.querySelector("#unallocatedBudget"),
  mapVisibilityControls: document.querySelector("#mapVisibilityControls"),
  mapPanel: document.querySelector(".map-panel"),
  appShell: document.querySelector(".app-shell"),
  rankingPanel: document.querySelector("#rankingPanel"),
  rankingList: document.querySelector("#rankingList"),
  rankingDetails: document.querySelector("#rankingDetails"),
  participantAddButton: document.querySelector("#participantAddButton"),
  syncToast: document.querySelector("#syncToast"),
  dayTabs: document.querySelector("#dayTabs"),
  addDayButton: document.querySelector("#addDayButton"),
  previousDay: document.querySelector("#previousDay"),
  nextDay: document.querySelector("#nextDay"),
  transportButtons: [...document.querySelectorAll(".transport-button")],
};

els.startTime.value = state.startTime;
bindEvents();
updateDayUi();
updateTransportUi();
render();
bootGoogleMaps();
bootSupabase();
refreshExchangeRate();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    if (saved?.days) {
      const days = normalizeDays(saved.days);
      return { activeDay: Math.min(days.length - 1, Math.max(0, saved.activeDay || 0)), days, wishlist: normalizeWishlist(saved.wishlist), expenses: Array.isArray(saved.expenses) ? saved.expenses : [], participants: normalizeParticipants(saved.participants), selectedHotel: normalizeSelectedHotel(saved.selectedHotel), customItems: normalizeCustomItems(saved.customItems, days.length), exchangeRate: saved.exchangeRate || null, budgets: normalizeBudgets(saved.budgets, days.length), mapHiddenKeys: Array.isArray(saved.mapHiddenKeys) ? saved.mapHiddenKeys : [], mapVisibilityInitialized: Boolean(saved.mapVisibilityInitialized), mapVisibilityKeyVersion: Number(saved.mapVisibilityKeyVersion) || 0, travelMode: "AUTO", transportPolicyVersion: 3 };
    }
    if (saved) return { activeDay: 0, days: normalizeDays([{ startTime: saved.startTime, stops: saved.stops, legs: saved.legs }]), wishlist: [], expenses: [], participants: normalizeParticipants(), customItems: normalizeCustomItems([]), exchangeRate: null, budgets: normalizeBudgets(), mapHiddenKeys: [], mapVisibilityInitialized: false, travelMode: "AUTO", transportPolicyVersion: 2 };
  } catch {
    // Fall through to a fresh one-day itinerary.
  }
  return { activeDay: 0, days: normalizeDays([]), wishlist: [], expenses: [], participants: normalizeParticipants(), selectedHotel: null, customItems: normalizeCustomItems([]), exchangeRate: null, budgets: normalizeBudgets(), mapHiddenKeys: [], mapVisibilityInitialized: false, travelMode: "AUTO", transportPolicyVersion: 2 };
}

function normalizeSelectedHotel(value) {
  if (!value?.name || !value?.location) return null;
  return { placeId: value.placeId || null, name: value.name, address: value.address || "", location: value.location, googleMapsURI: value.googleMapsURI || "", category: "숙소" };
}

function normalizeParticipants(value) {
  if (!Array.isArray(value)) return [...DEFAULT_PARTICIPANTS];
  return [...new Set(value.map((name) => String(name || "").trim()).filter((name) => name && name !== "공통"))];
}

function normalizeBudgets(value = {}, dayCount = 1) {
  const total = Math.max(0, Number(value.total) || 0);
  const days = Array.from({ length: dayCount + 1 }, (_, index) => Math.max(0, Number(value.days?.[index]) || 0));
  const manualDays = Array.from({ length: dayCount + 1 }, (_, index) => Array.isArray(value.manualDays) ? Boolean(value.manualDays[index]) : days[index] > 0);
  const fixedTotal = days.reduce((sum, amount, index) => sum + (manualDays[index] ? amount : 0), 0);
  const autoIndexes = manualDays.map((manual, index) => manual ? -1 : index).filter((index) => index >= 0);
  let remainder = Math.max(0, total - fixedTotal);
  const base = autoIndexes.length ? Math.floor(remainder / autoIndexes.length) : 0;
  const extra = remainder - base * autoIndexes.length;
  autoIndexes.forEach((index, position) => {
    days[index] = base + (position < extra ? 1 : 0);
  });
  const savedCategories = value.categories && typeof value.categories === "object" ? value.categories : {};
  const categoryOrder = Array.isArray(value.categoryOrder)
    ? [...new Set(value.categoryOrder.map((category) => String(category || "").trim()).filter(Boolean))]
    : Object.keys(savedCategories);
  return {
    total,
    days,
    manualDays,
    categories: Object.fromEntries(categoryOrder.map((category) => [category, Math.max(0, Number(savedCategories[category]) || 0)])),
    categoryOrder,
  };
}

function normalizeCustomItems(items, dayCount = 1) {
  return Array.from({ length: dayCount }, (_, index) => Array.isArray(items?.[index]) ? items[index] : []);
}

function migrateLegacyCustomItems() {
  const fallback = state.days.flatMap((day) => day.stops).find((stop) => stop.isHotel && stop.location);
  state.customItems.forEach((items, dayIndex) => {
    items.forEach((item) => {
      const anchor = [...state.days[dayIndex].stops].reverse().find((stop) => stop.location && !stop.isCustom) || fallback;
      state.days[dayIndex].stops.push({
        isCustom: true, name: item.title || "커스텀 일정", note: item.note || "",
        customStart: item.time || "12:00", customEnd: item.time || "12:00",
        endPlaceName: anchor?.name || "종료 위치 설정 필요",
        location: anchor?.location ? { ...anchor.location } : { ...DEFAULT_CENTER },
        placeId: anchor?.placeId || null, googleMapsURI: anchor?.googleMapsURI || "",
        stayMinutes: 0, isHotel: false, isFixed: false, needsEndPlace: !anchor,
      });
    });
  });
  state.customItems = normalizeCustomItems([]);
}

function normalizeDays(days) {
  const dayCount = Math.max(1, Array.isArray(days) ? days.length : 0);
  return Array.from({ length: dayCount }, (_, index) => {
    const stops = Array.isArray(days[index]?.stops) ? days[index].stops : [];
    return {
      startTime: days[index]?.startTime || "10:00",
      stops: index === 0
        ? stops.filter((stop, stopIndex) => !isLegacyFirstDayHotel(stop, stopIndex))
        : stops,
      legs: Array.isArray(days[index]?.legs) ? days[index].legs : [],
    };
  });
}

function isLegacyFirstDayHotel(stop, stopIndex) {
  return stopIndex === 0 && stop.isHotel && stop.fixedRole === "hotel";
}

function attachActiveDayAccessors(target) {
  for (const key of ["startTime", "stops", "legs"]) {
    Object.defineProperty(target, key, {
      configurable: true,
      get: () => target.days[target.activeDay][key],
      set: (value) => { target.days[target.activeDay][key] = value; },
    });
  }
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify(state));
  scheduleCloudSave();
}

function saveLocalState() {
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

function sharedStateSignature() {
  const stopFields = (stop) => [
    stop.placeId || null, stop.name || "",
    Number(stop.stayMinutes) || 0, Boolean(stop.isHotel), Boolean(stop.isHotelReturn), Boolean(stop.isFixed), stop.fixedRole || null, stop.fixedTime || null,
    Boolean(stop.isCustom), stop.customStart || null, stop.customEnd || null, stop.startPlaceName || null, stop.endPlaceName || null,
    stop.note || "", stop.category || "", Boolean(stop.isFavorite), Number(stop.manualTravelMinutes) || 0,
    (stop.alternatives || []).map((place) => [place.placeId || null, place.name || "", place.address || "", place.category || ""]),
  ];
  return JSON.stringify({
    days: state.days.map((day) => [day.startTime, day.stops.map(stopFields), day.legs.map((leg) => leg?.manualArrivalTime || "")]),
    wishlist: state.wishlist.map(stopFields),
    expenses: state.expenses,
    participants: state.participants,
    selectedHotel: state.selectedHotel,
    customItems: state.customItems,
    exchangeRate: state.exchangeRate,
    budgets: state.budgets,
    mapHiddenKeys: state.mapHiddenKeys,
    mapVisibilityInitialized: state.mapVisibilityInitialized,
    mapVisibilityKeyVersion: state.mapVisibilityKeyVersion || 2,
  });
}

function bindEvents() {
  els.startTime.addEventListener("change", () => {
    state.startTime = els.startTime.value;
    saveState();
    render();
  });
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchPlaces(els.search.value.trim()), 280);
  });
  document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
  document.querySelector("#closeCandidateDialog").addEventListener("click", () => els.candidateDialog.close());
  els.favoriteCandidateButton.addEventListener("click", () => openCandidateDialog());
  document.querySelector("#addPlaceButton").addEventListener("click", addSelectedPlace);
  document.querySelector("#saveCandidateButton").addEventListener("click", saveSelectedCandidate);
  document.querySelector("#closeMoveStopDialog").addEventListener("click", () => els.moveStopDialog.close());
  document.querySelector("#cancelMoveStop").addEventListener("click", () => els.moveStopDialog.close());
  els.moveStopDay.addEventListener("change", () => updateMoveStopOrderOptions());
  els.moveStopForm.addEventListener("submit", moveStopToSchedule);
  els.stopEditTabs.querySelector('[data-stop-edit-tab="PLACE"]').addEventListener("click", () => {});
  els.stopEditTabs.querySelector('[data-stop-edit-tab="MOVE"]').addEventListener("click", () => {
    if (!movingStop) return;
    els.candidateDialog.close();
    openMoveStopDialog(movingStop.index);
  });
  els.moveStopEditTabs.querySelector('[data-move-stop-edit-tab="PLACE"]').addEventListener("click", () => {
    if (!movingStop) return;
    const index = movingStop.index;
    els.moveStopDialog.close();
    openStopEditDialog(index);
  });
  els.moveStopEditTabs.querySelector('[data-move-stop-edit-tab="MOVE"]').addEventListener("click", () => {});
  document.querySelector("#customScheduleButton").addEventListener("click", showCustomScheduleForm);
  document.querySelector("#returnHotelButton").addEventListener("click", openHotelDialog);
  document.querySelector("#closeHotelDialog").addEventListener("click", () => els.hotelDialog.close());
  document.querySelector("#cancelHotelDialog").addEventListener("click", () => els.hotelDialog.close());
  els.hotelForm.addEventListener("submit", saveHotelAndAddReturn);
  els.openGoogleRouteButton.addEventListener("click", openFullGoogleRoute);
  els.cloudButton.addEventListener("click", handleCloudButton);
  els.tripSwitchButton.addEventListener("click", openTripDialog);
  document.querySelector("#closeTripDialog").addEventListener("click", () => els.tripDialog.close());
  els.newTripForm.addEventListener("submit", createBlankTrip);
  els.joinTripForm.addEventListener("submit", openSharedTripLink);
  els.dayTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-day]");
    if (tab) switchDay(Number(tab.dataset.day));
  });
  els.addDayButton.addEventListener("click", addTravelDay);
  els.previousDay.addEventListener("click", () => switchDay(state.activeDay - 1));
  els.nextDay.addEventListener("click", () => switchDay(state.activeDay + 1));
  els.transportButtons.forEach((button) => button.addEventListener("click", () => setTravelMode(button.dataset.mode)));
  els.listTabButton.addEventListener("click", () => setMainTab("LIST"));
  els.routeTabButton.addEventListener("click", () => setMainTab("ROUTE"));
  els.ledgerTabButton.addEventListener("click", () => setMainTab("LEDGER"));
  els.expenseAddButton.addEventListener("click", () => {
    if (!expenseCategories().length) return alert("먼저 + 항목 버튼으로 지출 항목을 추가해 주세요.");
    editingExpenseId = null;
    els.expenseForm.reset();
    renderExpenseOwners("공통");
    populateExpensePlaces();
    els.expenseDay.value = String(state.activeDay);
    els.expenseForm.classList.remove("hidden");
    els.expenseTitle.focus();
  });
  els.expenseCancelButton.addEventListener("click", closeExpenseForm);
  els.expenseForm.addEventListener("submit", saveExpense);
  els.participantAddButton.addEventListener("click", addParticipant);
  els.expenseCurrency.addEventListener("change", () => {
    els.expenseCurrencyUnit.textContent = els.expenseCurrency.value === "KRW" ? "원" : "엔";
  });
  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-formatted-number]")) formatNumberInput(event.target);
  });
  els.ledgerAmountToggle.addEventListener("click", () => {
    ledgerPerPersonMode = !ledgerPerPersonMode;
    renderLedger();
  });
  els.totalBudgetInput.addEventListener("input", () => updateBudget("total", null, els.totalBudgetInput.value));
  els.dayBudgetInputs.addEventListener("change", (event) => {
    if (event.target.dataset.budgetDay !== undefined) updateBudget("day", Number(event.target.dataset.budgetDay), event.target.value);
  });
  els.categoryBudgetInputs.addEventListener("change", (event) => {
    if (event.target.dataset.budgetCategory) updateBudget("category", event.target.dataset.budgetCategory, event.target.value);
  });
  els.dailyExpenseSummary.addEventListener("click", (event) => {
    if (event.target.closest("[data-budget-category-add]")) addBudgetCategory();
  });
  els.categoryBudgetInputs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-budget-category-remove]");
    if (button) removeBudgetCategory(button.dataset.budgetCategoryRemove);
  });
  els.routeCandidateFilters.addEventListener("wheel", scrollCandidateFiltersWithWheel, { passive: false });
  window.addEventListener("resize", () => { arrangeLedgerLayout(); renderWishlist(); });
}

function scrollCandidateFiltersWithWheel(event) {
  if (!window.matchMedia("(min-width: 801px) and (hover: hover) and (pointer: fine)").matches) return;
  if (els.routeCandidateFilters.scrollWidth <= els.routeCandidateFilters.clientWidth) return;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  event.preventDefault();
  els.routeCandidateFilters.scrollLeft += event.deltaY;
}

function setMainTab(tab) {
  activeMainTab = ["ROUTE", "LEDGER"].includes(tab) ? tab : "LIST";
  const listActive = activeMainTab === "LIST";
  const routeActive = activeMainTab === "ROUTE";
  const ledgerActive = activeMainTab === "LEDGER";
  els.listTabButton.classList.toggle("active", listActive);
  els.routeTabButton.classList.toggle("active", routeActive);
  els.ledgerTabButton.classList.toggle("active", ledgerActive);
  els.listTabButton.setAttribute("aria-selected", String(listActive));
  els.routeTabButton.setAttribute("aria-selected", String(routeActive));
  els.ledgerTabButton.setAttribute("aria-selected", String(ledgerActive));
  els.listPanel.classList.toggle("hidden", !listActive);
  els.routePanel.classList.toggle("hidden", !routeActive);
  els.ledgerPanel.classList.toggle("hidden", !ledgerActive);
  els.mapPanel.classList.toggle("ledger-mode", ledgerActive);
  els.appShell.classList.toggle("list-mode", listActive);
  els.rankingPanel.classList.toggle("hidden", !ledgerActive);
  arrangeLedgerLayout();
  if (routeActive) renderRouteCandidates();
  if (ledgerActive) renderLedger();
  if (routeActive) drawMap();
}

function arrangeLedgerLayout() {
  const desktopLedger = activeMainTab === "LEDGER" && window.innerWidth > 800;
  els.appShell.classList.toggle("ledger-desktop", desktopLedger);
  if (desktopLedger) {
    if (els.rankingPanel.parentElement !== els.plannerPanel) els.plannerPanel.appendChild(els.rankingPanel);
    if (els.ledgerPanel.parentElement !== els.mapPanel) els.mapPanel.appendChild(els.ledgerPanel);
    return;
  }
  if (els.ledgerPanel.previousElementSibling !== els.ledgerAnchor) els.ledgerAnchor.after(els.ledgerPanel);
  if (els.rankingPanel.previousElementSibling !== els.rankingAnchor) els.rankingAnchor.after(els.rankingPanel);
}

function setTravelMode(mode) {
  state.travelMode = ["AUTO", "WALKING", "TRANSIT"].includes(mode) ? mode : "AUTO";
  updateTransportUi();
  saveLocalState();
  render();
  drawMap();
}

function updateTransportUi() {
  els.transportButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.travelMode));
}

async function switchDay(dayIndex) {
  if (dayIndex < 0 || dayIndex >= state.days.length || dayIndex === state.activeDay) return;
  state.activeDay = dayIndex;
  els.startTime.value = state.startTime;
  updateDayUi();
  if (mapsReady && state.stops.length > 1 && !state.legs.length) await calculateLegs();
  saveLocalState();
  render();
  drawMap();
}

function updateDayUi() {
  els.dayTabs.innerHTML = state.days.map((_, index) => `<button class="day-tab ${index === state.activeDay ? "active" : ""}" data-day="${index}" role="tab" aria-selected="${index === state.activeDay}">${index + 1}일차</button>`).join("");
  els.dayTabs.querySelectorAll(".day-tab").forEach((tab, index) => {
    const active = index === state.activeDay;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    if (active) tab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
  els.previousDay.disabled = state.activeDay === 0;
  els.nextDay.disabled = state.activeDay === state.days.length - 1;
}

function addTravelDay() {
  const requested = prompt("추가할 일차 수를 입력하세요.", "1");
  if (requested === null) return;
  const count = Number(requested.trim());
  if (!Number.isInteger(count) || count < 1 || count > 30) return alert("1~30 사이의 숫자로 입력해 주세요.");
  for (let index = 0; index < count; index += 1) {
    state.days.push({ startTime: "10:00", stops: [], legs: [] });
    state.customItems.push([]);
    state.budgets.days.push(0);
    state.budgets.manualDays.push(false);
  }
  state.activeDay = state.days.length - 1;
  activeExpenseDayFilter = state.activeDay;
  els.startTime.value = state.startTime;
  saveState();
  updateDayUi();
  render();
  renderLedger();
  drawMap();
}

async function bootSupabase() {
  const config = window.NAMBA_SUPABASE_CONFIG;
  if (!config?.projectUrl || !config?.publishableKey || config.projectUrl.includes("YOUR_")) return;
  try {
    supabase = createClient(config.projectUrl, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const result = await supabase.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    if (!session) throw new Error("익명 세션을 만들지 못했습니다.");

    if (activeTripId) {
      await openSharedTrip(activeTripId);
      if (cloudReady) subscribeToTripChanges();
    }
    else setCloudUi("이 기기에 저장 중", "공유 저장을 시작하면 일행과 함께 볼 수 있어요.", "공유 저장 시작");
  } catch (error) {
    console.error("Supabase initialization failed", error);
    setCloudUi("공유 저장 연결 실패", error.message || "Supabase 설정을 확인하세요.", "다시 연결");
  }
}

async function handleCloudButton() {
  if (!supabase) return bootSupabase();
  if (activeTripId && cloudReady) {
    await navigator.clipboard.writeText(location.href);
    setCloudUi("공유 링크 복사 완료", "일행에게 링크와 참여 PIN을 함께 보내세요.", "링크 다시 복사");
    return;
  }

  const pin = prompt("일행과 공유할 숫자 4자리 PIN을 입력하세요.");
  if (!pin) return;
  if (!/^\d{4}$/.test(pin.trim())) return alert("PIN은 숫자 4자리로 입력해 주세요.");
  setCloudUi("공유 여행 생성 중", "잠시만 기다려 주세요.", "처리 중");
  const { data, error } = await supabase.rpc("namba_create_trip", {
    p_name: "오사카 여행",
    p_start_time: `${state.startTime}:00`,
    p_invite_code: pin.trim(),
  });
  if (error) {
    console.error(error);
    setCloudUi("공유 여행 생성 실패", error.message, "다시 시도");
    return;
  }
  activeTripId = data;
  history.replaceState({}, "", `${location.pathname}?trip=${activeTripId}`);
  cloudReady = true;
  await saveToCloud();
  subscribeToTripChanges();
  setCloudUi("공유 저장됨", "변경 내용이 일행 화면에 실시간 반영됩니다.", "공유 링크 복사");
}

async function openTripDialog() {
  if (!supabase) return alert("공유 서비스 연결이 완료된 뒤 다시 눌러 주세요.");
  els.tripDialog.showModal();
  await loadMyTrips();
}

async function loadMyTrips() {
  els.tripList.innerHTML = "<span>여행 목록을 불러오는 중…</span>";
  const { data, error } = await supabase.from("namba_trips").select("id,name,updated_at").order("updated_at", { ascending: false });
  if (error) {
    els.tripList.innerHTML = `<span>여행 목록을 불러오지 못했습니다.</span>`;
    return;
  }
  if (!data?.length) {
    els.tripList.innerHTML = "<span>참여 중인 여행이 없습니다.</span>";
    return;
  }
  els.tripList.innerHTML = data.map((trip) => {
    const updated = trip.updated_at ? new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(trip.updated_at)) : "";
    return `<button type="button" class="${trip.id === activeTripId ? "active" : ""}" data-trip-switch="${trip.id}"><strong>${escapeHtml(trip.name || "이름 없는 여행")}</strong><small>${trip.id === activeTripId ? "현재 여행" : `${updated} 수정`}</small></button>`;
  }).join("");
  els.tripList.querySelectorAll("[data-trip-switch]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.tripSwitch === activeTripId) return els.tripDialog.close();
    location.assign(`${location.pathname}?trip=${encodeURIComponent(button.dataset.tripSwitch)}`);
  }));
}

async function createBlankTrip(event) {
  event.preventDefault();
  const name = els.newTripName.value.trim();
  const pin = els.newTripPin.value.trim();
  if (!name) return;
  if (!/^\d{4}$/.test(pin)) return alert("PIN은 숫자 4자리로 입력해 주세요.");
  const submitButton = els.newTripForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "만드는 중…";
  const { data, error } = await supabase.rpc("namba_create_trip", {
    p_name: name,
    p_start_time: "10:00:00",
    p_invite_code: pin,
  });
  if (error) {
    submitButton.disabled = false;
    submitButton.textContent = "백지 여행 만들기";
    return alert(error.message || "새 여행을 만들지 못했습니다.");
  }
  const blankPlannerData = {
    expenses: [], participants: [], selectedHotel: null, customItems: [[]],
    budgets: { total: 0, days: [0, 0], manualDays: [false, false], categories: {}, categoryOrder: [] },
    mapHiddenKeys: [], mapVisibilityInitialized: false, mapVisibilityKeyVersion: 2,
    manualArrivals: [[]], dayStartTimes: ["10:00"], dayCount: 1,
  };
  const initialized = await supabase.rpc("namba_replace_trip_state", {
    p_trip_id: data,
    p_start_time: "10:00:00",
    p_planner_data: blankPlannerData,
    p_stops: [],
    p_updated_at: new Date().toISOString(),
  });
  if (initialized.error) {
    submitButton.disabled = false;
    submitButton.textContent = "백지 여행 만들기";
    return alert("여행은 생성됐지만 초기화하지 못했습니다. 여행 전환 목록에서 다시 열어 주세요.");
  }
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}:${data}`);
  location.assign(`${location.pathname}?trip=${encodeURIComponent(data)}`);
}

function openSharedTripLink(event) {
  event.preventDefault();
  const value = els.joinTripLink.value.trim();
  try {
    const url = new URL(value, location.origin);
    const tripId = url.searchParams.get("trip");
    if (!tripId || !/^[0-9a-f-]{36}$/i.test(tripId)) throw new Error("invalid trip link");
    location.assign(`${location.pathname}?trip=${encodeURIComponent(tripId)}`);
  } catch {
    alert("올바른 여행 공유 링크를 입력해 주세요.");
  }
}

async function openSharedTrip(tripId, silent = false) {
  if (!silent) setCloudUi("공유 여행 확인 중", "저장된 일정을 불러오고 있습니다.", "확인 중");
  const previousLegsByRoute = new Map();
  state.days.forEach((day) => {
    day.stops.slice(0, -1).forEach((origin, index) => {
      const destination = day.stops[index + 1];
      const leg = day.legs[index];
      if (origin && destination && leg && (leg.walking || leg.transit)) {
        previousLegsByRoute.set(routeLegKey(origin, destination), leg);
      }
    });
  });
  let tripResult = await supabase.from("namba_trips").select("id,name,start_time,updated_at,planner_data").eq("id", tripId).maybeSingle();
  if (tripResult.error) throw tripResult.error;
  if (!tripResult.data) {
    const pin = prompt("이 여행의 참여 PIN을 입력하세요.");
    if (!pin) {
      setCloudUi("참여 PIN 필요", "공유 링크를 보낸 사람에게 PIN을 확인하세요.", "PIN 입력");
      return;
    }
    const joined = await supabase.rpc("namba_join_trip", { p_trip_id: tripId, p_invite_code: pin.trim() });
    if (joined.error) throw joined.error;
    if (!joined.data) {
      setCloudUi("PIN이 맞지 않습니다", "다시 확인해 주세요.", "PIN 다시 입력");
      return;
    }
    tripResult = await supabase.from("namba_trips").select("id,name,start_time,updated_at,planner_data").eq("id", tripId).single();
    if (tripResult.error) throw tripResult.error;
  }

  const stopsResult = await supabase.from("namba_trip_stops")
    .select("place_id,name,address,latitude,longitude,stay_minutes,sort_order,is_hotel,is_fixed,fixed_role,fixed_time,planner_meta")
    .eq("trip_id", tripId).order("sort_order");
  if (stopsResult.error) throw stopsResult.error;
  const plannerData = tripResult.data.planner_data || {};
  const savedScheduleDays = (stopsResult.data || []).filter((stop) => stop.planner_meta?.isWishlist !== true && (stop.planner_meta?.dayIndex !== undefined || Number(stop.sort_order) < 9000)).map((stop) => Number.isInteger(Number(stop.planner_meta?.dayIndex)) ? Number(stop.planner_meta.dayIndex) : Math.floor((Number(stop.sort_order) || 0) / 1000));
  const storedDayCount = Math.max(1, Number(plannerData.dayCount) || 0, Array.isArray(plannerData.dayStartTimes) ? plannerData.dayStartTimes.length : 0, savedScheduleDays.length ? Math.max(...savedScheduleDays) + 1 : 0);
  state.days = normalizeDays(Array.from({ length: storedDayCount }, () => ({})));
  state.activeDay = Math.min(state.activeDay, state.days.length - 1);
  state.days.forEach((day) => { day.startTime = String(tripResult.data.start_time || "10:00").slice(0, 5); });
  state.wishlist = [];
  if (Array.isArray(plannerData.dayStartTimes)) {
    state.days.forEach((day, index) => { day.startTime = String(plannerData.dayStartTimes[index] || day.startTime).slice(0, 5); });
  }
  state.expenses = Array.isArray(plannerData.expenses) ? plannerData.expenses : [];
  state.participants = normalizeParticipants(plannerData.participants);
  state.selectedHotel = normalizeSelectedHotel(plannerData.selectedHotel);
  state.customItems = normalizeCustomItems(plannerData.customItems, state.days.length);
  state.budgets = normalizeBudgets(plannerData.budgets, state.days.length);
  state.mapHiddenKeys = Array.isArray(plannerData.mapHiddenKeys) ? plannerData.mapHiddenKeys : [];
  state.mapVisibilityInitialized = Boolean(plannerData.mapVisibilityInitialized);
  state.mapVisibilityKeyVersion = Number(plannerData.mapVisibilityKeyVersion) || 0;
  if (plannerData.exchangeRate) state.exchangeRate = plannerData.exchangeRate;
  (stopsResult.data || []).forEach((stop) => {
    const encodedOrder = Number(stop.sort_order) || 0;
    const place = {
      placeId: stop.place_id,
      name: stop.name,
      address: stop.address,
      location: { lat: stop.latitude, lng: stop.longitude },
      stayMinutes: stop.stay_minutes,
      isHotel: stop.is_hotel,
      isFixed: stop.is_fixed,
      fixedRole: stop.fixed_role,
      fixedTime: stop.fixed_time ? String(stop.fixed_time).slice(0, 5) : null,
      ...(stop.planner_meta || {}),
    };
    const isWishlist = stop.planner_meta?.isWishlist === true || (encodedOrder >= 9000 && stop.planner_meta?.dayIndex === undefined);
    if (isWishlist) {
      state.wishlist.push({ ...place, category: place.category || inferCategory(place.name), isFavorite: place.isFavorite !== false });
      return;
    }
    const dayIndex = Number.isInteger(Number(stop.planner_meta?.dayIndex)) ? Math.max(0, Number(stop.planner_meta.dayIndex)) : Math.max(0, Math.floor(encodedOrder / 1000));
    while (state.days.length <= dayIndex) state.days.push({ startTime: "10:00", stops: [], legs: [] });
    state.days[dayIndex].stops.push(place);
  });
  state.days[0].stops = state.days[0].stops.filter((stop, stopIndex) => !isLegacyFirstDayHotel(stop, stopIndex));
  const wishlistByPlaceId = new Map(state.wishlist.filter((place) => place.placeId).map((place) => [place.placeId, place]));
  const sharedPlaceFields = ["category", "photoUri", "rating", "tabelogRating", "tabelogUrl", "isReservable", "acceptsCreditCards", "acceptsCashOnly", "openingHours", "openingHoursChecked", "placeDetailsChecked", "distanceInfo"];
  state.days.forEach((day) => day.stops.forEach((stop) => {
    const savedPlace = wishlistByPlaceId.get(stop.placeId);
    if (!savedPlace) return;
    if (!stop.isHotel && !stop.isHotelReturn) stop.category = savedPlace.category || inferCategory(savedPlace.name);
    sharedPlaceFields.forEach((field) => {
      if (field === "category") return;
      if (stop[field] === undefined || stop[field] === null || stop[field] === "") stop[field] = savedPlace[field];
    });
  }));
  if (!state.selectedHotel) state.selectedHotel = inferSelectedHotel();
  state.days.forEach((day, dayIndex) => {
    const arrivals = Array.isArray(plannerData.manualArrivals?.[dayIndex]) ? plannerData.manualArrivals[dayIndex] : [];
    day.legs = day.stops.slice(0, -1).map((origin, legIndex) => {
      const manualArrivalTime = arrivals[legIndex] || "";
      const cachedLeg = previousLegsByRoute.get(routeLegKey(origin, day.stops[legIndex + 1]));
      return cachedLeg ? { ...cachedLeg, manualArrivalTime } : { manualArrivalTime, isLoading: true };
    });
  });
  if (!state.mapVisibilityInitialized || state.mapVisibilityKeyVersion < 2) {
    const airportKeys = state.days.flatMap((day, dayIndex) => day.stops.map((stop, index) => ({ stop, index, dayIndex })))
      .filter(({ stop }) => stop.fixedRole?.startsWith("airport"))
      .map(({ stop, index, dayIndex }) => mapStopKey(stop, index, dayIndex));
    state.mapHiddenKeys = airportKeys;
    state.mapVisibilityInitialized = true;
    state.mapVisibilityKeyVersion = 2;
  }
  migrateLegacyCustomItems();
  const airportArrival = state.days[0].stops.find((stop) => stop.fixedRole === "airport_arrival");
  if (airportArrival?.fixedTime) state.days[0].startTime = airportArrival.fixedTime;
  cloudReady = true;
  lastKnownCloudUpdate = tripResult.data.updated_at || "";
  lastKnownContentSignature = plannerData.contentSignature || sharedStateSignature();
  localStorage.setItem(storageKey(), JSON.stringify(state));
  els.startTime.value = state.startTime;
  updateDayUi();
  render();
  drawMap();
  enrichMissingWishlistPhotos();
  enrichHotelPhoto();
  const loadedCount = state.days.reduce((sum, day) => sum + day.stops.length, 0) + state.wishlist.length;
  setCloudUi(silent ? "실시간 동기화됨" : "공유 여행 연결됨", silent ? "일행의 변경 내용을 자동으로 반영했습니다." : `${loadedCount}개 장소를 불러왔습니다. 경로는 뒤에서 계산합니다.`, "공유 링크 복사");
  if (mapsReady && state.stops.length > 1) {
    els.mapStatus.textContent = "저장 장소 표시 완료 · 경로 계산 중";
    calculateLegs().then(() => {
      render();
      drawMap();
      els.mapStatus.textContent = "경로 계산 완료";
    }).catch((error) => {
      console.error("Route calculation failed after loading the trip", error);
      els.mapStatus.textContent = "장소 복원 완료 · 일부 경로 계산 실패";
    });
  }
}

function scheduleCloudSave() {
  if (!cloudReady || !activeTripId || !supabase) return;
  clearTimeout(cloudSaveTimer);
  cloudSavePending = true;
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null;
    cloudSavePending = false;
    saveToCloud();
  }, 650);
}

async function saveToCloud() {
  if (!cloudReady || !activeTripId || !supabase) return;
  if (cloudSaveInFlight) {
    scheduleCloudSave();
    return;
  }
  cloudSaveInFlight = true;
  if (!state.selectedHotel) state.selectedHotel = inferSelectedHotel();
  setCloudUi("저장 중…", "일정을 클라우드에 반영하고 있습니다.", "공유 링크 복사");
  const allStops = state.days.flatMap((day, dayIndex) => day.stops
    .filter((stop, index) => !(dayIndex === 0 && isLegacyFirstDayHotel(stop, index)))
    .map((stop, index) => ({ stop, index, dayIndex })));
  allStops.push(...state.wishlist.map((stop, index) => ({ stop, index: 1000000 + index, dayIndex: 0, isWishlist: true })));
  const rows = allStops.map(({ stop, index, dayIndex, isWishlist }) => ({
    trip_id: activeTripId,
      place_id: stop.placeId || null,
      name: stop.name,
      address: stop.address || "",
      latitude: stop.location.lat,
      longitude: stop.location.lng,
      stay_minutes: stop.stayMinutes || 0,
      sort_order: isWishlist ? index : (dayIndex * 1000) + index,
      is_hotel: isWishlist ? false : Boolean(stop.isHotel),
      is_fixed: isWishlist ? false : Boolean(stop.isFixed),
      fixed_role: isWishlist ? null : stop.fixedRole || null,
      fixed_time: isWishlist ? null : stop.fixedTime || null,
      planner_meta: isWishlist ? {
        isWishlist: true,
        category: stop.category || "미분류",
        isFavorite: Boolean(stop.isFavorite),
        photoUri: stop.photoUri || "",
        rating: Number(stop.rating) || null,
        tabelogRating: Number(stop.tabelogRating) || null,
        tabelogUrl: stop.tabelogUrl || "",
        isReservable: typeof stop.isReservable === "boolean" ? stop.isReservable : null,
        acceptsCreditCards: typeof stop.acceptsCreditCards === "boolean" ? stop.acceptsCreditCards : null,
        acceptsCashOnly: typeof stop.acceptsCashOnly === "boolean" ? stop.acceptsCashOnly : null,
        openingHours: stop.openingHours || null,
        openingHoursChecked: Boolean(stop.openingHoursChecked),
        placeDetailsChecked: Boolean(stop.placeDetailsChecked),
        distanceInfo: stop.distanceInfo || null,
        googleMapsURI: stop.googleMapsURI || "",
      } : {
        dayIndex,
        isCustom: Boolean(stop.isCustom),
        isHotelReturn: Boolean(stop.isHotelReturn),
        customStart: stop.customStart || null,
        customEnd: stop.customEnd || null,
        startPlaceName: stop.startPlaceName || null,
        startLocation: stop.startLocation || null,
        endPlaceName: stop.endPlaceName || null,
        note: stop.note || "",
        needsEndPlace: Boolean(stop.needsEndPlace),
        googleMapsURI: stop.googleMapsURI || "",
        category: stop.category || "",
        photoUri: stop.photoUri || "",
        rating: Number(stop.rating) || null,
        tabelogRating: Number(stop.tabelogRating) || null,
        tabelogUrl: stop.tabelogUrl || "",
        isReservable: typeof stop.isReservable === "boolean" ? stop.isReservable : null,
        acceptsCreditCards: typeof stop.acceptsCreditCards === "boolean" ? stop.acceptsCreditCards : null,
        acceptsCashOnly: typeof stop.acceptsCashOnly === "boolean" ? stop.acceptsCashOnly : null,
        openingHours: stop.openingHours || null,
        openingHoursChecked: Boolean(stop.openingHoursChecked),
        placeDetailsChecked: Boolean(stop.placeDetailsChecked),
        distanceInfo: stop.distanceInfo || null,
        manualTravelMinutes: Math.max(0, Number(stop.manualTravelMinutes) || 0),
        alternatives: Array.isArray(stop.alternatives) ? stop.alternatives : [],
      },
  }));
  const updatedAt = new Date().toISOString();
  lastLocalCloudUpdate = updatedAt;
  lastKnownCloudUpdate = updatedAt;
  const plannerData = {
    expenses: state.expenses,
      participants: state.participants,
      selectedHotel: state.selectedHotel,
      customItems: state.customItems,
      exchangeRate: state.exchangeRate,
      budgets: state.budgets,
      mapHiddenKeys: state.mapHiddenKeys,
      mapVisibilityInitialized: state.mapVisibilityInitialized,
      mapVisibilityKeyVersion: state.mapVisibilityKeyVersion || 2,
      manualArrivals: state.days.map((day) => day.legs.map((leg) => leg?.manualArrivalTime || "")),
      dayStartTimes: state.days.map((day) => day.startTime),
      dayCount: state.days.length,
      contentSignature: sharedStateSignature(),
    writerId: clientInstanceId,
  };
  lastKnownContentSignature = plannerData.contentSignature;
  const replaceResult = await supabase.rpc("namba_replace_trip_state", {
    p_trip_id: activeTripId,
    p_start_time: `${state.startTime}:00`,
    p_planner_data: plannerData,
    p_stops: rows,
    p_updated_at: updatedAt,
  });
  if (replaceResult.error) return failCloudSave(replaceResult.error);
  cloudSaveInFlight = false;
  setCloudUi("공유 저장됨", "변경 내용이 일행 화면에 실시간 반영됩니다.", "공유 링크 복사");
}

function failCloudSave(error) {
  cloudSaveInFlight = false;
  setCloudUi("저장 실패", error.message || "다시 시도해 주세요.", "다시 시도");
}

function subscribeToTripChanges() {
  if (!supabase || !activeTripId) return;
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`namba-trip-${activeTripId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "namba_trips",
      filter: `id=eq.${activeTripId}`,
    }, (payload) => {
      if (payload.new?.planner_data?.writerId === clientInstanceId) return;
      const remoteSignature = payload.new?.planner_data?.contentSignature || "";
      if (remoteSignature && remoteSignature === lastKnownContentSignature) {
        lastKnownCloudUpdate = payload.new?.updated_at || lastKnownCloudUpdate;
        return;
      }
      if (!isNewCloudVersion(payload.new?.updated_at)) return;
      scheduleRealtimeRefresh();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setCloudUi("실시간 동기화됨", "일행의 변경 내용이 새로고침 없이 반영됩니다.", "공유 링크 복사");
    });
  clearInterval(realtimeVersionTimer);
  realtimeVersionTimer = setInterval(checkCloudVersion, 15000);
}

function isNewCloudVersion(updatedAt) {
  if (!updatedAt) return false;
  if (Math.abs(Date.parse(updatedAt) - Date.parse(lastLocalCloudUpdate || 0)) < 10) return false;
  return updatedAt !== lastKnownCloudUpdate;
}

async function checkCloudVersion() {
  if (!cloudReady || cloudSavePending || cloudSaveInFlight || document.hidden) return;
  const { data, error } = await supabase.from("namba_trips").select("updated_at,planner_data").eq("id", activeTripId).maybeSingle();
  if (error || data?.planner_data?.writerId === clientInstanceId) return;
  const remoteSignature = data?.planner_data?.contentSignature || "";
  if (remoteSignature && remoteSignature === lastKnownContentSignature) {
    lastKnownCloudUpdate = data?.updated_at || lastKnownCloudUpdate;
    return;
  }
  if (isNewCloudVersion(data?.updated_at)) scheduleRealtimeRefresh();
}

function scheduleRealtimeRefresh() {
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(async () => {
    if (cloudSavePending || cloudSaveInFlight) {
      scheduleRealtimeRefresh();
      return;
    }
    try {
      const beforeSignature = sharedStateSignature();
      await openSharedTrip(activeTripId, true);
      if (sharedStateSignature() !== beforeSignature) showSyncToast();
    } catch (error) {
      console.error("Realtime refresh failed", error);
      setCloudUi("실시간 동기화 지연", "연결이 복구되면 최신 내용을 다시 불러옵니다.", "공유 링크 복사");
    }
  }, 700);
}

function showSyncToast() {
  clearTimeout(syncToastTimer);
  els.syncToast.classList.add("visible");
  syncToastTimer = setTimeout(() => els.syncToast.classList.remove("visible"), 2400);
}

function setCloudUi(status, hint, button) {
  els.cloudStatus.textContent = status;
  els.cloudHint.textContent = hint;
  els.cloudButton.textContent = button;
}

async function bootGoogleMaps() {
  const apiKey = window.NAMBA_PLANNER_CONFIG?.googleMapsApiKey;
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    els.setupNotice.classList.remove("hidden");
    els.mapStatus.textContent = "API 키 연결 필요";
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`;
  script.async = true;
  script.onerror = () => { els.mapStatus.textContent = "Google 지도 로드 실패"; };
  script.onload = initMaps;
  document.head.append(script);
}

async function initMaps() {
  try {
    const { Map } = await google.maps.importLibrary("maps");
    map2d = new Map(els.map, {
      center: DEFAULT_CENTER,
      zoom: 15,
      mapId: "DEMO_MAP_ID",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: true,
    });
    els.mapPlaceholder.classList.add("hidden");
    els.mapStatus.textContent = "Google Maps · 난바";
    mapsReady = true;
    await calculateLegs();
    render();
    drawMap();
    enrichMissingWishlistPhotos();
    enrichMissingWishlistInfo();
    enrichHotelPhoto();
  } catch (error) {
    console.error(error);
    els.mapStatus.textContent = "지도 초기화 실패";
  }
}

async function searchPlaces(query) {
  lastSearchQuery = query;
  if (!query || !window.google) {
    els.searchResults.classList.add("hidden");
    return;
  }
  try {
    const { Place } = await google.maps.importLibrary("places");
    const center = state.stops[0]?.location || DEFAULT_CENTER;
    const request = {
      textQuery: query,
      fields: ["id", "displayName", "formattedAddress", "location", "googleMapsURI", "primaryType", "photos", "rating", "isReservable", "paymentOptions", "regularOpeningHours"],
      locationBias: { center, radius: 3000 },
      language: "ko",
      region: "JP",
      maxResultCount: 8,
    };
    const { places } = await Place.searchByText(request);
    showSearchResults(places || []);
  } catch (error) {
    console.error(error);
    els.searchResults.innerHTML = `<div class="search-result">검색하지 못했습니다. 정확한 장소명을 입력해 주세요.</div>`;
    els.searchResults.classList.remove("hidden");
  }
}

function showSearchResults(places) {
  els.searchResults.innerHTML = "";
  if (!places.length) {
    els.searchResults.innerHTML = `<div class="search-result">검색 결과가 없습니다.</div>`;
  }
  places.forEach((place) => {
    const button = document.createElement("button");
    button.className = "search-result";
    button.innerHTML = `<strong>${escapeHtml(place.displayName || "이름 없음")}</strong><span>${escapeHtml(place.formattedAddress || "")}</span>`;
    button.addEventListener("click", () => openCandidate(place));
    els.searchResults.append(button);
  });
  els.searchResults.classList.remove("hidden");
}

function openCandidate(place) {
  const photoUri = place.photos?.[0]?.getURI?.({ maxWidth: 320, maxHeight: 220 }) || "";
  selectedCandidate = {
    placeId: place.id,
    name: place.displayName || "장소",
    address: place.formattedAddress || "",
    location: { lat: place.location.lat(), lng: place.location.lng() },
    googleMapsURI: place.googleMapsURI || "",
    photoUri,
    rating: Number(place.rating) || null,
    isReservable: typeof place.isReservable === "boolean" ? place.isReservable : null,
    acceptsCreditCards: typeof place.paymentOptions?.acceptsCreditCards === "boolean" ? place.paymentOptions.acceptsCreditCards : null,
    acceptsCashOnly: typeof place.paymentOptions?.acceptsCashOnly === "boolean" ? place.paymentOptions.acceptsCashOnly : null,
    openingHours: serializeOpeningHours(place.regularOpeningHours),
    openingHoursChecked: true,
    placeDetailsChecked: true,
    category: inferCategory(`${lastSearchQuery} ${place.displayName || ""}`, place.primaryType),
  };
  els.dialogName.textContent = selectedCandidate.name;
  els.dialogAddress.textContent = selectedCandidate.address;
  els.googleSearchLink.href = googlePlaceUrl(selectedCandidate);
  els.searchResults.classList.add("hidden");
  els.dialog.showModal();
}

async function addSelectedPlace() {
  if (!selectedCandidate) return;
  const fixedEnd = state.stops.findIndex((stop) => stop.fixedRole === "airport_departure");
  const candidate = { ...selectedCandidate, stayMinutes: 60, isHotel: false, isFixed: false };
  if (fixedEnd >= 0) state.stops.splice(fixedEnd, 0, candidate);
  else state.stops.push(candidate);
  els.dialog.close();
  els.search.value = "";
  saveState();
  await calculateLegs();
  render();
  drawMap();
}

async function saveSelectedCandidate() {
  if (!selectedCandidate) return;
  if (state.wishlist.some((place) => place.placeId === selectedCandidate.placeId)) {
    alert("이미 갈 곳 리스트에 있는 장소입니다.");
    return;
  }
  const savedPlace = { ...selectedCandidate, stayMinutes: 60, isHotel: false, isFavorite: false };
  state.wishlist.push(savedPlace);
  els.dialog.close();
  els.search.value = "";
  saveState();
  render();
  if (mapsReady) {
    savedPlace.distanceInfo = await buildDistanceInfo(savedPlace).catch(() => null);
    saveLocalState();
    render();
  }
}

function inferCategory(text = "", primaryType = "") {
  const value = `${text} ${primaryType}`.toLowerCase();
  const categories = [
    ["라멘", ["라멘", "ramen", "ラーメン"]],
    ["쿠시카츠", ["쿠시카츠", "kushikatsu", "串カツ", "串かつ"]],
    ["스시", ["스시", "초밥", "sushi", "寿司"]],
    ["야키니쿠", ["야키니쿠", "yakiniku", "焼肉"]],
    ["우동", ["우동", "udon", "うどん"]],
    ["오코노미야키", ["오코노미야키", "okonomiyaki", "お好み焼き"]],
    ["카페", ["카페", "coffee", "cafe", "café", "喫茶"]],
  ];
  return categories.find(([, words]) => words.some((word) => value.includes(word.toLowerCase())))?.[0] || "미분류";
}

function placeRegion(place) {
  const address = place.address || "";
  const { lat, lng } = place.location;
  if (/京都|교토|kyoto/i.test(address) || (lat > 34.84 && lat < 35.16 && lng > 135.64 && lng < 135.92)) return "KYOTO";
  if (/神戸|고베|kobe/i.test(address) || (lat > 34.53 && lat < 34.82 && lng > 134.95 && lng < 135.32)) return "KOBE";
  return "OSAKA";
}

async function buildDistanceInfo(place) {
  const region = placeRegion(place);
  if (region !== "OSAKA") {
    const station = region === "KYOTO"
      ? { name: "교토역", location: { lat: 34.985849, lng: 135.758766 } }
      : { name: "고베역", location: { lat: 34.679476, lng: 135.178103 } };
    const route = await computeRoute(station, place, "WALKING");
    return { region, stationName: station.name, stationMinutes: Math.max(1, Math.ceil((route?.seconds || 0) / 60)) };
  }

  const { Place } = await google.maps.importLibrary("places");
  const { places } = await Place.searchByText({
    textQuery: "駅",
    fields: ["displayName", "location"],
    locationBias: { center: place.location, radius: 1200 },
    language: "ko",
    region: "JP",
    maxResultCount: 5,
  });
  const stations = (places || []).filter((item) => item.location).map((item) => ({
    name: item.displayName || "가까운 역",
    location: { lat: item.location.lat(), lng: item.location.lng() },
  })).sort((a, b) => straightDistance(a.location, place.location) - straightDistance(b.location, place.location));
  const station = stations[0];
  const hotel = getHotelStop();
  const [stationRoute, hotelRoute] = await Promise.all([
    station ? computeRoute(station, place, "WALKING") : null,
    hotel ? computeRoute(hotel, place, "WALKING") : null,
  ]);
  return {
    region,
    stationName: station?.name || "가까운 역",
    stationMinutes: stationRoute ? Math.max(1, Math.ceil(stationRoute.seconds / 60)) : null,
    stationMeters: stationRoute?.meters || null,
    hotelMinutes: hotelRoute ? Math.max(1, Math.ceil(hotelRoute.seconds / 60)) : null,
    hotelMeters: hotelRoute?.meters || null,
  };
}

async function enrichMissingWishlistInfo() {
  const missing = state.wishlist.filter((place) => !place.distanceInfo?.stationMeters || (place.distanceInfo?.region === "OSAKA" && !place.distanceInfo?.hotelMeters));
  for (const place of missing) {
    place.distanceInfo = await buildDistanceInfo(place).catch(() => null);
    saveLocalState();
    renderWishlist();
    renderRouteCandidates();
  }
}

async function enrichMissingWishlistPhotos() {
  if (!mapsReady) return;
  const missing = state.wishlist.filter((place) => !place.photoUri || !place.rating || !place.placeId || !place.placeDetailsChecked || !place.openingHoursChecked);
  if (!missing.length) return;
  const { Place } = await google.maps.importLibrary("places");
  let changed = false;
  for (const savedPlace of missing) {
    try {
      let place;
      if (savedPlace.placeId) {
        place = new Place({ id: savedPlace.placeId });
        await place.fetchFields({ fields: ["photos", "rating", "googleMapsURI", "formattedAddress", "location", "isReservable", "paymentOptions", "regularOpeningHours"] });
      } else {
        const result = await Place.searchByText({
          textQuery: [savedPlace.name, savedPlace.address].filter(Boolean).join(" "),
          fields: ["id", "displayName", "formattedAddress", "location", "photos", "rating", "googleMapsURI", "isReservable", "paymentOptions", "regularOpeningHours"],
          locationBias: savedPlace.location ? { center: savedPlace.location, radius: 500 } : undefined,
          language: "ko",
          region: "JP",
          maxResultCount: 1,
        });
        place = result.places?.[0];
      }
      if (!place) continue;
      if (!savedPlace.placeDetailsChecked) { savedPlace.placeDetailsChecked = true; changed = true; }
      const photoUri = place.photos?.[0]?.getURI?.({ maxWidth: 320, maxHeight: 220 }) || "";
      if (photoUri && !savedPlace.photoUri) { savedPlace.photoUri = photoUri; changed = true; }
      if (place.rating && !savedPlace.rating) { savedPlace.rating = Number(place.rating); changed = true; }
      if (place.id && savedPlace.placeId !== place.id) { savedPlace.placeId = place.id; changed = true; }
      if (place.googleMapsURI && savedPlace.googleMapsURI !== place.googleMapsURI) { savedPlace.googleMapsURI = place.googleMapsURI; changed = true; }
      if (typeof place.isReservable === "boolean" && savedPlace.isReservable !== place.isReservable) { savedPlace.isReservable = place.isReservable; changed = true; }
      if (typeof place.paymentOptions?.acceptsCreditCards === "boolean" && savedPlace.acceptsCreditCards !== place.paymentOptions.acceptsCreditCards) { savedPlace.acceptsCreditCards = place.paymentOptions.acceptsCreditCards; changed = true; }
      if (typeof place.paymentOptions?.acceptsCashOnly === "boolean" && savedPlace.acceptsCashOnly !== place.paymentOptions.acceptsCashOnly) { savedPlace.acceptsCashOnly = place.paymentOptions.acceptsCashOnly; changed = true; }
      const openingHours = serializeOpeningHours(place.regularOpeningHours);
      if (JSON.stringify(savedPlace.openingHours || null) !== JSON.stringify(openingHours)) { savedPlace.openingHours = openingHours; changed = true; }
      if (!savedPlace.openingHoursChecked) { savedPlace.openingHoursChecked = true; changed = true; }
      if (place.formattedAddress && savedPlace.address !== place.formattedAddress) { savedPlace.address = place.formattedAddress; changed = true; }
      if (place.location) {
        const nextLocation = { lat: place.location.lat(), lng: place.location.lng() };
        if (savedPlace.location?.lat !== nextLocation.lat || savedPlace.location?.lng !== nextLocation.lng) {
          savedPlace.location = nextLocation;
          changed = true;
        }
      }
      state.days.flatMap((day) => day.stops).filter((stop) => stop.name === savedPlace.name).forEach((stop) => {
        stop.placeId = savedPlace.placeId;
        stop.googleMapsURI = savedPlace.googleMapsURI;
        stop.address = savedPlace.address;
        stop.location = { ...savedPlace.location };
        stop.openingHours = savedPlace.openingHours;
        stop.openingHoursChecked = savedPlace.openingHoursChecked;
      });
      renderWishlist();
      renderRouteCandidates();
    } catch (error) {
      console.info("장소 사진 조회 실패", savedPlace.name, error?.message || "");
    }
  }
  if (changed) {
    saveState();
    render();
  }
}

async function addWishlistToDay(wishlistIndex, dayIndex, visitOrder) {
  const candidate = state.wishlist[wishlistIndex];
  if (!candidate) return;
  const day = state.days[dayIndex];
  let hotel = day.stops.find((stop) => stop.isHotel) || null;
  if (!hotel) {
    hotel = getHotelStop();
    if (!hotel) {
      alert("먼저 숙소를 검색해 현재 일차에 바로 추가해 주세요.");
      return;
    }
    if (dayIndex !== 0) day.stops.unshift({ ...hotel, stayMinutes: 0, isHotel: true, isFixed: true, fixedRole: "hotel" });
  }
  const fixedPrefix = day.stops.findIndex((stop) => !stop.isFixed);
  const prefixLength = fixedPrefix < 0 ? day.stops.length : fixedPrefix;
  const fixedAirportIndex = day.stops.findIndex((stop) => stop.fixedRole === "airport_departure");
  const returnIndex = fixedAirportIndex >= 0 ? fixedAirportIndex : (day.stops.length > 1 && day.stops.at(-1).placeId === hotel.placeId ? day.stops.length - 1 : day.stops.length);
  const insertIndex = Math.min(Math.max(prefixLength, prefixLength + visitOrder - 1), returnIndex);
  day.stops.splice(insertIndex, 0, { ...candidate, stayMinutes: candidate.stayMinutes || 60, isHotel: false });
  day.legs = [];
  state.activeDay = dayIndex;
  els.startTime.value = state.startTime;
  updateDayUi();
  if (mapsReady) await calculateLegs();
  saveState();
  render();
  drawMap();
}

async function enrichHotelPhoto() {
  if (!mapsReady) return;
  const hotel = getHotelStop();
  if (!hotel?.placeId || hotel.photoUri) return;
  try {
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: hotel.placeId });
    await place.fetchFields({ fields: ["photos"] });
    const photoUri = place.photos?.[0]?.getURI?.({ maxWidth: 320, maxHeight: 220 }) || "";
    if (!photoUri) return;
    state.days.flatMap((day) => day.stops).filter((stop) => stop.placeId === hotel.placeId).forEach((stop) => { stop.photoUri = photoUri; });
    saveState();
    render();
  } catch (error) {
    console.info("숙소 사진 조회 실패", error?.message || "");
  }
}

// 구글 장소 사진 주소는 시간이 지나면 만료된다(저장해 두고 재사용하면 안 됨).
// 사진이 안 열리면 그 장소의 사진을 새로 받아 저장해서, 공유 중인 모두에게 고쳐진 사진이 보이게 한다.
// 한 화면을 여는 동안 장소마다 최대 한 번만 다시 받는다(새 주소도 실패해도 반복 호출하지 않음).
const brokenPhotoUris = new Set();
const repairedPlaceIds = new Set();
let photoRepairTimer = null;
let photoRepairRunning = false;
let photoRepairWaits = 0;
document.addEventListener("error", (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  const uri = img.getAttribute("src") || "";
  if (!uri.includes("places.googleapis.com") || brokenPhotoUris.has(uri)) return;
  brokenPhotoUris.add(uri);
  schedulePhotoRepair(400);
}, true);

function schedulePhotoRepair(delay) {
  clearTimeout(photoRepairTimer);
  photoRepairTimer = setTimeout(repairBrokenPhotos, delay);
}

async function repairBrokenPhotos() {
  if (photoRepairRunning) { schedulePhotoRepair(1000); return; }
  if (!mapsReady) {
    // 지도가 끝내 안 뜨면(키 문제 등) 30초 뒤 포기한다.
    if (++photoRepairWaits <= 20) schedulePhotoRepair(1500);
    return;
  }
  const places = [...state.wishlist, ...state.days.flatMap((day) => day.stops)];
  const targets = places.filter((place) => place.placeId && place.photoUri &&
    brokenPhotoUris.has(place.photoUri) && !repairedPlaceIds.has(place.placeId));
  if (!targets.length) return;
  photoRepairRunning = true;
  // 요청을 시작할 때의 깨진 주소(장소별). 받는 사이 주소가 바뀌었으면 교체하지 않기 위해 기억한다.
  const startUris = new Map();
  targets.forEach((place) => {
    if (!startUris.has(place.placeId)) startUris.set(place.placeId, new Set());
    startUris.get(place.placeId).add(place.photoUri);
  });
  // 구글 응답이 끝나지 않아도 10초 뒤에는 포기해서 실행 표시가 계속 켜져 있지 않게 한다.
  const withTimeout = (promise) => Promise.race([promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("시간 초과")), 10000))]);
  try {
    const { Place } = await withTimeout(google.maps.importLibrary("places"));
    const fresh = new Map();
    for (const placeId of startUris.keys()) {
      repairedPlaceIds.add(placeId);
      try {
        const place = new Place({ id: placeId });
        await withTimeout(place.fetchFields({ fields: ["photos"] }));
        fresh.set(placeId, place.photos?.[0]?.getURI?.({ maxWidth: 320, maxHeight: 220 }) || "");
      } catch (error) {
        console.info("사진 다시 받기 실패", error?.message || "");
      }
    }
    // 받는 사이 다른 사람이 사진을 바꿨으면 덮어쓰지 않는다(시작할 때의 깨진 주소 그대로일 때만 교체).
    let changed = false;
    const latest = [...state.wishlist, ...state.days.flatMap((day) => day.stops)];
    latest.forEach((place) => {
      if (!fresh.has(place.placeId) || !startUris.get(place.placeId)?.has(place.photoUri)) return;
      const next = fresh.get(place.placeId);
      if (place.photoUri !== next) { place.photoUri = next; changed = true; }
    });
    if (changed) { saveState(); render(); }
  } catch (error) {
    console.info("사진 복구용 지도 라이브러리 로드 실패", error?.message || "");
  } finally {
    photoRepairRunning = false;
  }
}

async function insertWishlistAt(wishlistIndex, stopIndex) {
  const candidate = state.wishlist[wishlistIndex];
  if (!candidate) return;
  const airportIndex = state.stops.findIndex((stop) => stop.fixedRole === "airport_departure");
  const upperLimit = airportIndex >= 0 ? airportIndex : state.stops.length;
  const insertIndex = Math.min(Math.max(1, stopIndex), upperLimit);
  state.stops.splice(insertIndex, 0, {
    ...candidate,
    alternatives: [],
    manualTravelMinutes: 0,
    stayMinutes: candidate.stayMinutes || 60,
    isHotel: false,
    isFixed: false,
    fixedRole: null,
    fixedTime: null,
  });
  state.legs = [];
  if (mapsReady) await calculateLegs();
  saveState();
  render();
  drawMap();
}

function addWishlistAlternative(wishlistIndex, stopIndex) {
  const candidate = state.wishlist[wishlistIndex];
  const stop = state.stops[stopIndex];
  if (!candidate || !stop || stop.isFixed || stop.isCustom || stop.isHotel) return;
  const alternatives = Array.isArray(stop.alternatives) ? stop.alternatives : [];
  if (stop.placeId === candidate.placeId || alternatives.some((place) => place.placeId === candidate.placeId || place.name === candidate.name)) return;
  stop.alternatives = [...alternatives, { ...candidate, isHotel: false, isFixed: false }];
  saveState();
  render();
}

async function addHotelReturn() {
  const hotel = getHotelStop();
  if (!hotel) return alert("먼저 숙소를 지정해 주세요.");
  const returnStop = { ...hotel, name: hotel.name, category: "숙소", stayMinutes: 60, isHotel: false, isHotelReturn: true, isFixed: false, fixedRole: null, fixedTime: null, manualTravelMinutes: 0 };
  const airportIndex = state.stops.findIndex((stop) => stop.fixedRole === "airport_departure");
  if (airportIndex >= 0) state.stops.splice(airportIndex, 0, returnStop);
  else state.stops.push(returnStop);
  await calculateLegs();
  saveState();
  render();
  drawMap();
}

async function calculateLegs() {
  if (!mapsReady || state.stops.length < 2) {
    state.legs = [];
    return;
  }
  const calculationVersion = ++legCalculationVersion;
  const dayIndex = state.activeDay;
  const stops = [...state.days[dayIndex].stops];
  const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const origin = stops[i];
    const destinationStop = stops[i + 1];
    if (destinationStop.isCustom && !destinationStop.startLocation) {
      legs.push({ customGap: true });
      continue;
    }
    const destination = destinationStop.isCustom
      ? { name: destinationStop.startPlaceName, location: destinationStop.startLocation }
      : destinationStop;
    const [walkingResult, transit] = await Promise.all([
      computeRoute(origin, destination, "WALKING").catch((error) => { console.error(error); return null; }),
      computeRoute(origin, destination, "TRANSIT").catch((error) => { console.warn("Transit route unavailable", error); return null; }),
    ]);
    const directMeters = straightDistance(origin.location, destination.location);
    const estimatedWalking = estimateWalkingRoute(origin, destination, directMeters);
    const walking = walkingResult || (estimatedWalking.seconds <= 20 * 60 ? estimatedWalking : null);
    const sameAsWalking = walking && transit &&
      Math.abs(walking.seconds - transit.seconds) <= 60 &&
      Math.abs((walking.meters || 0) - (transit.meters || 0)) <= 100;
    legs.push({ walking, transit: sameAsWalking ? null : transit });
  }
  if (calculationVersion !== legCalculationVersion) return;
  state.days[dayIndex].legs = legs;
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

async function computeRoute(origin, destination, travelMode) {
  if (travelMode === "TRANSIT") return computeTransitRoute(origin, destination);
  const { Route } = await google.maps.importLibrary("routes");
  const { routes } = await Route.computeRoutes({
    origin: origin.location,
    destination: destination.location,
    travelMode,
    fields: ["path", "distanceMeters", "durationMillis"],
  });
  const route = routes?.[0];
  if (!route) return null;
  return {
    meters: route?.distanceMeters || 0,
    seconds: Math.round((route?.durationMillis || 0) / 1000),
    path: (route?.path || []).map((p) => ({
      lat: typeof p.lat === "function" ? p.lat() : p.lat,
      lng: typeof p.lng === "function" ? p.lng() : p.lng,
    })),
  };
}

async function computeTransitRoute(origin, destination) {
  if (straightDistance(origin.location, destination.location) < 80) return null;
  const timing = getTransitTiming(origin, destination);
  if (supabase) {
    try {
      const payload = {
        origin: origin.location,
        destination: destination.location,
        ...(timing.arrivalTime ? { arrivalTime: timing.arrivalTime.toISOString() } : {}),
        ...(timing.departureTime ? { departureTime: timing.departureTime.toISOString() } : {}),
      };
      const { data, error } = await supabase.functions.invoke("namba-transit-route", { body: payload });
      if (error) throw error;
      if (data?.route?.seconds && data.route?.journeySteps?.some((step) => step.type === "TRANSIT")) return data.route;
    } catch (error) {
      console.info("서버 대중교통 조회 실패, 브라우저 경로로 재조회", error?.message || "");
    }
  }
  return computeBrowserTransitRoute(origin, destination, timing);
}

async function computeBrowserTransitRoute(origin, destination, timing) {
  const { Route } = await google.maps.importLibrary("routes");
  const { routes } = await Route.computeRoutes({
    origin: origin.location,
    destination: destination.location,
    travelMode: "TRANSIT",
    ...timing,
    computeAlternativeRoutes: true,
    transitPreference: {
      allowedTransitModes: ["BUS", "SUBWAY", "TRAIN", "LIGHT_RAIL", "RAIL"],
      routingPreference: "FEWER_TRANSFERS",
    },
    fields: ["path", "distanceMeters", "durationMillis", "localizedValues", "travelAdvisory", "legs"],
  });
  const route = (routes || []).find((candidate) => extractTransitSteps(candidate).length > 0);
  if (!route) return null;
  return {
    meters: route.distanceMeters || 0,
    seconds: Math.round((route.durationMillis || 0) / 1000),
    path: (route.path || []).map((p) => ({ lat: typeof p.lat === "function" ? p.lat() : p.lat, lng: typeof p.lng === "function" ? p.lng() : p.lng })),
    fareText: normalizeFare(route.localizedValues?.transitFare || route.travelAdvisory?.transitFare),
    transitSteps: extractTransitSteps(route),
    journeySteps: extractJourneySteps(route),
    transfers: Math.max(0, extractTransitSteps(route).length - 1),
  };
}

function estimateWalkingRoute(origin, destination, directMeters = straightDistance(origin.location, destination.location)) {
  const meters = Math.max(1, Math.round(directMeters * 1.18));
  return {
    meters,
    seconds: Math.max(60, Math.round(meters / 1.25)),
    path: [origin.location, destination.location],
    estimated: true,
  };
}

function normalizeWishlist(items) {
  return Array.isArray(items) ? items.map((place) => ({
    ...place,
    category: place.category || inferCategory(place.name),
    isFavorite: place.isFavorite !== false,
  })) : [];
}

function getTransitTiming(origin, destination) {
  const now = new Date();
  const makeNextTime = (time) => {
    const [hours, minutes] = String(time).split(":").map(Number);
    const result = new Date(now);
    result.setHours(hours, minutes, 0, 0);
    if (result <= now) result.setDate(result.getDate() + 1);
    return result;
  };
  if (destination.fixedRole === "airport_departure" && destination.fixedTime) return { arrivalTime: makeNextTime(destination.fixedTime) };
  if (origin.fixedRole === "airport_arrival" && origin.fixedTime) return { departureTime: makeNextTime(origin.fixedTime) };
  return { departureTime: now };
}

function extractTransitSteps(route) {
  return (route.legs || []).flatMap((leg) => leg.steps || []).map((step) => step.transitDetails).filter(Boolean).map((detail) => ({
    line: detail.transitLine?.shortName || detail.transitLine?.name || detail.transitLine?.vehicle?.name || "대중교통",
    headsign: detail.headsign || "",
    from: detail.departureStop?.name || "",
    to: detail.arrivalStop?.name || "",
    departure: formatTransitTime(detail.departureTime),
    arrival: formatTransitTime(detail.arrivalTime),
    stops: detail.stopCount || 0,
  }));
}

function extractJourneySteps(route) {
  return (route.legs || []).flatMap((leg) => leg.steps || []).map((step) => {
    const detail = step.transitDetails;
    const seconds = Math.round((step.durationMillis || step.staticDurationMillis || 0) / 1000);
    if (!detail) return {
      type: "WALK",
      seconds,
      meters: step.distanceMeters || 0,
      instruction: step.navigationInstruction?.instructions || "",
    };
    return {
      type: "TRANSIT",
      seconds,
      meters: step.distanceMeters || 0,
      line: detail.transitLine?.shortName || detail.transitLine?.name || detail.transitLine?.vehicle?.name || "대중교통",
      vehicle: detail.transitLine?.vehicle?.type || "TRANSIT",
      color: detail.transitLine?.color || "",
      headsign: detail.headsign || "",
      from: detail.departureStop?.name || "",
      to: detail.arrivalStop?.name || "",
      departure: formatTransitTime(detail.departureTime),
      arrival: formatTransitTime(detail.arrivalTime),
      stops: detail.stopCount || 0,
    };
  }).filter((step) => step.seconds || step.meters);
}

function transitVehicleLabel(type) {
  const labels = {
    SUBWAY: "지하철", METRO_RAIL: "지하철", HEAVY_RAIL: "전철", COMMUTER_TRAIN: "전철",
    TRAIN: "열차", RAIL: "열차", HIGH_SPEED_TRAIN: "고속열차", BUS: "버스", INTERCITY_BUS: "버스",
    TRAM: "트램", LIGHT_RAIL: "경전철", FERRY: "페리",
  };
  return labels[type] || "대중교통";
}

function renderTransitJourney(route, mapUrl) {
  if (!route?.journeySteps?.some((step) => step.type === "TRANSIT")) return "";
  const rows = route.journeySteps.map((step, index) => {
    if (step.type === "WALK") {
      const label = index === 0 ? "출발지에서 역까지" : index === route.journeySteps.length - 1 ? "역에서 목적지까지" : "환승 도보";
      return `<div class="journey-step walk"><span class="journey-icon">걷기</span><div><strong>${label} · ${formatMinutes(Math.max(1, Math.ceil(step.seconds / 60)))}</strong><small>${step.meters ? formatDistance(step.meters) : ""}</small></div></div>`;
    }
    const vehicle = transitVehicleLabel(step.vehicle);
    const time = [step.departure, step.arrival].filter(Boolean).join(" → ");
    const stations = [step.from, step.to].filter(Boolean).join(" → ");
    return `<div class="journey-step transit"><span class="journey-icon"${step.color ? ` style="background:${escapeHtml(step.color)}"` : ""}>${escapeHtml(vehicle)}</span><div><strong>${escapeHtml(step.line || vehicle)}${step.headsign ? ` · ${escapeHtml(step.headsign)} 방면` : ""}</strong><small>${escapeHtml(stations)}${step.stops ? ` · ${step.stops}개 역` : ""}${time ? ` · ${escapeHtml(time)}` : ""}</small></div></div>`;
  }).join("");
  const transferText = route.transfers > 0 ? `환승 ${route.transfers}회` : "환승 없음";
  return `<div class="transit-journey"><div class="journey-summary"><strong>총 ${formatMinutes(Math.ceil(route.seconds / 60))}</strong><span>${transferText}${route.fareText ? ` · 예상 ${escapeHtml(route.fareText)}` : ""}</span></div>${rows}<a class="journey-map-link" href="${mapUrl}" target="_blank" rel="noopener">Google 지도에서 실시간 운행 확인 ↗</a><small class="google-attribution">Powered by Google</small></div>`;
}

function formatTransitTime(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return String(value);
}

function normalizeFare(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.text || value.localizedText || null;
}

function getHotelStop() {
  return state.selectedHotel || state.days.flatMap((day) => day.stops).find((stop) => stop.isHotel) || null;
}

function inferSelectedHotel() {
  const candidates = state.days.flatMap((day) => day.stops).filter((stop) => !stop.isCustom && !stop.isHotelReturn && (stop.isHotel || stop.category === "숙소"));
  if (!candidates.length) return null;
  const counts = new Map();
  candidates.forEach((stop) => {
    const key = stop.placeId || `${stop.name}:${stop.location?.lat || ""}:${stop.location?.lng || ""}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  candidates.sort((first, second) => {
    const firstKey = first.placeId || `${first.name}:${first.location?.lat || ""}:${first.location?.lng || ""}`;
    const secondKey = second.placeId || `${second.name}:${second.location?.lat || ""}:${second.location?.lng || ""}`;
    return (counts.get(secondKey) || 0) - (counts.get(firstKey) || 0);
  });
  return normalizeSelectedHotel(candidates[0]);
}

function isSamePlace(first, second) {
  if (!first || !second) return false;
  if (first.placeId && second.placeId) return first.placeId === second.placeId;
  return first.name === second.name && first.location?.lat === second.location?.lat && first.location?.lng === second.location?.lng;
}

function isSelectedHotel(stop) {
  return isSamePlace(stop, state.selectedHotel) && !stop.isHotelReturn;
}

function googleDirectionsUrl(origin, destination, mode) {
  const params = new URLSearchParams({ api: "1", origin: `${origin.location.lat},${origin.location.lng}`, destination: `${destination.location.lat},${destination.location.lng}`, travelmode: mode === "TRANSIT" ? "transit" : "walking" });
  if (origin.placeId) params.set("origin_place_id", origin.placeId);
  if (destination.placeId) params.set("destination_place_id", destination.placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}

function openFullGoogleRoute() {
  const routeStops = state.stops.filter((stop, index) => !stop.isCustom && stop.location && !state.mapHiddenKeys.includes(mapStopKey(stop, index)));
  if (routeStops.length < 2) {
    alert("전체 경로를 열려면 실제 장소가 2곳 이상 필요합니다.");
    return;
  }

  const routePath = routeStops
    .map((stop) => encodeURIComponent([stop.name, stop.address].filter(Boolean).join(" ")))
    .join("/");
  window.open(`https://www.google.com/maps/dir/${routePath}/data=!4m2!4m1!3e2`, "_blank", "noopener");
}

function getLegRoute(leg, mode = state.travelMode) {
  if (!leg) return null;
  if (leg.walking || leg.transit) {
    if (mode === "AUTO") return chooseRecommendedRoute(leg);
    return mode === "TRANSIT" ? leg.transit : leg.walking;
  }
  return mode === "WALKING" && Number.isFinite(Number(leg.seconds)) && Number.isFinite(Number(leg.meters)) ? leg : null;
}

function routeLegKey(origin, destination) {
  const placeKey = (place) => place?.placeId || [place?.name, place?.location?.lat, place?.location?.lng].join(":");
  return `${placeKey(origin)}>${placeKey(destination)}`;
}

function chooseRecommendedRoute(leg) {
  const walking = leg?.walking;
  const transit = leg?.transit;
  if (!walking) return transit;
  if (!transit) return walking.seconds <= 3600 ? walking : null;
  const walkMinutes = walking.seconds / 60;
  const transitMinutes = transit.seconds / 60;
  if (walkMinutes <= 25 && walking.meters <= 2200) return walking;
  if (walkMinutes <= 40 && transitMinutes >= walkMinutes - 8) return walking;
  return transit;
}

function getRecommendedMode(leg) {
  if (!leg?.transit && leg?.walking?.seconds > 3600) return "TRANSIT";
  return chooseRecommendedRoute(leg) === leg?.transit ? "TRANSIT" : "WALKING";
}

function render() {
  renderWishlist();
  renderRouteCandidates();
  if (!customScheduleFormOpen) renderCustomSchedule();
  renderMapVisibilityControls();
  renderLedger();
  if (!state.stops.length) {
    els.itinerary.innerHTML = `<div class="empty-state">먼저 숙소를 검색해 추가하세요.<br />그다음 가고 싶은 장소를 차례로 넣으면 됩니다.</div>`;
    els.totalSummary.textContent = `총 0m · 이동 0분`;
    els.openGoogleRouteButton.disabled = true;
    return;
  }

  els.openGoogleRouteButton.disabled = state.stops.filter((stop, index) => !stop.isCustom && stop.location && !state.mapHiddenKeys.includes(mapStopKey(stop, index))).length < 2;

  let clock = timeToMinutes(state.startTime);
  let clockKnown = true;
  let html = "";
  state.stops.forEach((stop, index) => {
    const isReturn = Boolean(stop.isHotelReturn);
    const isRouteHotel = isSelectedHotel(stop);
    if (stop.isCustom) {
      if (index > 0 && stop.startLocation) {
        const route = getLegRoute(state.legs[index - 1]);
        const routeMode = getRecommendedMode(state.legs[index - 1]);
        html += `<div class="leg-row"><div class="leg-metrics walking-only"><div><span>${routeMode === "TRANSIT" ? "대중교통" : "도보"}</span><strong>${route ? formatMinutes(Math.ceil(route.seconds / 60)) : "확인 필요"}</strong></div><div><span>시작 위치까지</span><strong>${route ? formatDistance(route.meters || 0) : "확인 필요"}</strong></div></div></div>`;
      }
      clock = manualTimeToTimeline(stop.customStart || "12:00", clock);
      clockKnown = true;
      html += `<article class="stop-card custom-stop reorderable" data-index="${index}" data-reorder-index="${index}" draggable="false">
        <div class="stop-order"><span class="stop-number">${index}</span><button class="stop-move-button" data-action="move" data-index="${index}">수정</button></div>
        <div class="stop-copy"><strong>${escapeHtml(stop.name || "커스텀 일정")}</strong><small>${escapeHtml(stop.customStart || "--:--")}–${escapeHtml(stop.customEnd || "--:--")} · 시작: ${escapeHtml(stop.startPlaceName || "이전 일정 장소")}</small><small>종료: ${escapeHtml(stop.endPlaceName || "설정 필요")}</small>${stop.note ? `<small>${escapeHtml(stop.note)}</small>` : ""}</div>
        <div class="stop-actions"><span class="drag-handle" aria-label="순서 변경" title="끌어서 순서 변경">⠿</span><button class="custom-edit-button" data-action="custom-edit" data-index="${index}">수정</button><button class="remove-button" data-action="remove" data-index="${index}" aria-label="삭제">×</button></div>
      </article>`;
      clock = manualTimeToTimeline(stop.customEnd || stop.customStart || "12:00", clock);
      return;
    }
    if (index > 0) {
      const leg = state.legs[index - 1];
      if (leg?.isLoading) {
        html += `<div class="leg-row"><div class="leg-loading">경로 계산 중…</div></div>`;
        clockKnown = false;
      } else {
      const walking = getLegRoute(leg, "WALKING");
      const transit = getLegRoute(leg, "TRANSIT");
      const selected = getLegRoute(leg);
      const selectedMode = getRecommendedMode(leg);
      const selectedMinutes = selected ? Math.ceil(selected.seconds / 60) : 0;
      const transitMapUrl = googleDirectionsUrl(state.stops[index - 1], stop, "TRANSIT");
      const routeDistance = selected?.meters || transit?.meters || walking?.meters || 0;
      const directDistance = straightDistance(state.stops[index - 1].location, stop.location);
      const selectedDistance = routeDistance || directDistance;
      const walkingIsPractical = walking && walking.seconds <= 20 * 60;
      const needsManualArrival = !transit && !walkingIsPractical;
      if (needsManualArrival) {
        if (stop.manualTravelMinutes && clockKnown) {
          clock += Number(stop.manualTravelMinutes);
        } else {
          clockKnown = false;
        }
      } else if (clockKnown) {
        clock += selectedMinutes;
      }
      html += walkingIsPractical
        ? `<div class="leg-row"><span class="leg-dot"></span><div class="leg-metrics walking-only">
          <div><span>${walking.estimated ? "도보 약" : "도보"}</span><strong>${formatMinutes(Math.ceil(walking.seconds / 60))}</strong></div>
          <div><span>거리</span><strong>${formatDistance(walking.meters)}</strong></div>
        </div></div>`
        : `<div class="leg-row"><span class="leg-dot"></span><div class="leg-metrics">
          <div><span>${walking?.estimated ? "도보 약" : "도보"}</span><strong>${walking ? formatMinutes(Math.ceil(walking.seconds / 60)) : "확인 필요"}</strong></div>
          <div><span>대중교통</span><strong>${transit ? formatMinutes(Math.ceil(transit.seconds / 60)) : `<a href="${transitMapUrl}" target="_blank" rel="noopener">확인 필요</a>`}</strong></div>
          <div><span>${routeDistance ? "거리" : "직선거리"}</span><strong>${selectedDistance ? formatDistance(selectedDistance) : "확인 필요"}</strong></div>
          <div><span>환승·요금</span><strong>${transit ? `${transit.transfers ? `환승 ${transit.transfers}회` : "환승 없음"}${transit.fareText ? ` · ${escapeHtml(transit.fareText)}` : ""}` : "확인 필요"}</strong></div>
        </div>${needsManualArrival ? `<label class="manual-arrival"><span>이동시간 직접 입력</span><span class="manual-duration-field"><input type="number" min="1" step="1" inputmode="numeric" placeholder="예: 35" data-action="manual-duration" data-index="${index}" value="${stop.manualTravelMinutes || ""}" aria-label="${escapeHtml(stop.name)}까지 걸리는 시간 입력" /><b>분</b></span><small>걸리는 시간을 분 단위로 입력하면 도착시간과 이후 일정이 자동 계산됩니다.</small></label>` : renderTransitJourney(transit, transitMapUrl)}</div>`;
      }
    }
    const fixedLabel = stop.fixedRole === "airport_arrival" ? `${stop.fixedTime || "12:10"} 간사이공항 도착 · 고정` : stop.fixedRole === "airport_departure" ? `${stop.fixedTime || "15:00"}까지 간사이공항 도착 · 고정` : stop.isFixed && !stop.isHotel ? "고정 일정" : "";
    const arrivalLabel = `${clockKnown ? formatClock(clock) : "시간 입력 필요"}${isRouteHotel ? " · 숙소" : isReturn ? " · 복귀" : " · 도착"}`;
    const stopMeta = fixedLabel
      ? `<span>${escapeHtml(fixedLabel)}</span>`
      : `<span>${escapeHtml(arrivalLabel)}</span>${!isRouteHotel && !isReturn ? `<span class="google-map-label">Google 지도 ↗</span>` : ""}`;
    const showPlaceDetails = isRouteHotel || isReturn || stop.photoUri || stop.rating || stop.tabelogRating || typeof stop.isReservable === "boolean";
    const stopRatings = placeRatingsMarkup(stop, "data-stop-tabelog-url");
    const stopReservation = reservationStatusMarkup(isReturn ? { ...stop, category: "숙소" } : stop);
    const alternatives = Array.isArray(stop.alternatives) ? stop.alternatives : [];
    const alternativeMarkup = !stop.isFixed && !isRouteHotel && !isReturn ? `<div class="stop-alternatives">
      ${alternatives.map((place, alternativeIndex) => {
        const alternativeDistance = stop.location && place.location ? straightDistance(stop.location, place.location) : 0;
        return `<div class="stop-alternative"><span>${index}-${alternativeIndex + 2}</span><button data-action="alternative-search" data-index="${index}" data-alternative-index="${alternativeIndex}"><b>${escapeHtml(place.name)}</b>${alternativeDistance ? `<small>1순위에서 ${formatDistance(alternativeDistance)}</small>` : ""}</button><button data-action="alternative-remove" data-index="${index}" data-alternative-index="${alternativeIndex}" aria-label="대체 장소 삭제">×</button></div>`;
      }).join("")}
      <button class="alternative-add-button" data-action="alternative-add" data-index="${index}">+ 후보 추가</button>
    </div>` : "";
    html += `<article class="stop-card ${showPlaceDetails ? "enriched" : ""} ${isRouteHotel ? "hotel" : ""} ${stop.isFixed ? "fixed" : "reorderable"}" data-index="${index}" ${stop.isFixed ? "" : `data-reorder-index="${index}" draggable="false"`}>
      <div class="stop-order"><span class="stop-number">${stop.fixedRole?.startsWith("airport") ? "✈" : isRouteHotel ? "⌂" : alternatives.length ? `${index}-1` : index}</span>${stop.isFixed || isReturn ? "" : `<button class="stop-move-button" data-action="edit-stop" data-index="${index}">수정</button>`}</div>
      ${showPlaceDetails ? (stop.photoUri ? `<img class="stop-photo" src="${escapeHtml(stop.photoUri)}" alt="" loading="lazy" />` : `<div class="stop-photo placeholder ${isRouteHotel || isReturn ? "hotel-fallback" : ""}" aria-label="${isRouteHotel || isReturn ? "숙소" : "장소"}">${isRouteHotel || isReturn ? "🏠" : escapeHtml((stop.category || "장소").slice(0, 1))}</div>`) : ""}
      <div class="stop-copy">
        <div class="stop-title-row"><button class="stop-place-link" data-action="search" data-index="${index}"><strong>${escapeHtml(isRouteHotel ? `숙소 · ${stop.name}` : isReturn ? `숙소 복귀 · ${stop.name}` : stop.name)}</strong></button>${stopRatings}</div>
        <small class="stop-meta">${stopMeta}</small>
        ${showPlaceDetails ? stopReservation : ""}
      </div>
      <div class="stop-actions">
        ${stop.isFixed ? "" : `<span class="drag-handle" aria-label="순서 변경" title="끌어서 순서 변경">⠿</span>`}
        <input class="stay-input" data-action="stay" data-index="${index}" type="number" min="0" step="10" value="${stop.stayMinutes || 0}" title="체류시간(분)" aria-label="${escapeHtml(isReturn ? "숙소 복귀" : stop.name)} 체류시간(분)" />
        ${stop.isFixed ? `<span class="lock-badge">🔒</span>` : `<button class="remove-button" data-action="remove" data-index="${index}" aria-label="삭제">×</button>`}
      </div>
      ${alternativeMarkup}
    </article>`;
    if (clockKnown) clock += stop.stayMinutes || 0;
  });
  els.itinerary.innerHTML = html;
  bindItineraryEvents();
  const selectedLegs = state.legs.map((leg) => getLegRoute(leg)).filter(Boolean);
  const totalMeters = selectedLegs.reduce((sum, leg) => sum + (leg.meters || 0), 0);
  const totalSeconds = selectedLegs.reduce((sum, leg) => sum + (leg.seconds || 0), 0);
  const modeLabel = state.travelMode === "AUTO" ? "자동 추천" : state.travelMode === "TRANSIT" ? "대중교통" : "도보";
  els.totalSummary.textContent = `총 ${formatDistance(totalMeters)} · ${modeLabel} ${formatMinutes(Math.ceil(totalSeconds / 60))}`;
}

function mapStopKey(stop, index = state.stops.indexOf(stop), dayIndex = state.activeDay) {
  if (!stop) return "";
  const placeKey = stop.placeId || `${stop.name}:${stop.location?.lat || ""}:${stop.location?.lng || ""}`;
  return `${dayIndex}:${index}:${placeKey}`;
}

function shortMapStopLabel(stop) {
  if (stop.fixedRole?.startsWith("airport")) return "공항";
  if (isSelectedHotel(stop)) return "숙소";
  if (stop.isHotelReturn) return "숙소복귀";
  return stop.category || stop.name || "장소";
}

function renderMapVisibilityControls() {
  const places = state.stops.map((stop, index) => ({ stop, index })).filter(({ stop }) => !stop.isCustom);
  if (!places.length) {
    els.mapVisibilityControls.innerHTML = `<span class="map-visibility-empty">표시할 장소가 없습니다.</span>`;
    return;
  }
  els.mapVisibilityControls.innerHTML = places.map(({ stop, index }) => {
    const hidden = state.mapHiddenKeys.includes(mapStopKey(stop, index));
    return `<button type="button" class="${hidden ? "hidden-on-map" : ""}" data-map-stop="${index}" aria-pressed="${hidden}" title="${escapeHtml(stop.name)}">${hidden ? "○" : "✓"} ${escapeHtml(shortMapStopLabel(stop))}</button>`;
  }).join("");
  els.mapVisibilityControls.querySelectorAll("[data-map-stop]").forEach((button) => button.addEventListener("click", () => {
    const stop = state.stops[Number(button.dataset.mapStop)];
    const key = mapStopKey(stop, Number(button.dataset.mapStop));
    state.mapHiddenKeys = state.mapHiddenKeys.includes(key) ? state.mapHiddenKeys.filter((item) => item !== key) : [...state.mapHiddenKeys, key];
    saveState();
    renderMapVisibilityControls();
    drawMap();
  }));
}

function availableEndPlaces() {
  const places = [...state.days.flatMap((day) => day.stops), ...state.wishlist].filter((place) => place.location && !place.isCustom);
  return places.filter((place, index) => places.findIndex((item) => item.placeId ? item.placeId === place.placeId : item.name === place.name) === index);
}

function showCustomScheduleForm(editIndex = null) {
  customScheduleFormOpen = true;
  const editing = Number.isInteger(editIndex) ? state.stops[editIndex] : null;
  const endPlaces = availableEndPlaces();
  els.customScheduleSection.innerHTML = `
    <form id="customScheduleForm" class="custom-schedule-form">
      <select name="day" aria-label="추가할 일차">${state.days.map((_, day) => `<option value="${day}" ${day === state.activeDay ? "selected" : ""}>${day + 1}일차</option>`).join("")}</select>
      <select name="order" aria-label="추가할 순서">${Array.from({ length: 12 }, (_, order) => `<option value="${order + 1}" ${editing && order + 1 === editIndex ? "selected" : ""}>${order + 1}번째</option>`).join("")}</select>
      <label><span>시작</span><input name="start" type="time" required value="${escapeHtml(editing?.customStart || "12:00")}" /></label>
      <label><span>종료</span><input name="end" type="time" required value="${escapeHtml(editing?.customEnd || "13:00")}" /></label>
      <input name="title" required placeholder="자유시간, 쇼핑 등" aria-label="일정 내용" value="${escapeHtml(editing?.name || "")}" />
      <select name="startPlace" aria-label="일정 시작 위치"><option value="">시작 위치: 이전 일정 장소</option>${endPlaces.map((place, index) => `<option value="${index}" ${editing?.startPlaceName === place.name ? "selected" : ""}>시작: ${escapeHtml(place.name)}</option>`).join("")}</select>
      <select name="endPlace" required aria-label="일정 종료 위치"><option value="">끝나는 위치 선택</option>${endPlaces.map((place, index) => `<option value="${index}" ${editing?.endPlaceName === place.name ? "selected" : ""}>${escapeHtml(place.name)}</option>`).join("")}</select>
      <input name="note" placeholder="비고 (선택)" aria-label="일정 비고" value="${escapeHtml(editing?.note || "")}" />
      <button type="button" class="secondary-button" data-custom-cancel>취소</button>
      <button class="primary-button">${editing ? "저장" : "동선에 추가"}</button>
    </form>`;
  const form = document.querySelector("#customScheduleForm");
  form.querySelector("[name=title]").focus();
  form.querySelector("[data-custom-cancel]").addEventListener("click", () => {
    customScheduleFormOpen = false;
    renderCustomSchedule();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const start = String(data.get("start"));
    const end = String(data.get("end"));
    if (timeToMinutes(end) <= timeToMinutes(start)) return alert("종료시간은 시작시간보다 뒤로 설정해 주세요.");
    const dayIndex = Number(data.get("day"));
    const visitOrder = Number(data.get("order"));
    const startPlaceValue = String(data.get("startPlace") || "");
    const startPlace = startPlaceValue === "" ? null : endPlaces[Number(startPlaceValue)];
    const endPlace = endPlaces[Number(data.get("endPlace"))];
    if (!endPlace) return alert("일정이 끝나는 위치를 선택해 주세요.");
    if (editing) state.stops.splice(editIndex, 1);
    const day = state.days[dayIndex];
    const fixedPrefix = day.stops.findIndex((stop) => !stop.isFixed);
    const prefixLength = fixedPrefix < 0 ? day.stops.length : fixedPrefix;
    const fixedAirportIndex = day.stops.findIndex((stop) => stop.fixedRole === "airport_departure");
    const insertLimit = fixedAirportIndex >= 0 ? fixedAirportIndex : day.stops.length;
    const insertIndex = Math.min(Math.max(prefixLength, prefixLength + visitOrder - 1), insertLimit);
    day.stops.splice(insertIndex, 0, {
      isCustom: true, name: String(data.get("title") || "").trim(), note: String(data.get("note") || "").trim(),
      customStart: start, customEnd: end, endPlaceName: endPlace.name,
      startPlaceName: startPlace?.name || "", startLocation: startPlace?.location ? { ...startPlace.location } : null,
      location: { ...endPlace.location }, placeId: endPlace.placeId || null, googleMapsURI: endPlace.googleMapsURI || "",
      stayMinutes: 0, isHotel: false, isFixed: false,
    });
    state.activeDay = dayIndex;
    els.startTime.value = state.startTime;
    updateDayUi();
    if (mapsReady) await calculateLegs();
    saveState();
    customScheduleFormOpen = false;
    render(); drawMap();
  });
}

function renderCustomSchedule() {
  els.customScheduleSection.innerHTML = "";
}

async function refreshExchangeRate() {
  if (state.exchangeRate?.updatedAt && Date.now() - new Date(state.exchangeRate.updatedAt).getTime() < 3 * 24 * 60 * 60 * 1000) {
    renderLedger();
    return;
  }
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rate/JPY/KRW");
    if (!response.ok) throw new Error("환율 조회 실패");
    const data = await response.json();
    if (!data.rate) throw new Error("환율 정보 없음");
    state.exchangeRate = { rate: Number(data.rate), date: data.date || "", updatedAt: new Date().toISOString() };
    saveState();
  } catch (error) {
    console.info(error.message);
  }
  renderLedger();
}

function populateExpensePlaces() {
  const places = [...state.wishlist, ...state.days.flatMap((day) => day.stops)];
  const names = [...new Set(places.map((place) => place.name).filter(Boolean))];
  els.expensePlace.innerHTML = `<option value="">장소 선택 안 함</option>${names.map((name) => `<option>${escapeHtml(name)}</option>`).join("")}`;
}

function saveExpense(event) {
  event.preventDefault();
  const amount = parseFormattedNumber(els.expenseAmount.value);
  if (!amount || !els.expenseTitle.value.trim()) return;
  const record = {
    id: editingExpenseId || Date.now(), dayIndex: Number(els.expenseDay.value), category: els.expenseCategory.value,
    owner: els.expenseOwner.value, title: els.expenseTitle.value.trim(), place: els.expensePlace.value,
    amount, currency: els.expenseCurrency.value, perPerson: els.expensePerPerson.checked, note: els.expenseNote.value.trim(),
  };
  const editIndex = state.expenses.findIndex((expense) => String(expense.id) === String(editingExpenseId));
  if (editIndex >= 0) state.expenses[editIndex] = record;
  else state.expenses.push(record);
  saveState(); closeExpenseForm(); renderLedger();
}

function closeExpenseForm() {
  editingExpenseId = null;
  els.expenseForm.reset();
  els.expenseCurrencyUnit.textContent = "엔";
  els.expenseForm.classList.add("hidden");
}

function editExpense(id) {
  const expense = state.expenses.find((item) => String(item.id) === String(id));
  if (!expense) return;
  editingExpenseId = expense.id;
  populateExpensePlaces();
  renderExpenseOwners(expense.owner || "공통");
  els.expenseDay.value = String(expense.dayIndex ?? 0);
  els.expenseCategory.value = expense.category || "기타";
  els.expenseOwner.value = expense.owner || "공통";
  els.expenseTitle.value = expense.title || "";
  els.expensePlace.value = expense.place || "";
  els.expenseCurrency.value = expenseCurrency(expense);
  els.expenseCurrencyUnit.textContent = expenseCurrency(expense) === "KRW" ? "원" : "엔";
  els.expenseAmount.value = formattedNumber(expense.amount);
  els.expensePerPerson.checked = Boolean(expense.perPerson);
  els.expenseNote.value = expense.note || "";
  els.expenseForm.classList.remove("hidden");
  els.expenseTitle.focus();
}

function participantCount() { return Math.max(1, state.participants.length); }

function renderExpenseOwners(selected = els.expenseOwner.value || "공통") {
  const owners = ["공통", ...state.participants];
  if (selected && !owners.includes(selected)) owners.push(selected);
  els.expenseOwner.innerHTML = owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("");
  els.expenseOwner.value = owners.includes(selected) ? selected : "공통";
  els.expensePerPersonLabel.textContent = `인당 금액 × ${participantCount()}명`;
}

function expenseTotal(expense) { return expense.perPerson ? expense.amount * participantCount() : expense.amount; }
function expenseCurrency(expense) { return expense.currency === "KRW" ? "KRW" : "JPY"; }
function expenseTotalYen(expense) {
  const total = expenseTotal(expense);
  return expenseCurrency(expense) === "KRW" ? total / (state.exchangeRate?.rate || 9) : total;
}
function expenseTotalWon(expense) {
  const total = expenseTotal(expense);
  return expenseCurrency(expense) === "KRW" ? total : total * (state.exchangeRate?.rate || 9);
}
function formatYen(value) { return `¥${Math.round(value).toLocaleString("ko-KR")}`; }
function formatWon(value) { return `₩${Math.round(value).toLocaleString("ko-KR")}`; }
function dualCurrency(yen) {
  const rate = state.exchangeRate?.rate;
  return `${formatYen(yen)}${rate ? ` · 약 ${formatWon(yen * rate)}` : ""}`;
}
function dualExpenseCurrency(amount, currency) {
  const rate = state.exchangeRate?.rate;
  if (currency === "KRW") return `${formatWon(amount)}${rate ? ` · 약 ${formatYen(amount / rate)}` : ""}`;
  return dualCurrency(amount);
}

function ledgerExpenseDisplay(expense) {
  const total = expenseTotal(expense);
  const amount = ledgerPerPersonMode ? total / participantCount() : total;
  return `<strong>${ledgerPerPersonMode ? "1인당 " : "총 "}${dualExpenseCurrency(amount, expenseCurrency(expense))}</strong>`;
}

function budgetPercent(spent, budget) {
  if (!budget) return "0%";
  return `${Math.round(spent / budget * 100)}%`;
}

function parseFormattedNumber(value) {
  return Math.max(0, Number(String(value ?? "").replace(/[^0-9]/g, "")) || 0);
}

function formattedNumber(value) {
  const amount = parseFormattedNumber(value);
  return amount ? amount.toLocaleString("ko-KR") : "";
}

function formatNumberInput(input) {
  input.value = formattedNumber(input.value);
}

function distributeDayBudgets() {
  const manualDays = state.budgets.manualDays;
  const fixedTotal = state.budgets.days.reduce((sum, value, index) => sum + (manualDays[index] ? value : 0), 0);
  const autoIndexes = manualDays.map((manual, index) => manual ? -1 : index).filter((index) => index >= 0);
  const remaining = Math.max(0, state.budgets.total - fixedTotal);
  const base = autoIndexes.length ? Math.floor(remaining / autoIndexes.length) : 0;
  let remainder = remaining - base * autoIndexes.length;
  autoIndexes.forEach((index) => {
    state.budgets.days[index] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });
}

function updateBudget(type, key, value) {
  const amount = parseFormattedNumber(value);
  if (type === "total") {
    state.budgets.total = amount;
    distributeDayBudgets();
  }
  if (type === "day") {
    state.budgets.days[key] = amount;
    state.budgets.manualDays[key] = amount > 0;
    distributeDayBudgets();
  }
  if (type === "category") state.budgets.categories[key] = amount;
  saveState();
  renderLedger();
}

function expenseCategories() {
  return state.budgets.categoryOrder?.length ? state.budgets.categoryOrder : Object.keys(state.budgets.categories);
}

function addBudgetCategory() {
  const name = prompt("추가할 예산 항목 이름을 입력하세요.")?.trim();
  if (!name) return;
  if (expenseCategories().includes(name)) return alert("이미 있는 항목입니다.");
  state.budgets.categoryOrder.push(name);
  state.budgets.categories[name] = 0;
  saveState();
  renderLedger();
}

function removeBudgetCategory(name) {
  const categories = expenseCategories();
  const usedCount = state.expenses.filter((expense) => expense.category === name).length;
  const fallback = categories.find((category) => category !== name);
  if (usedCount && !fallback) return alert("이 항목의 지출 내역이 있어 마지막 항목으로는 삭제할 수 없습니다. 다른 항목을 먼저 추가해 주세요.");
  const message = usedCount ? `${name} 항목을 삭제하면 기존 지출 ${usedCount}건은 ${fallback} 항목으로 이동합니다. 삭제할까요?` : `${name} 항목을 삭제할까요?`;
  if (!confirm(message)) return;
  state.expenses.forEach((expense) => { if (expense.category === name && fallback) expense.category = fallback; });
  state.budgets.categoryOrder = categories.filter((category) => category !== name);
  delete state.budgets.categories[name];
  if (activeExpenseCategoryFilter === name) activeExpenseCategoryFilter = null;
  saveState();
  renderLedger();
}

function renderBudgetInputs() {
  els.totalBudgetInput.value = formattedNumber(state.budgets.total);
  els.dayBudgetInputs.innerHTML = ["0일차", ...state.days.map((_, index) => `${index + 1}일차`)].map((label, index) => `<label><span>${label} 예산${state.budgets.manualDays[index] ? " · 직접" : " · 자동"}</span><span class="budget-input"><input data-budget-day="${index}" data-formatted-number type="text" inputmode="numeric" value="${formattedNumber(state.budgets.days[index])}" placeholder="미설정" /><b>원</b></span></label>`).join("");
  els.categoryBudgetInputs.innerHTML = expenseCategories().map((category) => `<div class="budget-category-item"><label><span>${escapeHtml(category)} 예산</span><span class="budget-input"><input data-budget-category="${escapeHtml(category)}" data-formatted-number type="text" inputmode="numeric" value="${formattedNumber(state.budgets.categories[category])}" placeholder="미설정" /><b>원</b></span></label><button type="button" data-budget-category-remove="${escapeHtml(category)}" aria-label="${escapeHtml(category)} 항목 삭제">×</button></div>`).join("");
  const assigned = state.budgets.days.reduce((sum, value) => sum + value, 0);
  els.unallocatedBudget.textContent = state.budgets.total ? `미배정 ${formatWon(Math.max(0, state.budgets.total - assigned))}` : "";
}

function renderLedger() {
  if (!els.ledgerTotal) return;
  const selectedExpenseDay = els.expenseDay.value;
  const selectedExpenseCategory = els.expenseCategory.value;
  els.expenseDay.innerHTML = `<option value="-1">0일차</option>${state.days.map((_, index) => `<option value="${index}">${index + 1}일차</option>`).join("")}`;
  els.expenseDay.value = [...els.expenseDay.options].some((option) => option.value === selectedExpenseDay) ? selectedExpenseDay : String(state.activeDay);
  els.expenseCategory.innerHTML = expenseCategories().map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  els.expenseCategory.value = expenseCategories().includes(selectedExpenseCategory) ? selectedExpenseCategory : (expenseCategories()[0] || "");
  renderExpenseOwners();
  const commonExpenses = state.expenses.filter((expense) => !expense.owner || expense.owner === "공통");
  const summaryExpenses = activeExpenseDayFilter === null
    ? commonExpenses
    : commonExpenses.filter((expense) => expense.dayIndex === activeExpenseDayFilter);
  const total = summaryExpenses.reduce((sum, expense) => sum + expenseTotalYen(expense), 0);
  const displayTotal = ledgerPerPersonMode ? total / participantCount() : total;
  const selectedDayLabel = activeExpenseDayFilter === null ? "" : `${activeExpenseDayFilter < 0 ? 0 : activeExpenseDayFilter + 1}일차 `;
  els.ledgerTotalLabel.textContent = ledgerPerPersonMode ? `${selectedDayLabel}1인당 공통 경비` : `${selectedDayLabel}공통 총경비`;
  els.ledgerTotal.textContent = dualCurrency(displayTotal);
  els.ledgerAmountToggle.textContent = ledgerPerPersonMode ? "총액 보기" : "1인당 보기";
  const spentWon = summaryExpenses.reduce((sum, expense) => sum + expenseTotalWon(expense), 0);
  const totalBudget = activeExpenseDayFilter === null
    ? state.budgets.total
    : state.budgets.days[activeExpenseDayFilter + 1] || 0;
  els.ledgerBudgetStatus.textContent = totalBudget ? `예산 ${formatWon(totalBudget)} · 잔액 ${formatWon(Math.max(0, totalBudget - spentWon))} · ${budgetPercent(spentWon, totalBudget)} 사용` : "예산을 입력하면 잔액과 사용률이 표시됩니다.";
  els.exchangeRateText.textContent = state.exchangeRate?.rate
    ? `100엔 ≈ ${formatWon(state.exchangeRate.rate * 100)} · ${state.exchangeRate.date || "최근"} 기준`
    : "환율을 불러오지 못해 엔화만 표시합니다.";
  renderRanking();
  renderBudgetInputs();
  els.dailyExpenseSummary.innerHTML = [-1, ...state.days.map((_, index) => index)].map((dayIndex) => {
    const dayTotal = commonExpenses.filter((item) => item.dayIndex === dayIndex).reduce((sum, item) => sum + expenseTotalYen(item), 0);
    const daySpentWon = commonExpenses.filter((item) => item.dayIndex === dayIndex).reduce((sum, item) => sum + expenseTotalWon(item), 0);
    const dayBudget = state.budgets.days[dayIndex + 1] || 0;
    const active = activeExpenseDayFilter === dayIndex;
    return `<button type="button" class="daily-expense-filter ${active ? "active" : ""}" data-expense-day-filter="${dayIndex}" aria-pressed="${active}"><span>${dayIndex < 0 ? "0일차" : `${dayIndex + 1}일차`}</span><strong>${dualCurrency(dayTotal)}</strong>${dayBudget ? `<small>잔액 ${formatWon(Math.max(0, dayBudget - daySpentWon))} · ${budgetPercent(daySpentWon, dayBudget)}</small>` : ""}</button>`;
  }).join("") + `<button type="button" class="day-add-button ledger-category-add" data-budget-category-add>+ 항목</button>`;
  els.dailyExpenseSummary.querySelectorAll("[data-expense-day-filter]").forEach((button) => button.addEventListener("click", () => {
    const dayIndex = Number(button.dataset.expenseDayFilter);
    activeExpenseDayFilter = activeExpenseDayFilter === dayIndex ? null : dayIndex;
    renderLedger();
  }));
  let visibleExpenses = activeExpenseDayFilter === null
    ? commonExpenses
    : commonExpenses.filter((expense) => expense.dayIndex === activeExpenseDayFilter);
  if (activeExpenseCategoryFilter) visibleExpenses = visibleExpenses.filter((expense) => expense.category === activeExpenseCategoryFilter);
  els.categoryExpenseSummary.innerHTML = expenseCategories().map((category) => {
    const scopedExpenses = activeExpenseDayFilter === null ? commonExpenses : commonExpenses.filter((expense) => expense.dayIndex === activeExpenseDayFilter);
    const categoryExpenses = scopedExpenses.filter((item) => item.category === category);
    const categoryTotal = categoryExpenses.reduce((sum, item) => sum + expenseTotalYen(item), 0);
    const categoryWon = categoryExpenses.reduce((sum, item) => sum + expenseTotalWon(item), 0);
    const categoryBudget = state.budgets.categories[category] || 0;
    const active = activeExpenseCategoryFilter === category;
    return `<button type="button" class="${active ? "active" : ""}" data-expense-category-filter="${escapeHtml(category)}"><span>${escapeHtml(category)}</span><strong>${dualCurrency(categoryTotal)}</strong>${categoryBudget ? `<small>잔액 ${formatWon(Math.max(0, categoryBudget - categoryWon))} · ${budgetPercent(categoryWon, categoryBudget)}</small>` : ""}</button>`;
  }).join("");
  els.categoryExpenseSummary.querySelectorAll("[data-expense-category-filter]").forEach((button) => button.addEventListener("click", () => {
    activeExpenseCategoryFilter = activeExpenseCategoryFilter === button.dataset.expenseCategoryFilter ? null : button.dataset.expenseCategoryFilter;
    renderLedger();
  }));
  if (!visibleExpenses.length) {
    els.expenseList.innerHTML = `<div class="wishlist-empty">${activeExpenseDayFilter === null ? "아직 기록된 공통 지출이 없습니다." : "이 일차에 기록된 공통 지출이 없습니다."}</div>`;
    return;
  }
  els.expenseList.innerHTML = [...visibleExpenses].sort((a, b) => a.dayIndex - b.dayIndex).map((expense) => `
    <article class="expense-card">
      <div class="expense-card-head"><span>${expense.dayIndex < 0 ? "0일차" : `${expense.dayIndex + 1}일차`} · ${escapeHtml(expense.category)} · ${escapeHtml(expense.owner || "공통")}</span><div><button data-expense-edit="${expense.id}">수정</button><button data-expense-remove="${expense.id}" aria-label="지출 삭제">×</button></div></div>
      <strong>${escapeHtml(expense.place || expense.title)}</strong>
      ${expense.place ? `<small>${escapeHtml(expense.title)}</small>` : ""}
      <div class="expense-amount">${ledgerExpenseDisplay(expense)}</div>
      ${expense.note ? `<p>${escapeHtml(expense.note)}</p>` : ""}
    </article>`).join("");
  els.expenseList.querySelectorAll("[data-expense-remove]").forEach((button) => button.addEventListener("click", () => {
    state.expenses = state.expenses.filter((expense) => String(expense.id) !== button.dataset.expenseRemove);
    saveState(); renderLedger();
  }));
  els.expenseList.querySelectorAll("[data-expense-edit]").forEach((button) => button.addEventListener("click", () => editExpense(button.dataset.expenseEdit)));
}

function renderRanking() {
  if (activeRankingPerson && !state.participants.includes(activeRankingPerson)) activeRankingPerson = null;
  const ranking = state.participants.map((name, participantIndex) => ({
    name,
    participantIndex,
    total: state.expenses.filter((expense) => expense.owner === name).reduce((sum, expense) => sum + expenseTotalWon(expense), 0),
  })).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...ranking.map((item) => item.total));
  els.rankingList.innerHTML = ranking.length ? ranking.map((item, index) => `
    <div class="ranking-row ${activeRankingPerson === item.name ? "active" : ""}">
      <button type="button" class="ranking-person-main" data-ranking-person="${escapeHtml(item.name)}"><span class="ranking-number">${index + 1}</span><div><strong>${escapeHtml(item.name)}</strong><span class="ranking-bar"><i style="width:${Math.round(item.total / max * 100)}%"></i></span></div><b>${formatWon(item.total)}</b></button>
      <div class="ranking-person-actions"><button type="button" data-participant-edit="${item.participantIndex}" aria-label="${escapeHtml(item.name)} 이름 수정">수정</button><button type="button" data-participant-remove="${item.participantIndex}" aria-label="${escapeHtml(item.name)} 삭제">×</button></div>
    </div>`).join("") : `<div class="ranking-empty">여행자를 추가해 주세요.</div>`;
  els.rankingList.querySelectorAll("[data-ranking-person]").forEach((button) => button.addEventListener("click", () => {
    activeRankingPerson = button.dataset.rankingPerson;
    renderRanking();
    openExpenseFormForOwner(activeRankingPerson);
  }));
  els.rankingList.querySelectorAll("[data-participant-edit]").forEach((button) => button.addEventListener("click", () => renameParticipant(Number(button.dataset.participantEdit))));
  els.rankingList.querySelectorAll("[data-participant-remove]").forEach((button) => button.addEventListener("click", () => removeParticipant(Number(button.dataset.participantRemove))));
  if (!activeRankingPerson) {
    els.rankingDetails.classList.add("hidden");
    els.rankingDetails.innerHTML = "";
    return;
  }
  const details = state.expenses.filter((expense) => expense.owner === activeRankingPerson).sort((a, b) => a.dayIndex - b.dayIndex);
  els.rankingDetails.classList.remove("hidden");
  els.rankingDetails.innerHTML = `<div class="ranking-detail-head"><strong>${escapeHtml(activeRankingPerson)} 지출 내역</strong><span>${details.length}건</span></div>${details.length ? details.map((expense) => `
    <article class="ranking-expense"><div><span>${expense.dayIndex < 0 ? "0일차" : `${expense.dayIndex + 1}일차`} · ${escapeHtml(expense.category)}</span><strong>${escapeHtml(expense.place || expense.title)}</strong>${expense.place ? `<small>${escapeHtml(expense.title)}</small>` : ""}</div><b>${dualExpenseCurrency(expenseTotal(expense), expenseCurrency(expense))}</b><div><button data-person-expense-edit="${expense.id}">수정</button><button data-person-expense-remove="${expense.id}">×</button></div></article>`).join("") : `<div class="ranking-empty">아직 개인 지출이 없습니다.</div>`}`;
  els.rankingDetails.querySelectorAll("[data-person-expense-edit]").forEach((button) => button.addEventListener("click", () => editExpense(button.dataset.personExpenseEdit)));
  els.rankingDetails.querySelectorAll("[data-person-expense-remove]").forEach((button) => button.addEventListener("click", () => {
    state.expenses = state.expenses.filter((expense) => String(expense.id) !== button.dataset.personExpenseRemove);
    saveState(); renderLedger();
  }));
}

function openExpenseFormForOwner(owner) {
  editingExpenseId = null;
  els.expenseForm.reset();
  renderExpenseOwners(owner);
  populateExpensePlaces();
  els.expenseDay.value = String(state.activeDay);
  els.expenseOwner.value = owner;
  els.expenseCurrency.value = "JPY";
  els.expenseCurrencyUnit.textContent = "엔";
  els.expenseForm.classList.remove("hidden");
  els.expenseForm.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => els.expenseTitle.focus(), 350);
}

function addParticipant() {
  const name = prompt("추가할 여행자 이름을 입력하세요.")?.trim();
  if (!name) return;
  if (name === "공통" || state.participants.includes(name)) return alert("이미 사용 중인 이름입니다.");
  state.participants.push(name);
  saveState();
  renderLedger();
}

function renameParticipant(index) {
  const oldName = state.participants[index];
  if (!oldName) return;
  const name = prompt("새 이름을 입력하세요.", oldName)?.trim();
  if (!name || name === oldName) return;
  if (name === "공통" || state.participants.some((participant, participantIndex) => participantIndex !== index && participant === name)) return alert("이미 사용 중인 이름입니다.");
  state.participants[index] = name;
  state.expenses.forEach((expense) => { if (expense.owner === oldName) expense.owner = name; });
  if (activeRankingPerson === oldName) activeRankingPerson = name;
  saveState();
  renderLedger();
}

function removeParticipant(index) {
  const name = state.participants[index];
  if (!name) return;
  const expenseCount = state.expenses.filter((expense) => expense.owner === name).length;
  const message = expenseCount
    ? `${name}님을 삭제하면 기존 지출 ${expenseCount}건은 공통 지출로 변경됩니다. 삭제할까요?`
    : `${name}님을 삭제할까요?`;
  if (!confirm(message)) return;
  state.participants.splice(index, 1);
  state.expenses.forEach((expense) => { if (expense.owner === name) expense.owner = "공통"; });
  if (activeRankingPerson === name) activeRankingPerson = null;
  saveState();
  renderLedger();
}

function placeRatingsMarkup(place, tabelogAttribute = "data-tabelog-url") {
  const googleRating = place.rating ? `<span class="place-rating" title="Google 평점">★ ${Number(place.rating).toFixed(1)}</span>` : "";
  const tabelogRating = place.tabelogRating ? `<span class="tabelog-rating" ${place.tabelogUrl ? `${tabelogAttribute}="${escapeHtml(place.tabelogUrl)}" role="link" tabindex="0" title="타베로그에서 보기" aria-label="타베로그 평점 ${Number(place.tabelogRating).toFixed(1)}, 상세 페이지 열기"` : ""}>${Number(place.tabelogRating).toFixed(1)}</span>` : "";
  return googleRating || tabelogRating ? `<span class="place-ratings">${googleRating}${tabelogRating}</span>` : "";
}

function serializeOpeningHours(hours) {
  if (!hours) return null;
  return {
    weekdayDescriptions: Array.isArray(hours.weekdayDescriptions) ? [...hours.weekdayDescriptions] : [],
    periods: Array.isArray(hours.periods) ? hours.periods.map((period) => ({
      open: period.open ? { day: period.open.day, hour: period.open.hour, minute: period.open.minute } : null,
      close: period.close ? { day: period.close.day, hour: period.close.hour, minute: period.close.minute } : null,
    })) : [],
  };
}

function openingHoursTags(place) {
  if (!place.openingHoursChecked) return "";
  const descriptions = place.openingHours?.weekdayDescriptions || [];
  if (!descriptions.length) return `<span class="place-detail-tag hours unknown">영업시간 미등록</span>`;
  const japanWeekday = new Intl.DateTimeFormat("ko-KR", { weekday: "long", timeZone: "Asia/Tokyo" }).format(new Date());
  const today = descriptions.find((description) => description.startsWith(japanWeekday)) || "";
  const todayHours = today.replace(/^[^:：]+[:：]\s*/, "").trim();
  const closedDays = descriptions.filter((description) => /휴무|closed/i.test(description)).map((description) => description.split(/[:：]/)[0].replace("요일", ""));
  const todayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Tokyo" }).format(new Date()),
  );
  const todayPeriods = (place.openingHours?.periods || []).filter((period) => period.open?.day === todayIndex);
  const closing = todayPeriods.map((period) => period.close).filter(Boolean).at(-1);
  const compactClosing = closing
    ? `${closing.hour < 12 ? "AM" : "PM"} ${closing.hour % 12 || 12}시${closing.minute ? ` ${closing.minute}분` : ""} 마감`
    : todayPeriods.some((period) => period.open && !period.close)
      ? "24시간 영업"
      : "";
  const fallbackTimes = [...todayHours.matchAll(/(오전|오후)\s*(\d{1,2})(?::(\d{2}))?/g)];
  const fallbackClosing = fallbackTimes.length
    ? `${fallbackTimes.at(-1)[1] === "오전" ? "AM" : "PM"} ${Number(fallbackTimes.at(-1)[2])}시${Number(fallbackTimes.at(-1)[3] || 0) ? ` ${Number(fallbackTimes.at(-1)[3])}분` : ""} 마감`
    : "";
  const hoursText = /휴무|closed/i.test(todayHours) ? "오늘 휴일" : compactClosing || fallbackClosing || (todayHours ? "영업시간 확인" : "영업시간 미등록");
  const hoursTag = `<span class="place-detail-tag hours">${escapeHtml(hoursText)}</span>`;
  const closedTag = closedDays.length ? `<span class="place-detail-tag closed">${escapeHtml(closedDays.join("·"))} 휴일</span>` : "";
  return hoursTag + closedTag;
}

function reservationStatusMarkup(place, includeCategory = true) {
  const category = includeCategory ? `<span class="place-detail-tag category">${escapeHtml(place.category || (place.isHotel ? "숙소" : "미분류"))}</span>` : "";
  const reservation = typeof place.isReservable === "boolean"
    ? `<span class="place-detail-tag ${place.isReservable ? "positive" : "negative"}">${place.isReservable ? "예약가능" : "예약불가"}</span>`
    : "";
  const cardKnown = typeof place.acceptsCreditCards === "boolean" || place.acceptsCashOnly === true;
  const acceptsCard = place.acceptsCreditCards === true && place.acceptsCashOnly !== true;
  const payment = cardKnown ? `<span class="place-detail-tag ${acceptsCard ? "positive" : "negative"}">${acceptsCard ? "카드O" : "카드X"}</span>` : "";
  const hours = openingHoursTags(place);
  return `<div class="place-detail-tags" aria-label="장소 종류, 예약, 결제 및 영업 정보">${category}${reservation}${payment}${hours}</div>`;
}

function renderWishlist() {
  els.wishlistCount.textContent = `${state.wishlist.length}곳`;
  const categories = ["전체", ...new Set(state.wishlist.map((place) => place.category || "미분류"))];
  if (!categories.includes(activeCategory)) activeCategory = "전체";
  els.categoryFilters.innerHTML = categories.map((category) => `<button class="category-filter ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
  els.categoryFilters.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    wishlistPage = 1;
    renderWishlist();
  }));
  els.wishlistViewFilters.querySelectorAll("[data-wishlist-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.wishlistView === wishlistViewMode);
    button.onclick = () => {
      wishlistViewMode = button.dataset.wishlistView;
      wishlistPage = 1;
      renderWishlist();
    };
  });
  if (!state.wishlist.length) {
    els.wishlist.innerHTML = `<div class="wishlist-empty">장소를 검색한 뒤 ‘갈 곳 리스트에 저장’을 눌러보세요.</div>`;
    els.wishlistPagination.classList.add("hidden");
    return;
  }
  let visiblePlaces = state.wishlist.map((place, index) => ({ place, index })).filter(({ place }) => activeCategory === "전체" || place.category === activeCategory);
  if (wishlistViewMode === "FAVORITES") visiblePlaces = visiblePlaces.filter(({ place }) => place.isFavorite);
  if (wishlistViewMode === "RATING") visiblePlaces.sort((a, b) => (Number(b.place.rating) || -1) - (Number(a.place.rating) || -1));
  if (wishlistViewMode === "TABELOG") visiblePlaces.sort((a, b) => (Number(b.place.tabelogRating) || -1) - (Number(a.place.tabelogRating) || -1));
  if (wishlistViewMode === "HOTEL_DISTANCE") visiblePlaces.sort((a, b) => wishlistHotelMinutes(a.place) - wishlistHotelMinutes(b.place));
  if (!visiblePlaces.length) {
    const emptyMessage = wishlistViewMode === "FAVORITES" ? "이 종류에는 즐겨찾기한 장소가 없습니다." : "이 조건에 맞는 장소가 없습니다.";
    els.wishlist.innerHTML = `<div class="wishlist-empty">${emptyMessage}</div>`;
    els.wishlistPagination.classList.add("hidden");
    return;
  }
  const pageSize = window.matchMedia("(min-width: 1100px)").matches ? 8 : 7;
  const pageCount = Math.ceil(visiblePlaces.length / pageSize);
  wishlistPage = Math.min(pageCount, Math.max(1, wishlistPage));
  const pagePlaces = visiblePlaces.slice((wishlistPage - 1) * pageSize, wishlistPage * pageSize);
  els.wishlist.innerHTML = pagePlaces.map(({ place, index }) => {
    return `
    <article class="wishlist-card">
      ${place.photoUri ? `<img class="wishlist-photo" src="${escapeHtml(place.photoUri)}" alt="" loading="lazy" />` : `<div class="wishlist-photo placeholder">${escapeHtml((place.category || "장소").slice(0, 2))}</div>`}
      <div class="wishlist-copy">
        <button data-wishlist-search="${index}" class="place-link"><strong><span class="place-name">${escapeHtml(place.name)}</span><span class="place-ratings">${place.rating ? `<span class="place-rating">★ ${Number(place.rating).toFixed(1)}</span>` : ""}${place.tabelogRating ? `<span class="tabelog-rating" ${place.tabelogUrl ? `data-tabelog-url="${escapeHtml(place.tabelogUrl)}" role="link" tabindex="0" title="타베로그에서 보기" aria-label="타베로그 평점 ${Number(place.tabelogRating).toFixed(1)}, 상세 페이지 열기"` : ""}>${Number(place.tabelogRating).toFixed(1)}</span>` : ""}</span></strong></button>
        <div class="category-line"><span>${escapeHtml(place.category || "미분류")}</span><button data-category-edit="${index}">수정</button></div>
        <small>${distanceSummary(place)}</small>
        <small class="address-line">${escapeHtml(place.address || "주소 정보 없음")}</small>
        ${reservationStatusMarkup(place, false)}
      </div>
      <button class="favorite-button ${place.isFavorite ? "active" : ""}" data-favorite="${index}" aria-label="${place.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}">${place.isFavorite ? "♥" : "♡"}</button>
      <button class="wishlist-remove" data-wishlist-remove="${index}" aria-label="장소 삭제">×</button>
    </article>`;
  }).join("");
  els.wishlistPagination.classList.toggle("hidden", pageCount <= 1);
  els.wishlistPagination.innerHTML = pageCount > 1 ? Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return `<button class="${page === wishlistPage ? "active" : ""}" data-wishlist-page="${page}" aria-label="${page}페이지" aria-current="${page === wishlistPage ? "page" : "false"}">${page}</button>`;
  }).join("") : "";
  els.wishlistPagination.querySelectorAll("[data-wishlist-page]").forEach((button) => button.addEventListener("click", () => {
    wishlistPage = Number(button.dataset.wishlistPage);
    renderWishlist();
    els.categoryFilters.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  els.wishlist.querySelectorAll("[data-wishlist-remove]").forEach((button) => button.addEventListener("click", () => {
    state.wishlist.splice(Number(button.dataset.wishlistRemove), 1);
    saveState();
    render();
  }));
  els.wishlist.querySelectorAll("[data-wishlist-search]").forEach((button) => button.addEventListener("click", () => {
    const place = state.wishlist[Number(button.dataset.wishlistSearch)];
    window.open(googlePlaceUrl(place), "_blank", "noopener");
  }));
  els.wishlist.querySelectorAll("[data-tabelog-url]").forEach((badge) => {
    const openTabelog = (event) => {
      event.stopPropagation();
      window.open(badge.dataset.tabelogUrl, "_blank", "noopener");
    };
    badge.addEventListener("click", openTabelog);
    badge.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTabelog(event);
    });
  });
  els.wishlist.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", () => {
    const place = state.wishlist[Number(button.dataset.favorite)];
    place.isFavorite = !place.isFavorite;
    saveState();
    render();
    drawMap();
  }));
  els.wishlist.querySelectorAll("[data-category-edit]").forEach((button) => button.addEventListener("click", () => {
    const place = state.wishlist[Number(button.dataset.categoryEdit)];
    const value = prompt("음식 종류를 입력하세요. (예: 라멘, 쿠시카츠)", place.category || "");
    if (!value?.trim()) return;
    place.category = value.trim();
    state.days.flatMap((day) => day.stops).filter((stop) => !stop.isHotel && !stop.isHotelReturn && stop.placeId === place.placeId).forEach((stop) => { stop.category = place.category; });
    activeCategory = place.category;
    saveState();
    render();
  }));
}

function wishlistHotelMinutes(place) {
  const minutes = Number(place.distanceInfo?.hotelMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : Number.POSITIVE_INFINITY;
}

function distanceSummary(place) {
  const info = place.distanceInfo;
  if (!info) return `<span class="distance-loading">거리 확인 중…</span>`;
  const parts = [];
  if (info.stationMinutes) parts.push(`<span class="distance-line">${escapeHtml(info.stationName)}에서 도보 ${info.stationMinutes}분${info.stationMeters ? ` · ${formatDistance(info.stationMeters)}` : ""}</span>`);
  if (info.region === "OSAKA" && info.hotelMinutes) parts.push(`<span class="distance-line">숙소에서 도보 ${info.hotelMinutes}분${info.hotelMeters ? ` · ${formatDistance(info.hotelMeters)}` : ""}</span>`);
  return parts.length ? parts.join("") : "도보 거리 확인 필요";
}

function openCandidateDialog(stopIndex = null) {
  replacementTargetStopIndex = null;
  els.stopEditTabs.classList.add("hidden");
  alternativeTargetStopIndex = Number.isInteger(stopIndex) ? stopIndex : null;
  if (alternativeTargetStopIndex !== null) {
    activeRouteCategory = state.stops[alternativeTargetStopIndex]?.category || "전체";
  }
  els.candidateDialogTitle.textContent = alternativeTargetStopIndex === null ? "즐겨찾기 후보" : `${state.stops[alternativeTargetStopIndex]?.name || "일정"} 후보 추가`;
  els.candidateDialogHint.textContent = alternativeTargetStopIndex === null
    ? `${state.activeDay + 1}일차에 넣을 순서만 선택하세요.`
    : "선택한 장소가 2순위, 3순위 후보로 이어서 추가됩니다.";
  renderRouteCandidates();
  els.candidateDialog.showModal();
}

function openStopEditDialog(index) {
  const stop = state.stops[index];
  if (!stop || stop.isFixed || stop.isHotel || stop.isHotelReturn) return;
  movingStop = { dayIndex: state.activeDay, index };
  replacementInFlight = false;
  replacementTargetStopIndex = index;
  alternativeTargetStopIndex = null;
  activeRouteCategory = stop.category || "전체";
  els.stopEditTabs.classList.remove("hidden");
  els.stopEditTabs.querySelectorAll("[data-stop-edit-tab]").forEach((button) => button.classList.toggle("active", button.dataset.stopEditTab === "PLACE"));
  els.candidateDialogTitle.textContent = `${stop.name} 수정`;
  els.candidateDialogHint.textContent = "즐겨찾기 후보에서 바꿀 장소를 선택하세요.";
  renderRouteCandidates();
  els.candidateDialog.showModal();
}

function compactCandidateTags(place) {
  const tags = [`<span class="candidate-tag category">${escapeHtml(place.category || "미분류")}</span>`];
  if (place.isReservable === true) tags.push(`<span class="candidate-tag">예약 가능</span>`);
  if (place.acceptsCreditCards === true) tags.push(`<span class="candidate-tag">카드 O</span>`);
  else if (place.acceptsCashOnly === true) tags.push(`<span class="candidate-tag">현금만</span>`);
  const periods = place.openingHours?.periods || [];
  const closing = periods.map((period) => period.close).filter(Boolean).at(-1);
  if (closing) tags.push(`<span class="candidate-tag">${String(closing.hour).padStart(2, "0")}:${String(closing.minute || 0).padStart(2, "0")} 마감</span>`);
  return tags.join("");
}

function renderRouteCandidates() {
  const favorites = state.wishlist.map((place, index) => ({ place, index })).filter(({ place }) => place.isFavorite);
  els.favoriteCount.textContent = `${favorites.length}곳`;
  const categories = ["전체", ...new Set(favorites.map(({ place }) => place.category || "미분류"))];
  if (!categories.includes(activeRouteCategory)) activeRouteCategory = "전체";
  els.routeCandidateFilters.innerHTML = categories.map((category) => `<button type="button" class="${category === activeRouteCategory ? "active" : ""}" data-route-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
  els.routeCandidateFilters.querySelectorAll("[data-route-category]").forEach((button) => button.addEventListener("click", () => {
    activeRouteCategory = button.dataset.routeCategory;
    renderRouteCandidates();
  }));
  els.candidateViewFilters.querySelectorAll("[data-candidate-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.candidateView === candidateViewMode);
    button.onclick = () => {
      candidateViewMode = button.dataset.candidateView;
      renderRouteCandidates();
    };
  });
  if (!favorites.length) {
    els.routeCandidates.innerHTML = `<div class="wishlist-empty">리스트 탭에서 ♥를 누르면 여기에 나타납니다.</div>`;
    return;
  }
  let visibleFavorites = activeRouteCategory === "전체" ? [...favorites] : favorites.filter(({ place }) => (place.category || "미분류") === activeRouteCategory);
  if (replacementTargetStopIndex !== null) {
    const currentPlaceId = state.stops[replacementTargetStopIndex]?.placeId;
    visibleFavorites = visibleFavorites.filter(({ place }) => !currentPlaceId || place.placeId !== currentPlaceId);
  }
  if (candidateViewMode === "FAVORITES") visibleFavorites = visibleFavorites.filter(({ place }) => place.isFavorite);
  if (candidateViewMode === "RATING") visibleFavorites.sort((a, b) => (Number(b.place.rating) || -1) - (Number(a.place.rating) || -1));
  if (candidateViewMode === "TABELOG") visibleFavorites.sort((a, b) => (Number(b.place.tabelogRating) || -1) - (Number(a.place.tabelogRating) || -1));
  if (candidateViewMode === "HOTEL_DISTANCE") visibleFavorites.sort((a, b) => wishlistHotelMinutes(a.place) - wishlistHotelMinutes(b.place));
  const movableCount = state.stops.filter((stop) => !stop.isFixed).length;
  els.routeCandidates.innerHTML = visibleFavorites.map(({ place, index }) => `
    <article class="route-candidate" data-route-candidate-search="${index}" role="link" tabindex="0" aria-label="${escapeHtml(place.name)} Google 지도에서 보기">
      ${place.photoUri ? `<img src="${escapeHtml(place.photoUri)}" alt="" loading="lazy" />` : `<div class="route-thumb-placeholder">${escapeHtml((place.category || "장소").slice(0, 1))}</div>`}
      <div class="route-candidate-copy"><strong><span class="place-name">${escapeHtml(place.name)}</span>${placeRatingsMarkup(place)}</strong><small>${place.distanceInfo?.hotelMinutes ? `숙소에서 도보 ${place.distanceInfo.hotelMinutes}분${place.distanceInfo.hotelMeters ? ` · ${formatDistance(place.distanceInfo.hotelMeters)}` : ""}` : "숙소 거리 확인 필요"}</small><div class="candidate-tags">${compactCandidateTags(place)}</div></div>
      ${alternativeTargetStopIndex === null && replacementTargetStopIndex === null ? `<select data-wishlist-order="${index}" aria-label="${escapeHtml(place.name)} 방문 순서">${Array.from({ length: Math.max(1, movableCount + 1) }, (_, order) => `<option value="${order + 1}">${order + 1}번째</option>`).join("")}</select>` : ""}
      <button class="wishlist-add ${replacementTargetStopIndex !== null ? "replace-button" : ""}" data-wishlist-add="${index}">${replacementTargetStopIndex !== null ? "장소 변경" : alternativeTargetStopIndex === null ? "추가" : "후보 선택"}</button>
    </article>`).join("");
  els.routeCandidates.querySelectorAll("[data-wishlist-add]").forEach((button) => button.addEventListener("click", async () => {
    const index = Number(button.dataset.wishlistAdd);
    if (replacementTargetStopIndex !== null) {
      if (replacementInFlight) return;
      replacementInFlight = true;
      const targetStopIndex = replacementTargetStopIndex;
      els.routeCandidates.querySelectorAll("[data-wishlist-add]").forEach((candidateButton) => { candidateButton.disabled = true; });
      button.textContent = "변경 중…";
      els.candidateDialog.close();
      try {
        await replaceStopFromWishlist(index, targetStopIndex);
      } finally {
        replacementInFlight = false;
      }
      return;
    } else if (alternativeTargetStopIndex !== null) {
      addWishlistAlternative(index, alternativeTargetStopIndex);
    } else {
      const order = Number(els.routeCandidates.querySelector(`[data-wishlist-order="${index}"]`)?.value || 1);
      await addWishlistToDay(index, state.activeDay, order);
    }
    els.candidateDialog.close();
  }));
  els.routeCandidates.querySelectorAll("[data-route-candidate-search]").forEach((card) => {
    const openPlace = () => window.open(googlePlaceUrl(state.wishlist[Number(card.dataset.routeCandidateSearch)]), "_blank", "noopener");
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, select, option, [data-tabelog-url]")) return;
      openPlace();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPlace();
    });
  });
  els.routeCandidates.querySelectorAll("[data-tabelog-url]").forEach((badge) => {
    const openTabelog = (event) => {
      event.stopPropagation();
      window.open(badge.dataset.tabelogUrl, "_blank", "noopener");
    };
    badge.addEventListener("click", openTabelog);
    badge.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTabelog(event);
    });
  });
}

async function replaceStopFromWishlist(wishlistIndex, stopIndex) {
  const candidate = state.wishlist[wishlistIndex];
  const current = state.stops[stopIndex];
  if (!candidate || !current || current.isFixed || current.isHotel || current.isHotelReturn) return;
  const alternatives = (Array.isArray(current.alternatives) ? current.alternatives : []).filter((place) => place.placeId !== candidate.placeId);
  state.stops[stopIndex] = {
    ...candidate,
    stayMinutes: current.stayMinutes || candidate.stayMinutes || 60,
    alternatives,
    isFixed: false,
    isHotel: false,
    isHotelReturn: false,
  };
  state.legs = [];
  replacementTargetStopIndex = null;
  movingStop = null;
  if (mapsReady) await calculateLegs();
  saveState();
  render();
  drawMap();
}

function hotelCandidates() {
  const seen = new Set();
  return [...state.days.flatMap((day) => day.stops), ...state.wishlist].filter((place) => {
    if (!place?.name || !place?.location || place.isCustom) return false;
    const key = place.placeId || `${place.name}:${place.location.lat}:${place.location.lng}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function openHotelDialog() {
  const candidates = hotelCandidates();
  if (!candidates.length) return alert("먼저 일정이나 갈 곳 리스트에 숙소 장소를 추가해 주세요.");
  els.hotelSelect.innerHTML = candidates.map((place, index) => `<option value="${index}">${escapeHtml(place.name)}</option>`).join("");
  const selectedIndex = candidates.findIndex((place) => isSamePlace(place, state.selectedHotel));
  els.hotelSelect.value = String(selectedIndex >= 0 ? selectedIndex : 0);
  els.hotelDialog.showModal();
}

async function saveHotelAndAddReturn(event) {
  event.preventDefault();
  const candidates = hotelCandidates();
  const hotel = candidates[Number(els.hotelSelect.value)];
  if (!hotel) return;
  state.selectedHotel = normalizeSelectedHotel(hotel);
  state.wishlist.forEach((place) => {
    if (place.distanceInfo) place.distanceInfo = { ...place.distanceInfo, hotelMinutes: null, hotelMeters: null };
  });
  els.hotelDialog.close();
  await addHotelReturn();
  if (mapsReady) enrichMissingWishlistInfo();
}

function bindItineraryEvents() {
  els.itinerary.querySelectorAll("[data-stop-tabelog-url]").forEach((badge) => {
    const openTabelog = (event) => {
      event.stopPropagation();
      window.open(badge.dataset.stopTabelogUrl, "_blank", "noopener");
    };
    badge.addEventListener("click", openTabelog);
    badge.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTabelog(event);
    });
  });
  els.itinerary.querySelectorAll("[data-action]").forEach((element) => {
    if (element.dataset.action === "alternative-add") {
      element.addEventListener("click", () => openCandidateDialog(Number(element.dataset.index)));
      return;
    }
    if (element.dataset.action === "alternative-search") {
      element.addEventListener("click", () => {
        const place = state.stops[Number(element.dataset.index)]?.alternatives?.[Number(element.dataset.alternativeIndex)];
        if (place) window.open(googlePlaceUrl(place), "_blank", "noopener");
      });
      return;
    }
    if (element.dataset.action === "alternative-remove") {
      element.addEventListener("click", () => {
        const stop = state.stops[Number(element.dataset.index)];
        stop?.alternatives?.splice(Number(element.dataset.alternativeIndex), 1);
        saveState();
        render();
      });
      return;
    }
    if (element.dataset.action === "manual-duration") {
      element.addEventListener("change", () => {
        const stopIndex = Number(element.dataset.index);
        const minutes = Math.max(0, Math.round(Number(element.value) || 0));
        if (element.value && !minutes) {
          alert("걸리는 시간을 분 단위 숫자로 입력해 주세요.");
          element.focus();
          return;
        }
        state.stops[stopIndex].manualTravelMinutes = minutes;
        saveState();
        render();
      });
      return;
    }
    const index = Number(element.dataset.index);
    if (element.dataset.action === "move") {
      element.addEventListener("click", () => openMoveStopDialog(index));
      return;
    }
    if (element.dataset.action === "edit-stop") {
      element.addEventListener("click", () => openStopEditDialog(index));
      return;
    }
    if (element.dataset.action === "custom-edit") {
      element.addEventListener("click", () => showCustomScheduleForm(index));
      return;
    }
    if (element.dataset.action === "remove") element.addEventListener("click", async () => {
      if (state.stops[index]?.isFixed) return;
      state.stops.splice(index, 1);
      await calculateLegs(); saveState(); render(); drawMap();
    });
    if (element.dataset.action === "stay") element.addEventListener("change", () => {
      state.stops[index].stayMinutes = Math.max(0, Number(element.value) || 0); saveState(); render();
    });
    if (element.dataset.action === "search") element.addEventListener("click", () => {
      const stop = state.stops[index];
      window.open(googlePlaceUrl(stop), "_blank", "noopener");
    });
  });
  bindStopReordering();
}

function moveInsertionBounds(dayIndex, sourceDayIndex = -1, sourceIndex = -1) {
  const stops = state.days[dayIndex].stops.filter((_, index) => dayIndex !== sourceDayIndex || index !== sourceIndex);
  let minimum = 0;
  while (stops[minimum]?.isFixed && stops[minimum]?.fixedRole !== "airport_departure") minimum += 1;
  const hotel = stops.find((stop) => stop.isHotel) || getHotelStop();
  const fixedAirportIndex = stops.findIndex((stop) => stop.fixedRole === "airport_departure");
  const hasHotelReturn = hotel && stops.length > 1 && stops.at(-1).placeId === hotel.placeId && !stops.at(-1).isHotel;
  const maximum = Math.max(minimum, fixedAirportIndex >= 0 ? fixedAirportIndex : hasHotelReturn ? stops.length - 1 : stops.length);
  return { minimum, maximum };
}

function updateMoveStopOrderOptions(preferredOrder = null) {
  if (!movingStop) return;
  const dayIndex = Number(els.moveStopDay.value);
  const { minimum, maximum } = moveInsertionBounds(dayIndex, movingStop.dayIndex, movingStop.index);
  const selected = Math.min(maximum, Math.max(minimum, preferredOrder ?? (dayIndex === movingStop.dayIndex ? movingStop.index : minimum)));
  els.moveStopOrder.innerHTML = Array.from({ length: Math.max(1, maximum - minimum + 1) }, (_, offset) => {
    const order = minimum + offset;
    return `<option value="${order}" ${order === selected ? "selected" : ""}>${order}번째</option>`;
  }).join("");
}

function openMoveStopDialog(index) {
  const stop = state.stops[index];
  if (!stop || stop.isFixed || stop.isHotel) return;
  movingStop = { dayIndex: state.activeDay, index };
  els.moveStopName.textContent = stop.name;
  els.moveStopDay.innerHTML = state.days.map((_, dayIndex) => `<option value="${dayIndex}" ${dayIndex === state.activeDay ? "selected" : ""}>${dayIndex + 1}일차</option>`).join("");
  updateMoveStopOrderOptions(index);
  els.moveStopDialog.showModal();
}

async function moveStopToSchedule(event) {
  event.preventDefault();
  if (!movingStop) return;
  const sourceDayIndex = movingStop.dayIndex;
  const destinationDayIndex = Number(els.moveStopDay.value);
  const destinationOrder = Number(els.moveStopOrder.value);
  const sourceDay = state.days[sourceDayIndex];
  const [stop] = sourceDay.stops.splice(movingStop.index, 1);
  if (!stop) return;
  const destinationDay = state.days[destinationDayIndex];
  const { minimum, maximum } = moveInsertionBounds(destinationDayIndex);
  destinationDay.stops.splice(Math.min(maximum, Math.max(minimum, destinationOrder)), 0, stop);
  sourceDay.legs = [];
  destinationDay.legs = [];
  movingStop = null;
  els.moveStopDialog.close();
  state.activeDay = destinationDayIndex;
  els.startTime.value = state.startTime;
  updateDayUi();
  if (mapsReady) await calculateLegs();
  saveState();
  render();
  drawMap();
}

async function swapStops(fromIndex, toIndex) {
  if (fromIndex === toIndex || state.stops[fromIndex]?.isFixed || state.stops[toIndex]?.isFixed) return;
  const [movedStop] = state.stops.splice(fromIndex, 1);
  state.stops.splice(toIndex, 0, movedStop);
  state.legs = [];
  await calculateLegs();
  saveState();
  render();
  drawMap();
}

function bindStopReordering() {
  const cards = [...els.itinerary.querySelectorAll(".stop-card[data-reorder-index]")];
  const useNativeDrag = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let draggedIndex = null;
  let touchTargetIndex = null;
  let longPressTimer = null;
  let pressStart = null;
  let lastPointerY = null;
  let dragHasMoved = false;
  let autoScrollFrame = null;
  const clearDragState = () => cards.forEach((card) => card.classList.remove("dragging", "drag-target"));
  const stopAutoScroll = () => {
    if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = null;
  };
  const autoScroll = () => {
    if (draggedIndex === null || lastPointerY === null || !dragHasMoved) return stopAutoScroll();
    const edge = Math.min(96, Math.max(58, window.innerHeight * .13));
    let amount = 0;
    if (lastPointerY < edge) amount = -Math.max(5, Math.round((edge - lastPointerY) / 5));
    else if (lastPointerY > window.innerHeight - edge) amount = Math.max(5, Math.round((lastPointerY - (window.innerHeight - edge)) / 5));
    if (amount) {
      window.scrollBy(0, amount);
      const target = document.elementFromPoint(window.innerWidth / 2, Math.max(1, Math.min(window.innerHeight - 1, lastPointerY)))?.closest(".stop-card[data-reorder-index]");
      if (target) {
        touchTargetIndex = Number(target.dataset.reorderIndex);
        clearDragState();
        cards.find((item) => Number(item.dataset.reorderIndex) === draggedIndex)?.classList.add("dragging");
        target.classList.add("drag-target");
      }
    }
    autoScrollFrame = requestAnimationFrame(autoScroll);
  };
  const resetTouchDrag = () => {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    pressStart = null;
    lastPointerY = null;
    dragHasMoved = false;
    draggedIndex = null;
    touchTargetIndex = null;
    stopAutoScroll();
    document.documentElement.classList.remove("stop-reorder-active");
    cards.forEach((item) => item.querySelector(".drag-handle")?.classList.remove("long-press-ready"));
    clearDragState();
  };
  cards.forEach((card) => {
    card.draggable = useNativeDrag;
    card.addEventListener("dragstart", (event) => {
      if (event.target.closest("input, button, a")) return event.preventDefault();
      draggedIndex = Number(card.dataset.reorderIndex);
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragover", (event) => {
      if (draggedIndex === null) return;
      event.preventDefault();
      clearDragState();
      card.classList.add("drag-target");
    });
    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      const fromIndex = draggedIndex;
      draggedIndex = null;
      clearDragState();
      if (fromIndex !== null) await swapStops(fromIndex, Number(card.dataset.reorderIndex));
    });
    card.addEventListener("dragend", () => { draggedIndex = null; clearDragState(); });
    const handle = card.querySelector(".drag-handle");
    handle?.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      pressStart = { x: touch.clientX, y: touch.clientY };
      lastPointerY = touch.clientY;
      longPressTimer = setTimeout(() => {
        if (!pressStart) return;
        draggedIndex = Number(card.dataset.reorderIndex);
        touchTargetIndex = draggedIndex;
        handle.classList.add("long-press-ready");
        card.classList.add("dragging");
        document.documentElement.classList.add("stop-reorder-active");
        navigator.vibrate?.(25);
      }, 480);
    }, { passive: true });
    handle?.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 1 || !pressStart) return;
      const touch = event.touches[0];
      lastPointerY = touch.clientY;
      if (draggedIndex === null) {
        if (Math.hypot(touch.clientX - pressStart.x, touch.clientY - pressStart.y) > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          pressStart = null;
        }
        return;
      }
      event.preventDefault();
      if (!dragHasMoved && Math.hypot(touch.clientX - pressStart.x, touch.clientY - pressStart.y) > 4) {
        dragHasMoved = true;
        autoScroll();
      }
      const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".stop-card[data-reorder-index]");
      if (!target) return;
      touchTargetIndex = Number(target.dataset.reorderIndex);
      clearDragState();
      card.classList.add("dragging");
      target.classList.add("drag-target");
    }, { passive: false });
    const finishTouchDrag = async () => {
      if (draggedIndex === null) return resetTouchDrag();
      const fromIndex = draggedIndex;
      const toIndex = touchTargetIndex;
      resetTouchDrag();
      if (toIndex !== null) await swapStops(fromIndex, toIndex);
    };
    handle?.addEventListener("touchend", finishTouchDrag, { passive: true });
    handle?.addEventListener("touchcancel", resetTouchDrag, { passive: true });
  });
}

function normalizeManualTime(value) {
  const digits = String(value || "").trim().replace(/[^0-9]/g, "");
  if (!digits) return "";
  const padded = digits.padStart(4, "0");
  if (padded.length !== 4) return "";
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2));
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function googlePlaceUrl(place) {
  if (place?.googleMapsURI) return place.googleMapsURI;
  const query = [place?.name, place?.address].filter(Boolean).join(" ");
  const params = new URLSearchParams({ api: "1", query });
  if (place?.placeId) params.set("query_place_id", place.placeId);
  return `https://www.google.com/maps/search/?${params}`;
}

function manualTimeToTimeline(value, currentClock) {
  const minutes = timeToMinutes(value);
  if (currentClock >= 18 * 60 && minutes < 6 * 60) return minutes + 24 * 60;
  return minutes;
}

async function optimizeNearest() {
  if (state.stops.length < 3) return;
  const fixedStart = state.stops.filter((stop, index) => stop.isFixed && index < state.stops.findIndex((item) => !item.isFixed));
  const fixedEnd = state.stops.filter((stop) => stop.fixedRole === "airport_departure");
  const movable = state.stops.filter((stop) => !fixedStart.includes(stop) && !fixedEnd.includes(stop));
  if (!fixedStart.length) fixedStart.push(movable.shift());
  const remaining = [...movable];
  const ordered = [...fixedStart];
  while (remaining.length) {
    const current = ordered.at(-1).location;
    remaining.sort((a, b) => straightDistance(current, a.location) - straightDistance(current, b.location));
    ordered.push(remaining.shift());
  }
  ordered.push(...fixedEnd);
  state.stops = ordered;
  await calculateLegs(); saveState(); render(); drawMap();
}

async function drawMap() {
  if (!mapsReady) return;
  await drawMap2d(++mapDrawVersion);
}

async function drawMap2d(drawVersion) {
  if (!map2d) return;
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  if (drawVersion !== mapDrawVersion) return;
  map2dOverlays.forEach((overlay) => {
    if (typeof overlay.setMap === "function") overlay.setMap(null);
    else overlay.map = null;
  });
  map2dOverlays = [];
  const bounds = new google.maps.LatLngBounds();
  state.stops.forEach((stop, index) => {
    if (stop.isCustom || state.mapHiddenKeys.includes(mapStopKey(stop, index))) return;
    const markerContent = document.createElement("div");
    markerContent.className = `route-marker ${stop.isHotel ? "hotel" : ""} ${stop.isFixed ? "fixed" : ""}`;
    markerContent.textContent = stop.fixedRole?.startsWith("airport") ? "A" : stop.isHotel ? "H" : String(index);
    const marker = new AdvancedMarkerElement({
      map: map2d,
      position: stop.location,
      title: stop.name,
      content: markerContent,
      gmpClickable: true,
    });
    marker.addEventListener("gmp-click", () => window.open(googlePlaceUrl(stop), "_blank", "noopener"));
    map2dOverlays.push(marker);
    bounds.extend(stop.location);
  });
  state.legs.forEach((leg, index) => {
    if (state.mapHiddenKeys.includes(mapStopKey(state.stops[index], index)) || state.mapHiddenKeys.includes(mapStopKey(state.stops[index + 1], index + 1))) return;
    const route = getLegRoute(leg);
    const legMode = getRecommendedMode(leg);
    if (!route?.path?.length) return;
    const line = new google.maps.Polyline({
      map: map2d,
      path: route.path,
      geodesic: true,
      strokeColor: legMode === "TRANSIT" ? "#356fd2" : "#5b35d5",
      strokeOpacity: .95,
      strokeWeight: 6,
      icons: legMode === "WALKING" ? [{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2.3, fillColor: "#fff", fillOpacity: 1, strokeWeight: 0 }, offset: "0", repeat: "18px" }] : undefined,
    });
    map2dOverlays.push(line);
    route.path.forEach((point) => bounds.extend(point));
  });
  const mapStops = state.stops.filter((stop, index) => !stop.isCustom && !state.mapHiddenKeys.includes(mapStopKey(stop, index)));
  if (mapStops.length === 1) {
    map2d.setCenter(mapStops[0].location);
    map2d.setZoom(16);
  } else if (mapStops.length > 1) {
    map2d.fitBounds(bounds, { top: 90, right: 70, bottom: 70, left: 70 });
  }
}

function formatDistance(meters) { return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`; }
function formatMinutes(minutes) { return minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`; }
function timeToMinutes(time) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
function formatClock(minutes) { return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function straightDistance(a, b) { const x = (a.lat - b.lat) * 111000; const y = (a.lng - b.lng) * 91000; return Math.hypot(x, y); }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
