const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const monthLabels = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const nationalFixedHolidays = [
  { month: 0, day: 1, name: "Confraternização Universal" },
  { month: 3, day: 21, name: "Tiradentes" },
  { month: 4, day: 1, name: "Dia do Trabalhador" },
  { month: 8, day: 7, name: "Independência do Brasil" },
  { month: 9, day: 12, name: "Nossa Senhora Aparecida" },
  { month: 10, day: 2, name: "Finados" },
  { month: 10, day: 15, name: "Proclamação da República" },
  { month: 11, day: 25, name: "Natal" },
];

const regionalHolidays = {
  SP: [
    { month: 0, day: 25, name: "Aniversário de São Paulo" },
    { month: 6, day: 9, name: "Revolução Constitucionalista" },
  ],
  RJ: [
    { month: 0, day: 20, name: "São Sebastião" },
    { month: 3, day: 23, name: "São Jorge" },
  ],
  MG: [{ month: 6, day: 2, name: "Dia de Minas" }],
  RS: [{ month: 8, day: 20, name: "Revolução Farroupilha" }],
};

const teamVacationBlocks = {
  dev: [
    { start: "2025-01-13", end: "2025-01-24", name: "Férias do Pedro" },
    { start: "2025-07-07", end: "2025-07-18", name: "Férias da Ana" },
  ],
  design: [
    { start: "2025-02-10", end: "2025-02-21", name: "Férias da Lu" },
    { start: "2025-09-01", end: "2025-09-12", name: "Férias do Rafa" },
  ],
  product: [
    { start: "2025-03-17", end: "2025-03-28", name: "Férias da Bea" },
    { start: "2025-11-03", end: "2025-11-14", name: "Férias do Gui" },
  ],
};

const yearSelect = document.getElementById("year");
const regionSelect = document.getElementById("region");
const roleSelect = document.getElementById("role");
const updateButton = document.getElementById("update");
const calendarContainer = document.getElementById("calendar");
const holidayList = document.getElementById("holidayList");
const validationMessage = document.getElementById("validation");
const periodInputs = Array.from(document.querySelectorAll(".period-inputs input"));

const todayYear = new Date().getFullYear();

function setupYearOptions() {
  const years = [todayYear - 1, todayYear, todayYear + 1];
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    if (year === todayYear) {
      option.selected = true;
    }
    yearSelect.append(option);
  });
}

function computeEaster(year) {
  const f = Math.floor;
  const a = year % 19;
  const b = f(year / 100);
  const c = year % 100;
  const d = f(b / 4);
  const e = b % 4;
  const g = f((8 * b + 13) / 25);
  const h = (19 * a + b - d - g + 15) % 30;
  const j = f(c / 4);
  const k = c % 4;
  const m = f((a + 11 * h) / 319);
  const r = (2 * e + 2 * j - k - h + m + 32) % 7;
  const n = f((h - m + r + 90) / 25);
  const p = (h - m + r + n + 19) % 32;
  return new Date(year, n - 1, p);
}

function getMovableHolidays(year) {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);
  const carnival = addDays(easter, -47);
  const corpusChristi = addDays(easter, 60);
  return [
    { date: easter, name: "Páscoa" },
    { date: goodFriday, name: "Sexta-feira Santa" },
    { date: carnival, name: "Carnaval" },
    { date: corpusChristi, name: "Corpus Christi" },
  ];
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function buildHolidaySet(year, region) {
  const items = [];
  nationalFixedHolidays.forEach((holiday) => {
    items.push({
      date: new Date(year, holiday.month, holiday.day),
      name: holiday.name,
    });
  });

  if (region !== "national" && regionalHolidays[region]) {
    regionalHolidays[region].forEach((holiday) => {
      items.push({
        date: new Date(year, holiday.month, holiday.day),
        name: holiday.name,
      });
    });
  }

  items.push(...getMovableHolidays(year));

  const holidayMap = new Map();
  items.forEach((item) => {
    const key = formatDate(item.date);
    if (!holidayMap.has(key)) {
      holidayMap.set(key, []);
    }
    holidayMap.get(key).push(item.name);
  });

  return holidayMap;
}

