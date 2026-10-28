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
      slotsPerCycle: "Слотов в минутном цикле",
      creative: "Креатив",
    },
    slotsHint: "1 слот = {slot} сек. в цикле {cycle} сек.",
    creativePlaceholder: "Готовый макет",
    creativeVideo: "Видео 5 сек.",
    placeholderItem: "Макет {n}", // team: accessible name of a placeholder image
    fits: "Свободных слотов достаточно",
    previewEmpty: "Выберите экраны, даты и часы показа, чтобы проверить свободные слоты.", // team: preview empty state
    plannedTitle: "Запланированные показы",
    perScreenPerDay: "На экран в день",
    perDay: "Всего в день",
    perPeriod: "За период",
    andMore: "и другие",
    uploading: "Загрузка видео…",
  },
};
