(function () {
  "use strict";

  const STORAGE_KEY = "nutritionist_mvp";
  const ACTIVE_CLIENT_KEY = "activeClientId";
  const SELECTED_CLIENT_KEY = "nutritionist_selectedClientId";

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { clients: [] };
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.clients)) return { clients: [] };
      data.clients = data.clients.map(normalizeClient);
      return data;
    } catch {
      return { clients: [] };
    }
  }

  function saveStore(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function emptyOnboarding() {
    return { goal: "", trackingComfort: "", priority: "", createdAt: "" };
  }

  function normalizeClient(client) {
    if (!client.onboarding || typeof client.onboarding !== "object") {
      client.onboarding = emptyOnboarding();
    } else {
      client.onboarding = {
        goal: client.onboarding.goal || "",
        trackingComfort: client.onboarding.trackingComfort || "",
        priority: client.onboarding.priority || "",
        createdAt: client.onboarding.createdAt || "",
      };
    }

    if (!Array.isArray(client.reports)) client.reports = [];
    if (!Array.isArray(client.recommendations)) client.recommendations = [];

    if (!Array.isArray(client.specialistComments)) {
      if (Array.isArray(client.comments) && client.comments.length) {
        client.specialistComments = client.comments.slice();
      } else {
        client.specialistComments = [];
      }
    }
    delete client.comments;

    if (typeof client.onboardingCompleted !== "boolean") {
      client.onboardingCompleted = !!(
        client.onboarding.goal ||
        client.onboarding.trackingComfort ||
        client.onboarding.priority
      );
    }

    return client;
  }

  function createClientRecord(opts) {
    return normalizeClient({
      id: opts.id || generateId(),
      name: opts.name || "",
      email: opts.email || "",
      inviteToken: opts.inviteToken || generateToken(),
      onboardingCompleted: !!opts.onboardingCompleted,
      onboarding: opts.onboarding || emptyOnboarding(),
      reports: opts.reports || [],
      specialistComments: opts.specialistComments || [],
      recommendations: opts.recommendations || [],
    });
  }

  function generateId() {
    return "client_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function generateToken() {
    return Math.random().toString(36).slice(2, 12);
  }

  function getActiveClientId() {
    return localStorage.getItem(ACTIVE_CLIENT_KEY);
  }

  function setActiveClientId(id) {
    if (id) localStorage.setItem(ACTIVE_CLIENT_KEY, id);
    else localStorage.removeItem(ACTIVE_CLIENT_KEY);
  }

  function getSelectedClientId() {
    return sessionStorage.getItem(SELECTED_CLIENT_KEY);
  }

  function setSelectedClientId(id) {
    if (id) sessionStorage.setItem(SELECTED_CLIENT_KEY, id);
    else sessionStorage.removeItem(SELECTED_CLIENT_KEY);
  }

  function findClient(data, id) {
    return data.clients.find(function (c) {
      return c.id === id;
    });
  }

  function findClientByToken(data, token) {
    return data.clients.find(function (c) {
      return c.inviteToken === token;
    });
  }

  function updateClientById(clientId, mutator) {
    const data = loadStore();
    const client = findClient(data, clientId);
    if (!client) return null;
    mutator(client);
    normalizeClient(client);
    saveStore(data);
    return client;
  }

  function formatDateRu(isoOrDate) {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  function todayKey() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function daysBetween(dateStr, fromDate) {
    const a = new Date(dateStr + "T12:00:00");
    const b = fromDate || new Date();
    const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.round((bMid - aMid) / 86400000);
  }

  function lastReport(client) {
    if (!client.reports || !client.reports.length) return null;
    return client.reports.slice().sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    })[0];
  }

  function clientStatusText(client) {
    const rep = lastReport(client);
    if (!rep) return { meta: "Записей пока нет", pill: "Записей пока нет", soft: true };
    const days = daysBetween(rep.date || (rep.createdAt || "").slice(0, 10));
    if (days === 0) return { meta: "Последняя запись: сегодня", pill: "Сегодня была запись", soft: false };
    if (days === 1) return { meta: "Последняя запись: вчера", pill: "Вчера была запись", soft: true };
    return {
      meta: "Последняя запись: " + days + " дн. назад",
      pill: "Последняя запись была несколько дней назад",
      soft: true,
    };
  }

  function inviteUrl(token) {
    const base = window.location.href.replace(/[^/]*$/, "");
    return base + "client.html?invite=" + encodeURIComponent(token);
  }

  function hasOnboardingAnswers(onboarding) {
    return !!(onboarding && (onboarding.goal || onboarding.trackingComfort || onboarding.priority));
  }

  function seedDemoData() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 4);

    const data = {
      clients: [
        createClientRecord({
          id: "demo_anna",
          name: "Анна",
          email: "anna@example.com",
          inviteToken: "anna_demo",
          onboardingCompleted: true,
          onboarding: {
            goal: "Спокойнее с едой",
            trackingComfort: "Удобно каждый день",
            priority: "Регулярность",
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
          reports: [
            {
              id: generateId(),
              date: todayKey(),
              createdAt: new Date().toISOString(),
              water: "1 л",
              nutrition: "Частично",
              wellbeing: "Усталость",
              sleep: "6,5",
              weight: "",
              comment: "Много встреч, перекусывала на ходу.",
            },
          ],
          specialistComments: [
            {
              id: generateId(),
              text: "Сейчас важна регулярность, а не идеальность.",
              createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
          ],
          recommendations: [
            {
              id: generateId(),
              title: "Фокус недели",
              text: "Старайтесь не пропускать завтрак и в течение дня обращайте внимание на воду — мягко, без идеальности.",
              createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            },
          ],
        }),
        createClientRecord({
          id: "demo_mikhail",
          name: "Михаил",
          email: "mikhail@example.com",
          inviteToken: "mikhail_demo",
          onboardingCompleted: false,
          onboarding: emptyOnboarding(),
          reports: [
            {
              id: generateId(),
              date: weekAgo.toISOString().slice(0, 10),
              createdAt: weekAgo.toISOString(),
              water: "1,5 л",
              nutrition: "Получилось",
              wellbeing: "Нормально",
              sleep: "7",
              weight: "",
              comment: "",
            },
          ],
          specialistComments: [],
          recommendations: [],
        }),
      ],
    };
    saveStore(data);
    return data;
  }

  function seedIfEmpty() {
    const data = loadStore();
    if (data.clients.length > 0) return data;
    return seedDemoData();
  }

  function resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SELECTED_CLIENT_KEY);
    return seedDemoData();
  }

  function getChecked(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.closest("label").querySelector("span").textContent.trim() : "";
  }

  function clearRadios(name) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.checked = false;
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showFeedback(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("is-hidden", "is-success", "is-soft-error");
    if (type === "success") el.classList.add("is-success");
    if (type === "error") el.classList.add("is-soft-error");
  }

  function hideFeedback(el) {
    if (!el) return;
    el.classList.add("is-hidden");
  }

  function renderReportHtml(rep) {
    const parts = [];
    if (rep.water) parts.push("<dt>Вода</dt><dd>" + escapeHtml(rep.water) + "</dd>");
    if (rep.nutrition) parts.push("<dt>Питание</dt><dd>" + escapeHtml(rep.nutrition) + "</dd>");
    if (rep.wellbeing) parts.push("<dt>Самочувствие</dt><dd>" + escapeHtml(rep.wellbeing) + "</dd>");
    if (rep.sleep) parts.push("<dt>Сон</dt><dd>" + escapeHtml(rep.sleep) + " ч</dd>");
    if (rep.weight) parts.push("<dt>Вес</dt><dd>" + escapeHtml(rep.weight) + "</dd>");
    if (rep.comment) parts.push("<dt>Комментарий клиента</dt><dd>" + escapeHtml(rep.comment) + "</dd>");

    return (
      '<article class="card card--nested history-item">' +
      '<p class="report-date">' +
      escapeHtml(formatDateRu(rep.date || rep.createdAt)) +
      "</p>" +
      '<dl class="report-row report-row--flush">' +
      parts.join("") +
      "</dl></article>"
    );
  }

  /* ——— Клиент ——— */
  function initClientPage() {
    seedIfEmpty();

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");

    const noClientEl = document.getElementById("no-client-notice");
    const mainContent = document.getElementById("client-main-content");

    if (!inviteToken) {
      if (noClientEl) noClientEl.classList.remove("is-hidden");
      if (mainContent) mainContent.classList.add("is-hidden");
      return;
    }

    const data = loadStore();
    const client = findClientByToken(data, inviteToken);

    if (!client) {
      if (noClientEl) noClientEl.classList.remove("is-hidden");
      if (mainContent) mainContent.classList.add("is-hidden");
      const empty = noClientEl && noClientEl.querySelector(".empty strong");
      if (empty) empty.textContent = "Ссылка приглашения не найдена";
      return;
    }

    setActiveClientId(client.id);
    if (!client.name && client.email) {
      client.name = client.email.split("@")[0];
      saveStore(data);
    }

    const clientId = client.id;

    if (noClientEl) noClientEl.classList.add("is-hidden");
    if (mainContent) mainContent.classList.remove("is-hidden");

    const onboardingCard = document.getElementById("onboarding-card");
    const finishOnboardingBtn = document.getElementById("finish-onboarding");
    const onboardingFeedback = document.getElementById("onboarding-feedback");

    function reloadClient() {
      const store = loadStore();
      return findClient(store, clientId);
    }

    function updateOnboardingVisibility() {
      const c = reloadClient();
      if (!onboardingCard || !c) return;
      if (c.onboardingCompleted) {
        onboardingCard.classList.add("is-hidden");
      } else {
        onboardingCard.classList.remove("is-hidden");
      }
    }

    updateOnboardingVisibility();

    if (finishOnboardingBtn) {
      finishOnboardingBtn.addEventListener("click", function () {
        const goal = getChecked("ob1");
        const trackingComfort = getChecked("ob2");
        const priority = getChecked("ob3");

        if (!goal && !trackingComfort && !priority) {
          showFeedback(
            onboardingFeedback,
            "Можно выбрать хотя бы один пункт — это поможет специалисту лучше вас сопровождать.",
            "error"
          );
          return;
        }

        updateClientById(clientId, function (c) {
          c.onboarding = {
            goal: goal,
            trackingComfort: trackingComfort,
            priority: priority,
            createdAt: new Date().toISOString(),
          };
          c.onboardingCompleted = true;
        });

        hideFeedback(onboardingFeedback);
        updateOnboardingVisibility();
        showFeedback(onboardingFeedback, "Спасибо, первичная информация сохранена.", "success");
      });
    }

    const saveBtn = document.getElementById("btn-save-report");
    const feedbackEl = document.getElementById("save-feedback");
    const historyList = document.getElementById("reports-history");
    const historyEmpty = document.getElementById("reports-empty");
    const recList = document.getElementById("recommendations-list");
    const recEmpty = document.getElementById("recommendations-empty");
    const comList = document.getElementById("comments-list");
    const comEmpty = document.getElementById("comments-empty");

    function renderClientHistory() {
      const c = reloadClient();
      if (!historyList || !c) return;
      const reports = (c.reports || []).slice().sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });

      if (!reports.length) {
        historyList.innerHTML = "";
        if (historyEmpty) historyEmpty.classList.remove("is-hidden");
        return;
      }

      if (historyEmpty) historyEmpty.classList.add("is-hidden");
      historyList.innerHTML = reports.map(renderReportHtml).join("");
    }

    function renderRecommendations() {
      const c = reloadClient();
      if (!recList || !c) return;
      const items = (c.recommendations || []).slice().sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });

      if (!items.length) {
        recList.innerHTML = "";
        if (recEmpty) recEmpty.classList.remove("is-hidden");
        return;
      }

      if (recEmpty) recEmpty.classList.add("is-hidden");
      recList.innerHTML = items
        .map(function (rec) {
          return (
            '<article class="card card--nested">' +
            '<h3 class="card__title card__title--sm">' +
            escapeHtml(rec.title) +
            "</h3>" +
            '<p class="card__text">' +
            escapeHtml(rec.text) +
            "</p>" +
            '<p class="card__meta">' +
            escapeHtml(formatDateRu(rec.createdAt)) +
            "</p></article>"
          );
        })
        .join("");
    }

    function renderComments() {
      const c = reloadClient();
      if (!comList || !c) return;
      const items = (c.specialistComments || []).slice().sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });

      if (!items.length) {
        comList.innerHTML = "";
        if (comEmpty) comEmpty.classList.remove("is-hidden");
        return;
      }

      if (comEmpty) comEmpty.classList.add("is-hidden");
      comList.innerHTML = items
        .map(function (item) {
          return (
            '<li class="comment-item">' +
            '<time datetime="' +
            escapeHtml((item.createdAt || "").slice(0, 10)) +
            '">' +
            escapeHtml(formatDateRu(item.createdAt)) +
            "</time>" +
            "<p>" +
            escapeHtml(item.text) +
            "</p></li>"
          );
        })
        .join("");
    }

    function reportHasContent(payload) {
      return !!(
        payload.water ||
        payload.nutrition ||
        payload.wellbeing ||
        payload.sleep ||
        payload.weight ||
        payload.comment
      );
    }

    function resetForm() {
      clearRadios("water");
      clearRadios("nutrition");
      clearRadios("wellbeing");
      const sleep = document.getElementById("sleep-hours");
      const weight = document.getElementById("weight");
      const comment = document.getElementById("daily-comment");
      if (sleep) sleep.value = "";
      if (weight) weight.value = "";
      if (comment) comment.value = "";
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        hideFeedback(feedbackEl);

        const payload = {
          water: getChecked("water"),
          nutrition: getChecked("nutrition"),
          wellbeing: getChecked("wellbeing"),
          sleep: (document.getElementById("sleep-hours") || {}).value.trim(),
          weight: (document.getElementById("weight") || {}).value.trim(),
          comment: (document.getElementById("daily-comment") || {}).value.trim(),
        };

        if (!reportHasContent(payload)) {
          showFeedback(
            feedbackEl,
            "Можно отметить хотя бы одно поле — даже короткая заметка уже полезна.",
            "error"
          );
          return;
        }

        saveBtn.disabled = true;
        showFeedback(feedbackEl, "Сохраняем запись…", "");

        setTimeout(function () {
          updateClientById(clientId, function (c) {
            c.reports.push({
              id: generateId(),
              date: todayKey(),
              createdAt: new Date().toISOString(),
              water: payload.water,
              nutrition: payload.nutrition,
              wellbeing: payload.wellbeing,
              sleep: payload.sleep,
              weight: payload.weight,
              comment: payload.comment,
            });
          });

          saveBtn.disabled = false;
          showFeedback(
            feedbackEl,
            "Запись сохранена. Спасибо — даже небольшие шаги уже важны.",
            "success"
          );
          resetForm();
          renderClientHistory();
        }, 350);
      });
    }

    renderClientHistory();
    renderRecommendations();
    renderComments();
  }

  /* ——— Нутрициолог ——— */
  function initNutritionistPage() {
    seedIfEmpty();

    let selectedClientId = getSelectedClientId();
    let lastInviteUrl = "";

    const clientListEl = document.getElementById("client-list");
    const emptyClientsEl = document.getElementById("empty-clients");
    const cardOpen = document.getElementById("nut-card-open");
    const detailName = document.getElementById("detail-name");
    const detailMeta = document.getElementById("detail-meta");
    const detailReports = document.getElementById("detail-reports");
    const detailReportsEmpty = document.getElementById("detail-reports-empty");
    const detailCommentsHistory = document.getElementById("detail-comments-history");
    const detailRecHistory = document.getElementById("detail-recommendations-history");
    const onboardingPanel = document.getElementById("onboarding-detail-panel");
    const onboardingContent = document.getElementById("onboarding-detail-content");
    const toggleOnboardingBtn = document.getElementById("btn-toggle-onboarding");
    const nutMsg = document.getElementById("nut-msg");
    const recTitle = document.getElementById("rec-title");
    const recBody = document.getElementById("rec-body");
    const saveCommentBtn = document.getElementById("btn-save-comment");
    const saveRecBtn = document.getElementById("btn-save-recommendation");
    const commentFeedback = document.getElementById("comment-feedback");
    const recFeedback = document.getElementById("rec-feedback");
    const createInviteBtn = document.getElementById("btn-create-invite");
    const inviteEmail = document.getElementById("invite-email");
    const inviteLinkInput = document.getElementById("invite-link");
    const copyInviteBtn = document.getElementById("btn-copy-invite");
    const inviteFeedback = document.getElementById("invite-feedback");
    const inviteHint = document.getElementById("invite-hint");
    const resetDemoBtn = document.getElementById("btn-reset-demo");

    function getClientBySelection() {
      if (!selectedClientId) return null;
      const data = loadStore();
      return findClient(data, selectedClientId);
    }

    function openClient(id) {
      selectedClientId = id;
      setSelectedClientId(id);
      if (cardOpen) cardOpen.checked = true;
      if (onboardingPanel) onboardingPanel.classList.add("is-hidden");
      renderClientDetail();
    }

    function closeClient() {
      selectedClientId = null;
      setSelectedClientId(null);
      if (cardOpen) cardOpen.checked = false;
      if (onboardingPanel) onboardingPanel.classList.add("is-hidden");
    }

    if (document.querySelector(".link-back")) {
      document.querySelector(".link-back").addEventListener("click", closeClient);
    }

    function renderOnboardingDetail(client) {
      if (!onboardingContent) return;

      if (!hasOnboardingAnswers(client.onboarding)) {
        onboardingContent.innerHTML =
          '<p class="card__text">Клиент пока не заполнил первичный опрос.</p>';
        return;
      }

      const ob = client.onboarding;
      onboardingContent.innerHTML =
        '<dl class="report-row report-row--flush">' +
        "<dt>Что хочется улучшить</dt><dd>" +
        escapeHtml(ob.goal || "—") +
        "</dd>" +
        "<dt>Удобство отметок</dt><dd>" +
        escapeHtml(ob.trackingComfort || "—") +
        "</dd>" +
        "<dt>Что сейчас важно</dt><dd>" +
        escapeHtml(ob.priority || "—") +
        "</dd>" +
        "<dt>Дата заполнения</dt><dd>" +
        escapeHtml(ob.createdAt ? formatDateRu(ob.createdAt) : "—") +
        "</dd></dl>";
    }

    function renderClientDetail() {
      const client = getClientBySelection();
      if (!client) return;

      const st = clientStatusText(client);
      if (detailName) detailName.textContent = client.name || client.email;
      if (detailMeta) detailMeta.textContent = st.meta;

      renderOnboardingDetail(client);
      if (onboardingPanel) onboardingPanel.classList.add("is-hidden");

      const reports = (client.reports || []).slice().sort(function (a, b) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });

      if (detailReportsEmpty) {
        if (!reports.length) detailReportsEmpty.classList.remove("is-hidden");
        else detailReportsEmpty.classList.add("is-hidden");
      }

      if (detailReports) {
        detailReports.innerHTML = reports.length
          ? reports
              .slice(0, 10)
              .map(renderReportHtml)
              .join("")
          : "";
      }

      if (detailCommentsHistory) {
        const comments = (client.specialistComments || []).slice().sort(function (a, b) {
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });

        if (!comments.length) {
          detailCommentsHistory.innerHTML =
            '<p class="card__text">Комментариев пока нет — можно оставить первый ниже.</p>';
        } else {
          detailCommentsHistory.innerHTML =
            '<ul class="comment-list">' +
            comments
              .map(function (c) {
                return (
                  '<li class="comment-item"><time>' +
                  escapeHtml(formatDateRu(c.createdAt)) +
                  "</time><p>" +
                  escapeHtml(c.text) +
                  "</p></li>"
                );
              })
              .join("") +
            "</ul>";
        }
      }

      if (detailRecHistory) {
        const recs = (client.recommendations || []).slice().sort(function (a, b) {
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });

        if (!recs.length) {
          detailRecHistory.innerHTML =
            '<p class="card__text">Рекомендаций пока нет — можно добавить ниже.</p>';
        } else {
          detailRecHistory.innerHTML = recs
            .map(function (r) {
              return (
                '<article class="card card--nested history-item">' +
                '<p class="report-date">' +
                escapeHtml(formatDateRu(r.createdAt)) +
                "</p>" +
                '<h4 class="card__title card__title--sm">' +
                escapeHtml(r.title) +
                "</h4>" +
                '<p class="card__text">' +
                escapeHtml(r.text) +
                "</p></article>"
              );
            })
            .join("");
        }
      }
    }

    function renderClientList() {
      const data = loadStore();
      if (!clientListEl) return;

      if (!data.clients.length) {
        clientListEl.innerHTML = "";
        if (emptyClientsEl) emptyClientsEl.classList.remove("is-hidden");
        return;
      }

      if (emptyClientsEl) emptyClientsEl.classList.add("is-hidden");

      clientListEl.innerHTML = data.clients
        .map(function (client) {
          const st = clientStatusText(client);
          return (
            '<article class="client-card">' +
            '<h2 class="client-card__name">' +
            escapeHtml(client.name || client.email) +
            "</h2>" +
            '<p class="client-card__meta">' +
            escapeHtml(st.meta) +
            "</p>" +
            '<span class="status-pill' +
            (st.soft ? " status-pill--soft" : "") +
            '">' +
            escapeHtml(st.pill) +
            "</span>" +
            '<button type="button" class="btn btn--primary btn--card-action open-client-btn" data-client-id="' +
            escapeHtml(client.id) +
            '">Открыть</button></article>'
          );
        })
        .join("");

      clientListEl.querySelectorAll(".open-client-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          openClient(btn.getAttribute("data-client-id"));
        });
      });
    }

    if (toggleOnboardingBtn) {
      toggleOnboardingBtn.addEventListener("click", function () {
        const client = getClientBySelection();
        if (!client || !onboardingPanel) return;
        renderOnboardingDetail(client);
        onboardingPanel.classList.toggle("is-hidden");
      });
    }

    document.querySelectorAll(".template-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        if (nutMsg) nutMsg.value = pill.textContent.trim();
      });
    });

    if (saveCommentBtn) {
      saveCommentBtn.addEventListener("click", function () {
        if (!selectedClientId) return;

        const text = nutMsg ? nutMsg.value.trim() : "";
        if (!text) {
          showFeedback(commentFeedback, "Напишите пару слов поддержки — даже коротко.", "error");
          return;
        }

        updateClientById(selectedClientId, function (c) {
          c.specialistComments.push({
            id: generateId(),
            text: text,
            createdAt: new Date().toISOString(),
          });
        });

        if (nutMsg) nutMsg.value = "";
        showFeedback(commentFeedback, "Комментарий сохранён.", "success");
        renderClientDetail();
      });
    }

    if (saveRecBtn) {
      saveRecBtn.addEventListener("click", function () {
        if (!selectedClientId) return;

        const title = recTitle ? recTitle.value.trim() : "";
        const text = recBody ? recBody.value.trim() : "";
        if (!title || !text) {
          showFeedback(recFeedback, "Добавьте заголовок и короткий текст рекомендации.", "error");
          return;
        }

        updateClientById(selectedClientId, function (c) {
          c.recommendations.push({
            id: generateId(),
            title: title,
            text: text,
            createdAt: new Date().toISOString(),
          });
        });

        if (recTitle) recTitle.value = "";
        if (recBody) recBody.value = "";
        showFeedback(recFeedback, "Рекомендация сохранена.", "success");
        renderClientDetail();
      });
    }

    if (createInviteBtn) {
      createInviteBtn.addEventListener("click", function () {
        const data = loadStore();
        const email = inviteEmail ? inviteEmail.value.trim() : "";
        if (!email || !email.includes("@")) {
          showFeedback(inviteFeedback, "Укажите почту клиента — так проще отправить приглашение.", "error");
          return;
        }

        const exists = data.clients.some(function (c) {
          return c.email.toLowerCase() === email.toLowerCase();
        });
        if (exists) {
          showFeedback(inviteFeedback, "Клиент с такой почтой уже есть в списке.", "error");
          return;
        }

        const token = generateToken();
        let name = email.split("@")[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);

        data.clients.push(
          createClientRecord({
            name: name,
            email: email,
            inviteToken: token,
            onboardingCompleted: false,
          })
        );
        saveStore(data);

        lastInviteUrl = inviteUrl(token);
        if (inviteLinkInput) inviteLinkInput.value = lastInviteUrl;
        const inviteLinkBlock = document.getElementById("invite-link-block");
        if (inviteLinkBlock) inviteLinkBlock.classList.remove("is-hidden");
        if (inviteHint) inviteHint.classList.remove("is-hidden");
        if (inviteEmail) inviteEmail.value = "";

        showFeedback(inviteFeedback, "Ссылка готова. Отправьте её клиенту удобным способом.", "success");
        renderClientList();
      });
    }

    if (copyInviteBtn) {
      copyInviteBtn.addEventListener("click", function () {
        const url = inviteLinkInput ? inviteLinkInput.value : lastInviteUrl;
        if (!url) {
          showFeedback(inviteFeedback, "Сначала создайте приглашение.", "error");
          return;
        }

        function onCopied() {
          showFeedback(inviteFeedback, "Ссылка скопирована.", "success");
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(onCopied).catch(function () {
            inviteLinkInput.select();
            document.execCommand("copy");
            onCopied();
          });
        } else {
          inviteLinkInput.select();
          document.execCommand("copy");
          onCopied();
        }
      });
    }

    if (resetDemoBtn) {
      resetDemoBtn.addEventListener("click", function () {
        if (
          !window.confirm(
            "Сбросить все демо-данные? Список клиентов, записи и комментарии будут пересозданы."
          )
        ) {
          return;
        }
        resetDemoData();
        selectedClientId = null;
        setSelectedClientId(null);
        closeClient();
        lastInviteUrl = "";
        if (inviteLinkInput) inviteLinkInput.value = "";
        const inviteLinkBlock = document.getElementById("invite-link-block");
        if (inviteLinkBlock) inviteLinkBlock.classList.add("is-hidden");
        if (inviteHint) inviteHint.classList.add("is-hidden");
        renderClientList();
        showFeedback(inviteFeedback, "Демо-данные сброшены.", "success");
      });
    }

    renderClientList();

    if (selectedClientId && findClient(loadStore(), selectedClientId)) {
      if (cardOpen) cardOpen.checked = true;
      renderClientDetail();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.classList.contains("page--client")) {
      initClientPage();
    }
    if (document.body.classList.contains("page--nutritionist")) {
      initNutritionistPage();
    }
  });
})();