function parsePeriods() {
  const lengths = periodInputs
    .map((input) => Number(input.value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return lengths.slice(0, 3);
}

function validatePeriods(lengths) {
  if (lengths.length === 0) {
    return "Informe ao menos um período.";
  }
  if (lengths.length > 3) {
    return "Use no máximo 3 períodos.";
  }
  const hasLong = lengths.some((value) => value >= 14);
  if (!hasLong) {
    return "Um dos períodos precisa ter pelo menos 14 dias.";
  }
  const invalidShort = lengths.some((value) => value < 5);
  if (invalidShort) {
    return "Cada período precisa ter no mínimo 5 dias.";
  }
  return "";
}

function getRoleBlocks(role) {
  return (teamVacationBlocks[role] || []).map((block) => ({
    ...block,
    start: new Date(block.start),
    end: new Date(block.end),
  }));
}

function overlapsBlockedRange(startDate, length, blocks) {
  const endDate = addDays(startDate, length - 1);
  return blocks.some((block) => startDate <= block.end && endDate >= block.start);
}

function isStartAllowed(date, holidaySet) {
  const day = date.getDay();
  const isWeekStart = day >= 1 && day <= 3;
  const holidayAhead = holidaySet.has(formatDate(addDays(date, 2)));
  return isWeekStart || holidayAhead;
}

function buildCalendar(year, region, role, lengths) {
  calendarContainer.innerHTML = "";
  holidayList.innerHTML = "";

  const holidaySet = buildHolidaySet(year, region);
  const blocks = getRoleBlocks(role);

  const holidayEntries = Array.from(holidaySet.entries())
    .map(([date, names]) => ({ date, names }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  holidayEntries.forEach((holiday) => {
    const item = document.createElement("li");
    const dateObj = new Date(holiday.date);
    item.textContent = `${holiday.names.join(", ")} — ${dateObj.toLocaleDateString("pt-BR")}`;
    holidayList.append(item);
  });

  for (let month = 0; month < 12; month += 1) {
    const monthElement = document.createElement("div");
    monthElement.className = "month";

    const title = document.createElement("h3");
    title.textContent = `${monthLabels[month]} ${year}`;
    monthElement.append(title);

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "weekdays";
    weekdayLabels.forEach((label) => {
      const cell = document.createElement("div");
      cell.textContent = label;
      weekdayRow.append(cell);
    });
    monthElement.append(weekdayRow);

    const daysGrid = document.createElement("div");
    daysGrid.className = "days";

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day muted";
      daysGrid.append(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = formatDate(date);
      const cell = document.createElement("div");
      cell.className = "day";

      const number = document.createElement("div");
      number.textContent = String(day);
      cell.append(number);

      if (holidaySet.has(key)) {
        cell.classList.add("holiday");
        cell.title = holidaySet.get(key).join(", ");
      }

      const dots = document.createElement("div");
      dots.className = "dots";

      lengths.forEach((length, index) => {
        const dot = document.createElement("span");
        dot.className = `dot length-${index}`;
        const allowed = isStartAllowed(date, holidaySet);
        const blocked = overlapsBlockedRange(date, length, blocks);
        if (!allowed || blocked) {
          dot.classList.add("blocked");
        }
        dot.title = blocked
          ? "Conflito com férias do mesmo papel"
          : "Início possível";
        dots.append(dot);
      });

      cell.append(dots);
      daysGrid.append(cell);
    }

    monthElement.append(daysGrid);
    calendarContainer.append(monthElement);
  }
}

function updateCalendar() {
  const year = Number(yearSelect.value);
  const region = regionSelect.value;
  const role = roleSelect.value;
  const lengths = parsePeriods();
  const validation = validatePeriods(lengths);
  validationMessage.textContent = validation;

  if (validation) {
    calendarContainer.innerHTML = "";
    holidayList.innerHTML = "";
    return;
  }

  buildCalendar(year, region, role, lengths);
}

setupYearOptions();
updateCalendar();

updateButton.addEventListener("click", updateCalendar);
periodInputs.forEach((input) => input.addEventListener("change", updateCalendar));
regionSelect.addEventListener("change", updateCalendar);
roleSelect.addEventListener("change", updateCalendar);
yearSelect.addEventListener("change", updateCalendar);
