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
  // f05-campaign-list (team copy; «Запланированные показы», «Показы по журналу» from the SoW glossary)
  campaigns: {
    name: "Название",
    advertiser: "Рекламодатель",
    period: "Период",
    cities: "Города",
    city: "Город",
    screens: "Экраны",
    screenCount: "Экранов: {count}",
    status: "Статус",
    planned: "Запланированные показы",
    log: "Показы по журналу",
    empty: "Кампаний пока нет",
    hours: "Часы показа",
    slots: "Слотов в минутном цикле",
    creative: "Креатив",
    back: "К списку кампаний",
    screenCode: "Код",
    screenStatus: "Состояние",
  },
};
