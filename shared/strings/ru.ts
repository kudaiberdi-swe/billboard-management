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
  },
  screenEvents: {
    went_offline: "Экран недоступен",
    back_online: "Экран снова онлайн",
  },
  common: {
    loading: "Загрузка…", // team: accessible name of the loading indicator
    menu: "Разделы", // team: accessible name of the left menu
  },
  // f02-dashboard design «Strings»: team copy except the SoW glossary terms and filter names.
  dashboard: {
    filterPeriod: "Период",
    filterCity: "Город",
    filterBillboard: "Билборд",
    allCities: "Все города",
    allBillboards: "Все билборды",
    screens: "Экраны в сети",
    online: "Онлайн",
    offline: "Офлайн",
    activeCampaigns: "Активные кампании",
    occupancy: "Занятость рекламного инвентаря, %",
    plannedShows: "Запланированные показы",
    logShows: "Показы по журналу",
    contacts: "Оценочные контакты с аудиторией",
    looks: "Взгляды на экран",
    occupancyChart: "Занятость по дням",
    screensByCity: "Экраны по городам",
    activeList: "Активные кампании",
    endsOn: "до {date}",
    notificationsTitle: "Уведомления",
    noNotifications: "Нет уведомлений",
    chartDate: "Дата", // team: column of the chart's table view
    noActive: "Нет активных кампаний", // team: empty state of the active campaigns list
  },
};
