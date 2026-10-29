// Russian (ru): the source locale. Contract and block texts come from generated.ts: change them in
// the yaml contract and run scaffold.mjs. Add the project's own namespaces below; the other locales follow (tsc).
// Project namespaces: design D9 (base-contract). Texts marked "team" in D5/D9 are team copy, not SoW text.
import { generated } from "./generated";

export const ru = {
  ...generated.ru,
  errors: {
    UNAUTHENTICATED: "Введите пароль, чтобы открыть демо.",
    WRONG_PASSWORD: "Неверный пароль.",
    RATE_LIMITED: "Слишком много попыток. Повторите через {minutes} мин.",
    INVALID_INPUT: "Проверьте поле: {field}.",
    NOT_FOUND: "Запись не найдена. Возможно, демо было сброшено.",
    SLOT_CONFLICT: "Недостаточно свободных слотов. Конфликт: {list}.",
    CAMPAIGN_NOT_STARTED: "Кампания ещё не началась. Показы по журналу появятся после даты начала.",
    INVALID_CREATIVE: "Загрузите видео MP4 или WebM длительностью 5 секунд, до 20 МБ.",
    UNKNOWN: "Что-то пошло не так. Обновите страницу.",
  },
  status: {
    planned: "Запланирована",
    active: "Активна",
    finished: "Завершена",
    online: "онлайн",
    offline: "офлайн",
  },
  slot: {
    free: "Свободно",
  },
  cities: {
    astana: "Астана",
    karaganda: "Караганда",
    atyrau: "Атырау",
    east_kz: "Восточно-Казахстанская область",
  },
  notifications: {
    screen_offline: "Экран недоступен",
    campaign_ending: "Кампания скоро завершится",
  },
  demo: {
    label: "Демонстрационные данные",
    reset: "Сбросить демо",
    resetTitle: "Сбросить демо?",
    resetBody: "Все созданные кампании будут удалены, демонстрационные данные будут восстановлены.",
    cancel: "Отмена",
  },
  login: {
    password: "Пароль",
    submit: "Войти",
    checkFailed: "Не удалось проверить вход. Проверьте подключение и повторите.", // team: session check failed
  },
  screenEvents: {
    went_offline: "Экран недоступен",
    back_online: "Экран снова онлайн",
  },
  common: {
    loading: "Загрузка…", // team: accessible name of the loading indicator
    menu: "Разделы", // team: accessible name of the left menu
    percent: "{value}\u00a0%", // team: every percent value (no-break space before the sign)
    period: "{from}\u00a0– {to}", // team: a date range; the no-break space keeps the dash off the start of a line
    signOut: "Выйти", // team: ends the demo session in this browser
    retry: "Повторить", // team: runs a failed request again
    // team: screen count by the ru plural rules
    screens: { one: "{n} экран", few: "{n} экрана", many: "{n} экранов", other: "{n} экрана" },
  },
  // f02-dashboard design «Strings»: team copy except the SoW glossary terms and filter names.
  dashboard: {
    filterPeriod: "Период",
    filterCity: "Город",
    filterBillboard: "Билборд",
    allCities: "Все города",
    allBillboards: "Все билборды",
    screens: "Экраны в сети",
    onlineOffline: "Онлайн / офлайн", // team: one card, «онлайн» and «офлайн» counts
    activeCampaigns: "Активные кампании",
    occupancy: "Занятость рекламного инвентаря",
    plannedShows: "Запланированные показы",
    logShows: "Показы по журналу",
    contacts: "Оценочные контакты с кампанией",
    looks: "Взгляды на экран",
    occupancyChart: "Занятость по дням",
    screensByCity: "Экраны по городам",
    activeList: "Активные кампании",
    endsOn: "до {date}",
    notificationsTitle: "Уведомления",
    noNotifications: "Нет уведомлений",
    chartDate: "Дата", // team: column of the chart's table view
    noActive: "Нет активных кампаний", // team: empty state of the active campaigns list
    allOffline: "Все недоступные экраны", // team: link to the list filtered by «офлайн»
  },
  // f03-04-billboards design "Strings" (team copy); «Билборды» is routes.billboards, «нет камеры» is OQ-3.
  billboards: {
    colName: "Название",
    colLocation: "Город и адрес",
    colImage: "Фото",
    colStatus: "Статус",
    colHours: "Режим работы",
    colOccupancy: "Занятость, %",
    colActiveCampaigns: "Активные кампании",
    colCamera: "Камера",
    colAudience: "Трафик за период",
    cameraYes: "есть",
    cameraNo: "нет",
    noCamera: "нет камеры",
    period: "Период: {from} – {to}",
    filterCity: "Город",
    filterStatus: "Статус",
    filterCamera: "Камера",
    filterOccupancy: "Занятость, %",
    occupancyFrom: "Занятость от, %", // team: accessible name of the lower range thumb
    occupancyTo: "Занятость до, %", // team: accessible name of the upper range thumb
    search: "Поиск по названию или адресу",
    all: "Все",
    empty: "Ничего не найдено",
    mapUnavailable: "Карта недоступна. Список работает.",
    roundTheClock: "Круглосуточно",
    hoursRange: "{from}–{to}",
    location: "Расположение",
    occupancyToday: "Занятость сегодня",
    campaigns: "Кампании на экране",
    noCampaigns: "Кампаний нет",
    colCampaign: "Кампания", // team: card campaign table headers (spec "Assigned campaigns")
    colAdvertiser: "Рекламодатель",
    colPeriod: "Период",
    colShowHours: "Часы показа",
    colSlots: "Слотов за цикл",
    scheduleToday: "Расписание на сегодня",
    slotsUsed: "{used} из {total} слотов",
    audience: "Аудитория за 7 дней",
    people: "Трафик: люди в зоне наблюдения",
    looks: "Взгляды на экран",
    vehicles: "Транспорт",
    events: "Последние события",
    noEvents: "Событий нет",
    backToList: "К списку билбордов",
  },
  // f05-campaign-list (team copy; «Запланированные показы», «Показы по журналу» from the SoW glossary)
  campaigns: {
    name: "Название",
    advertiser: "Рекламодатель",
    period: "Период",
    cities: "Города",
    city: "Город",
    screens: "Экраны",
    status: "Статус",
    planned: "Запланированные показы",
    log: "Показы по журналу",
    empty: "Кампаний пока нет",
    hours: "Часы показа",
    slots: "Слотов в цикле",
    creative: "Креатив",
    back: "К списку кампаний",
    screenStatus: "Состояние",
    logNotSimulated: "Журнал не смоделирован", // team: hint on a 0 of shows by the log
    showInSchedule: "Показать в расписании", // team: opens «Расписание» with this campaign marked
  },
  // f06-campaign-create design «Strings»: team copy; TODO(client) confirm the field labels.
  campaignForm: {
    title: "Новая кампания",
    create: "Создать кампанию",
    save: "Сохранить",
    cancel: "Отмена",
    fields: {
      name: "Название",
      advertiser: "Рекламодатель",
      startDate: "Дата начала",
      endDate: "Дата окончания",
      screenIds: "Экраны",
      startHour: "Начало показа",
      endHour: "Конец показа",
      slotsPerCycle: "Слотов в цикле",
      creative: "Креатив",
    },
    slotsHint: "1 слот = {slot} сек., цикл {cycle} сек.",
    creativePlaceholder: "Готовый макет",
    creativeVideo: "Видео 5 сек.",
    placeholderItem: "Макет {n}", // team: accessible name of a placeholder image
    fits: "Свободных слотов достаточно",
    previewEmpty: "Выберите экраны, даты и часы показа — здесь появится расчёт показов.", // team: preview empty state
    conflictTitle: "Недостаточно свободных слотов", // errors.SLOT_CONFLICT, shown as a title over its {list}
    conflictLine: "{screen} — {dates}, {hours}", // team: one screen of the conflict list
    conflictHint: "Уменьшите число слотов или измените даты", // team: why «Сохранить» is off
    plannedTitle: "Запланированные показы",
    perScreenPerDay: "На экран в день",
    perDay: "Всего в день",
    perPeriod: "За период",
    andMore: "и другие",
    uploading: "Загрузка видео…",
  },
  schedule: {
    // f07-schedule; slotTime from SoW 4.7.3, the rest team copy
    slotTime: "{from}–{to} сек.",
    city: "Город",
    allCities: "Все",
    billboard: "Билборд",
    date: "Дата",
    selectBillboard: "Выберите билборд, чтобы увидеть расписание",
    hourRange: "{from}–{to}",
    slotsUsed: "Занято {used} из {total}",
    cycleTitle: "Минутный цикл",
    marked: "Выделенная кампания", // team: accessible note on a slot of the campaign opened from its card
  },
  // f08-audience-analytics design «Strings»: SoW glossary terms verbatim; texts marked team are team copy.
  audience: {
    traffic: "трафик",
    look: "взгляд на экран",
    adShow: "показ рекламы",
    campaignContact: "контакт с кампанией",
    presumably: "предположительно",
    noCamera: "нет камеры",
    age18_24: "18–24",
    age25_34: "25–34",
    age35_44: "35–44",
    age45_54: "45–54",
    age55: "55+",
    filterBillboard: "Билборд", // team
    filterPeriod: "Период", // team
    people: "Трафик: люди в зоне наблюдения", // team
    vehicles: "Трафик: транспорт", // team
    looks: "Взгляды на экран", // team
    lookShare: "Доля взглядов среди людей с оценённым направлением взгляда", // team
    byHour: "Аудитория и взгляды по часам", // team
    chartHour: "Час", // team: column of the chart's table view
    age: "Возраст (предположительно)", // team
    gender: "Пол (предположительно)", // team
    male: "Мужчины", // team
    female: "Женщины", // team
    noCameraTitle: "Камеры нет", // team: empty state title
    noCameraBody: "На экране {name} нет камеры, поэтому аналитика аудитории недоступна. Выберите экран с камерой.", // team
    termsTitle: "Термины", // team
    // TODO(client): exact text of the algorithm-estimate note (SoW §4.8 AC2); team draft below.
    estimateNote: "Возраст и пол — оценка алгоритма, не точные данные.", // team
    // TODO(client): Russian definitions of the 4 terms (SoW §10.1 is in English); team translations below.
    trafficMeaning: "Количество объектов, обнаруженных в зоне наблюдения.", // team
    lookMeaning: "Оценка того, что человек посмотрел в сторону экрана.", // team
    adShowMeaning: "Воспроизведение конкретной рекламы.", // team
    campaignContactMeaning: "Возможный контакт со зрителем во время показа конкретной рекламы.", // team
  },
  // f09-reports design «Strings»: disclaimer, print, placement, screenAnalytics SoW verbatim; glossary terms §10.1; the rest team copy.
  reports: {
    disclaimer: "Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват",
    print: "Печать / сохранить в PDF",
    placement: "Результаты размещения",
    screenAnalytics: "Аналитика экранов",
    planned: "Запланированные показы",
    log: "Показы по журналу",
    completion: "Процент выполнения плана",
    traffic: "Трафик у экранов за период",
    looks: "Взгляды на экран",
    contacts: "Оценочные контакты с кампанией",
    campaign: "Кампания",
    period: "Период",
    city: "Город",
    screen: "Билборд",
    allCities: "Все города",
    allScreens: "Все билборды",
    selectCampaign: "Выберите кампанию",
    advertiser: "Рекламодатель",
    cities: "Города",
    screens: "Экраны",
    byDay: "Показы по дням",
    byScreen: "Распределение по экранам",
    noCamera: "{screens} — нет камеры, в аналитике экранов не учтены", // team; «нет камеры» is OQ-3
    noPlan: "—",
    date: "Дата", // team: column of the chart's table view
    masthead: "{app} · Отчёт по кампании", // team: report masthead (screen and paper)
    generatedOn: "Сформирован: {date}", // team
    wholePeriod: "Весь период кампании", // team: empty period filter
    screensByCity: "{screens}: {cities}", // team: «30 экранов: Астана — 20, Караганда — 10»
    cityCount: "{city} — {count}", // team
  },
  simulate: {
    // f10-simulate-shows; button from SoW 4.10, done is team copy
    button: "Смоделировать показы",
    done: "Показы смоделированы: {from} – {to}",
    logFull: "Журнал показов заполнен. Сбросьте демо, чтобы смоделировать показы снова.", // team: log row budget used up
  },
};
