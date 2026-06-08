const App = (() => {
  const state = {
    subscriptionPlans: {
      basic: { label: "Starter", days: 30 },
      pro: { label: "Pro 3D", days: 90 },
      elite: { label: "Elite Academy", days: 365 }
    },
    lessons: [
      { id: "html3d", duration: "18 دقيقة" },
      { id: "jslogic", duration: "22 دقيقة" },
      { id: "aiweb", duration: "27 دقيقة" }
    ],
    exams: {
      html3d: {
        title: "اختبار الواجهة ثلاثية الأبعاد",
        question: "ما أهم عنصر يعطي الإحساس بالعمق داخل الواجهة؟",
        answers: [
          { text: "استخدام الظلال والمنظور والحركة", correct: true },
          { text: "تكبير الخط فقط", correct: false },
          { text: "إزالة كل الألوان", correct: false }
        ]
      },
      jslogic: {
        title: "اختبار منطق الألعاب",
        question: "كيف نجعل اللعبة التعليمية مفيدة فعلًا؟",
        answers: [
          { text: "بربط التحدي بهدف تعليمي واضح وتغذية راجعة فورية", correct: true },
          { text: "بزيادة عدد الأزرار", correct: false },
          { text: "بعرض النصوص فقط بدون تفاعل", correct: false }
        ]
      },
      aiweb: {
        title: "اختبار تجربة المنصة",
        question: "ما الذي يرفع جودة رحلة الطالب داخل المنصة؟",
        answers: [
          { text: "لوحة تقدم واضحة ومسار تعلم شخصي", correct: true },
          { text: "إخفاء حالة الاشتراك", correct: false },
          { text: "حذف صفحة الحساب", correct: false }
        ]
      }
    }
  };

  function setThemeIcon(toggle) {
    if (!toggle) return;
    toggle.textContent = document.body.classList.contains("light") ? "☀" : "☾";
  }

  function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light");
    }
    const toggle = document.getElementById("modeToggle");
    setThemeIcon(toggle);
    if (toggle) {
      toggle.addEventListener("click", () => {
        document.body.classList.toggle("light");
        localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
        setThemeIcon(toggle);
      });
    }
  }

  function getUser() {
    return JSON.parse(localStorage.getItem("codecraftUser") || "null");
  }

  function setUser(user) {
    localStorage.setItem("codecraftUser", JSON.stringify(user));
  }

  function requireAuth() {
    if (!getUser()) {
      window.location.href = "login.html";
    }
  }

  function loginUser(user) {
    setUser(user);
    if (!localStorage.getItem("learningProgress")) localStorage.setItem("learningProgress", "18");
    if (!localStorage.getItem("achievements")) localStorage.setItem("achievements", "3");
    if (!localStorage.getItem("completedLessons")) localStorage.setItem("completedLessons", JSON.stringify([]));
    if (!localStorage.getItem("selectedPlan")) selectPlan("basic", false);
  }

  function logout() {
    localStorage.removeItem("codecraftUser");
    window.location.href = "login.html";
  }

  function selectPlan(planKey, navigate = true) {
    const plan = state.subscriptionPlans[planKey];
    if (!plan) return;
    const expire = new Date();
    expire.setDate(expire.getDate() + plan.days);
    localStorage.setItem("selectedPlan", JSON.stringify({ key: planKey, label: plan.label, expiresAt: expire.toISOString() }));
    if (navigate) window.location.href = "dashboard.html";
  }

  function getPlan() {
    return JSON.parse(localStorage.getItem("selectedPlan") || "null");
  }

  function markLessonComplete(lessonId) {
    const completed = JSON.parse(localStorage.getItem("completedLessons") || "[]");
    if (!completed.includes(lessonId)) {
      completed.push(lessonId);
      localStorage.setItem("completedLessons", JSON.stringify(completed));
      const currentProgress = Number(localStorage.getItem("learningProgress") || "18");
      localStorage.setItem("learningProgress", String(Math.min(currentProgress + 18, 100)));
      const achievements = Number(localStorage.getItem("achievements") || "3") + 1;
      localStorage.setItem("achievements", String(achievements));
    }
  }

  function getCompletedLessons() {
    return JSON.parse(localStorage.getItem("completedLessons") || "[]");
  }

  function renderUserSpots() {
    const user = getUser();
    if (!user) return;
    document.querySelectorAll("[data-user-name]").forEach((node) => { node.textContent = user.name || "المبرمج"; });
    document.querySelectorAll("[data-user-email]").forEach((node) => { node.textContent = user.email || "student@codecraft.dev"; });
    document.querySelectorAll("[data-user-track]").forEach((node) => { node.textContent = user.track || "Full Stack"; });
    document.querySelectorAll("[data-user-level]").forEach((node) => { node.textContent = user.level || "متقدم"; });
    document.querySelectorAll("[data-user-goal]").forEach((node) => { node.textContent = user.goal || "بناء مشاريع قوية"; });
  }

  function renderPlanSpots() {
    const plan = getPlan();
    if (!plan) return;
    const dateText = new Date(plan.expiresAt).toLocaleDateString("ar-EG");
    document.querySelectorAll("[data-plan-name]").forEach((node) => { node.textContent = plan.label; });
    document.querySelectorAll("[data-plan-expire]").forEach((node) => { node.textContent = dateText; });
  }

  function renderProgress() {
    const progress = Number(localStorage.getItem("learningProgress") || "18");
    document.querySelectorAll("[data-progress-value]").forEach((node) => { node.textContent = `${progress}%`; });
    document.querySelectorAll("[data-progress-bar]").forEach((node) => { node.style.width = `${progress}%`; });
    document.querySelectorAll("[data-achievements]").forEach((node) => { node.textContent = localStorage.getItem("achievements") || "3"; });
    document.querySelectorAll("[data-completed-count]").forEach((node) => { node.textContent = String(getCompletedLessons().length); });
  }

  function renderLessonButtons() {
    const completed = getCompletedLessons();
    document.querySelectorAll("[data-watch-lesson]").forEach((button) => {
      const lessonId = button.dataset.watchLesson;
      if (completed.includes(lessonId)) {
        button.textContent = "تم الإنجاز";
        button.classList.add("success");
      }
      button.addEventListener("click", () => {
        markLessonComplete(lessonId);
        alert("تم حفظ تقدمك وفتح الاختبار الخاص بهذا الدرس.");
        window.location.reload();
      });
    });
  }

  function renderExamCards() {
    const wrap = document.getElementById("examGrid");
    if (!wrap) return;
    const completed = getCompletedLessons();
    wrap.innerHTML = "";
    Object.entries(state.exams).forEach(([lessonId, exam]) => {
      const unlocked = completed.includes(lessonId);
      const lesson = state.lessons.find((item) => item.id === lessonId);
      const card = document.createElement("article");
      card.className = "exam-card";
      card.innerHTML = `
        <div class="exam-meta">
          <span>${unlocked ? "مفتوح" : "مغلق"}</span>
          <span>${lesson ? lesson.duration : ""}</span>
        </div>
        <h3>${exam.title}</h3>
        <p class="muted">${exam.question}</p>
        <ul class="exam-list">${exam.answers.map((answer) => `<li>${answer.text}</li>`).join("")}</ul>
        <button class="btn ${unlocked ? "success" : "secondary"}" ${unlocked ? "" : "disabled"} data-submit-exam="${lessonId}">
          ${unlocked ? "حل الاختبار" : "أكمل الدرس أولًا"}
        </button>`;
      wrap.appendChild(card);
    });
    wrap.querySelectorAll("[data-submit-exam]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = state.exams[button.dataset.submitExam];
        alert(`ممتاز! لقد أنهيت ${result.title} بنجاح.`);
      });
    });
  }

  function bindPlanButtons() {
    document.querySelectorAll("[data-select-plan]").forEach((button) => {
      button.addEventListener("click", () => { selectPlan(button.dataset.selectPlan); });
    });
  }

  function bindLogout() {
    const button = document.getElementById("logoutBtn");
    if (button) button.addEventListener("click", logout);
  }

  return {
    initTheme,
    getUser,
    loginUser,
    requireAuth,
    renderUserSpots,
    renderPlanSpots,
    renderProgress,
    renderLessonButtons,
    renderExamCards,
    bindPlanButtons,
    bindLogout,
    selectPlan
  };
})();
