const App = (() => {
  const RIGHTS_TEXT = 'جميع الحقوق محفوظة لعبده محمد عبده 2026';
  const state = {
    session: { authenticated: false, plans: {}, tracks: [], lessons: [], exams: {}, watchRequirements: {}, contactPhone: '01280272177' },
    currentLessonId: null,
    currentVideoLanguage: null,
    videoLanguage: localStorage.getItem('codecraftVideoLanguage') || 'ar',
    lessonWatchTicker: null,
    examTimerTicker: null,
    examAttempts: {},
    examSelections: {},
    examFeedback: {},
    adminCodes: [],
    adminRequests: [],
    adminTickets: [],
    adminLoginLocks: [],
    adminActivity: [],
    adminAnalytics: null,
    adminStudents: [],
    adminBackups: [],
    adminSubscriptionReports: null
  };

  function setThemeIcon(toggle) {
    if (!toggle) return;
    toggle.textContent = document.body.classList.contains('light') ? '☀' : '☾';
  }

  function initTheme() {
    const saved = localStorage.getItem('codecraftTheme');
    if (saved === 'light') document.body.classList.add('light');
    const toggle = document.getElementById('modeToggle');
    setThemeIcon(toggle);
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        localStorage.setItem('codecraftTheme', document.body.classList.contains('light') ? 'light' : 'dark');
        setThemeIcon(toggle);
      });
    }
  }

  function setNotice(message) {
    const banner = document.getElementById('noticeBanner');
    if (!banner) return;
    if (!message) {
      banner.hidden = true;
      banner.textContent = '';
      return;
    }
    banner.hidden = false;
    banner.textContent = message;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ غير متوقع.');
    }
    return data;
  }

  function ensureServerMode() {
    if (window.location.protocol === 'file:') {
      setNotice('شغّل الموقع من السيرفر عبر الأمر: node server.js ثم افتح http://localhost:3000');
      return false;
    }
    return true;
  }

  function formatDate(value) {
    if (!value) return 'غير متاح';
    return new Date(value).toLocaleDateString('ar-EG');
  }

  function supportStatusLabel(status) {
    if (status === 'resolved') return 'تم الحل';
    if (status === 'in_progress') return 'جارٍ المتابعة';
    if (status === 'closed') return 'مغلقة';
    return 'مفتوحة';
  }

  function injectRightsFooter() {
    const footer = document.querySelector('.footer-note');
    if (footer) footer.textContent = RIGHTS_TEXT;
  }

  async function loadSession() {
    state.session = await api('/api/session');
    return state.session;
  }

  function currentPlan() {
    return state.session.subscription || { status: 'inactive', label: 'بدون اشتراك', planKey: null, requestCode: null, expiresAt: null };
  }

  function lessonEmbedUrl(videoUrl) {
    const value = String(videoUrl || '').trim();
    if (!value) return '';
    const embedParams = 'rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=0&fs=0&disablekb=1';
    const shortMatch = value.match(/^https?:\/\/youtu\.be\/([^?&/]+)/i);
    if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?${embedParams}`;
    const watchMatch = value.match(/[?&]v=([^?&/]+)/i);
    if (watchMatch) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?${embedParams}`;
    return value;
  }

  function videoLanguageLabel(language) {
    return language === 'ar' ? 'العربية' : 'English';
  }

  function lessonVideoSources(lesson) {
    const videoSources = lesson?.videoSources && typeof lesson.videoSources === 'object' ? lesson.videoSources : {};
    const english = String(videoSources.en || lesson?.videoUrl || '').trim();
    const arabic = String(videoSources.ar || '').trim();
    return { ar: arabic, en: english };
  }

  function resolveLessonVideo(lesson, requestedLanguage = state.videoLanguage) {
    const sources = lessonVideoSources(lesson);
    if (sources[requestedLanguage]) return { url: sources[requestedLanguage], language: requestedLanguage, fallback: false };
    const alternativeLanguage = requestedLanguage === 'ar' ? 'en' : 'ar';
    if (sources[alternativeLanguage]) return { url: sources[alternativeLanguage], language: alternativeLanguage, fallback: true };
    return { url: '', language: requestedLanguage, fallback: false };
  }

  function setPreferredVideoLanguage(language, options = {}) {
    state.videoLanguage = language === 'en' ? 'en' : 'ar';
    localStorage.setItem('codecraftVideoLanguage', state.videoLanguage);
    renderVideoLanguageSwitch();
    if (options.playCurrent && state.currentLessonId) {
      const currentLesson = state.session.lessons.find((item) => item.id === state.currentLessonId);
      if (currentLesson) openLessonVideo(currentLesson, state.videoLanguage);
    }
  }

  function renderVideoLanguageSwitch() {
    const wrap = document.getElementById('videoLanguageSwitch');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="language-switch-card">
        <div>
          <strong>لغة الشرح المفضلة</strong>
          <p class="muted">اللغة المختارة الآن: ${videoLanguageLabel(state.videoLanguage)}</p>
        </div>
        <div class="language-switch-actions">
          <button class="btn ${state.videoLanguage === 'ar' ? 'success' : 'secondary'}" data-set-video-language="ar" type="button" aria-pressed="${state.videoLanguage === 'ar'}">العربية</button>
          <button class="btn ${state.videoLanguage === 'en' ? 'success' : 'secondary'}" data-set-video-language="en" type="button" aria-pressed="${state.videoLanguage === 'en'}">English</button>
        </div>
      </div>
    `;
    wrap.querySelectorAll('[data-set-video-language]').forEach((button) => {
      button.addEventListener('click', () => {
        setPreferredVideoLanguage(button.dataset.setVideoLanguage, { playCurrent: true });
        renderVideoLibrary();
      });
    });
  }

  function resetLessonPlayer() {
    state.currentLessonId = null;
    state.currentVideoLanguage = null;
    const frame = document.getElementById('inlineLessonFrame');
    const title = document.getElementById('inlineLessonTitle');
    const summary = document.getElementById('inlineLessonSummary');
    const meta = document.getElementById('inlineLessonMeta');
    const placeholder = document.getElementById('inlineLessonPlaceholder');
    const clearButton = document.getElementById('clearLessonPlayerBtn');
    const player = document.getElementById('inlineLessonPlayer');
    const frameWrap = document.querySelector('.lesson-player-frame-wrap');

    if (title) title.textContent = 'اختر درسًا من المسار';
    if (summary) summary.textContent = 'اختر أي درس من الأسفل، وسيعمل هنا مباشرة داخل المنصة بدون فتح نافذة جديدة.';
    if (meta) meta.innerHTML = '';
    if (frame) {
      frame.src = '';
      frame.hidden = true;
    }
    if (placeholder) placeholder.hidden = false;
    if (clearButton) clearButton.hidden = true;
    if (player) player.classList.remove('is-active');
    if (frameWrap) frameWrap.classList.remove('has-video');
  }

  async function openLessonVideo(lesson, requestedLanguage = state.videoLanguage) {
    const selectedVideo = resolveLessonVideo(lesson, requestedLanguage);
    if (!selectedVideo.url) {
      setNotice('رابط الفيديو غير متاح لهذا الدرس حتى الآن.');
      return;
    }
    if (selectedVideo.fallback) {
      setNotice(`شرح ${videoLanguageLabel(requestedLanguage)} غير متاح لهذا الدرس حاليًا، فتم تشغيل نسخة ${videoLanguageLabel(selectedVideo.language)} بدلًا منه.`);
    } else {
      setNotice('');
    }
    state.currentLessonId = lesson.id;
    state.currentVideoLanguage = selectedVideo.language;
    const player = document.getElementById('inlineLessonPlayer');
    const frame = document.getElementById('inlineLessonFrame');
    const title = document.getElementById('inlineLessonTitle');
    const summary = document.getElementById('inlineLessonSummary');
    const meta = document.getElementById('inlineLessonMeta');
    const placeholder = document.getElementById('inlineLessonPlaceholder');
    const clearButton = document.getElementById('clearLessonPlayerBtn');
    const frameWrap = document.querySelector('.lesson-player-frame-wrap');
    if (title) title.textContent = lesson.title;
    if (summary) summary.textContent = lesson.summary || 'الدرس يعمل الآن داخل المنصة.';
    if (meta) {
      meta.innerHTML = `
        <span class="chip">${lesson.trackArabicTitle || lesson.trackTitle || 'المسار'}</span>
        <span class="chip">${lesson.moduleTitle || lesson.category || 'الوحدة'}</span>
        <span class="chip">${lesson.level || 'المستوى'}</span>
        <span class="chip">الشرح: ${videoLanguageLabel(selectedVideo.language)}</span>
      `;
    }
    if (placeholder) placeholder.hidden = true;
    if (frame) {
      frame.hidden = false;
      frame.src = lessonEmbedUrl(selectedVideo.url);
    }
    if (frameWrap) frameWrap.classList.add('has-video');
    if (clearButton) clearButton.hidden = false;
    if (player) {
      player.classList.add('is-active');
      player.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    try {
      const result = await api(`/api/lessons/${lesson.id}/watch-start`, { method: 'POST' });
      state.session.watchRequirements = state.session.watchRequirements || {};
      state.session.watchRequirements[lesson.id] = result.watch;
    } catch (error) {
      setNotice(error.message);
    }
    renderVideoLibrary();
  }

  function courseTracks() {
    return Array.isArray(state.session.tracks) ? state.session.tracks : [];
  }

  function progressData() {
    return state.session.progress || { progress: 0, achievements: 0, completedLessons: [], passedExams: [], examBestScores: {} };
  }

  function examBestScore(lessonId) {
    return progressData().examBestScores?.[lessonId] || null;
  }

  function certificateStatus() {
    return state.session.certificate || {
      eligible: false,
      requiredExams: 10,
      passedCount: progressData().passedExams.length,
      remainingExams: Math.max(0, 10 - progressData().passedExams.length),
      studentName: state.session.user?.name || 'طالب المنصة'
    };
  }

  function certificateTrackLabel() {
    const userTrack = String(state.session.user?.track || '').trim().toLowerCase();
    const matched = (state.session.tracks || []).find((track) => (
      String(track.key || '').trim().toLowerCase() === userTrack
      || String(track.title || '').trim().toLowerCase() === userTrack
      || String(track.arabicTitle || '').trim().toLowerCase().includes(userTrack)
    ));
    return matched?.arabicTitle || state.session.user?.track || 'المسار التعليمي';
  }

  function lessonDurationLabel(value) {
    if (String(value || '').trim() === 'شاهد داخل المنصة') return 'مشاهدة داخل المنصة';
    return value || 'غير محدد';
  }

  function watchRequirementForLesson(lessonId) {
    return state.session.watchRequirements?.[lessonId] || {
      watched: false,
      eligible: false,
      requiredSeconds: 30,
      remainingSeconds: 30
    };
  }

  function formatRemainingSeconds(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    if (value < 60) return `${value} ثانية`;
    const minutes = Math.floor(value / 60);
    const remain = value % 60;
    return `${minutes} دقيقة${remain ? ` و${remain} ثانية` : ''}`;
  }

  function shuffleArray(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  function buildInteractiveExam(exam, lesson) {
    const title = lesson?.title || 'الدرس';
    const track = lesson?.trackArabicTitle || 'المسار';
    const category = lesson?.category || lesson?.moduleTitle || 'المحتوى';
    const baseQuestion = exam?.question ? [{
      id: `${lesson?.id || 'lesson'}-base`,
      question: exam.question,
      answers: exam.answers || []
    }] : [];

    const generatedQuestions = [
      {
        id: `${lesson?.id || 'lesson'}-goal`,
        question: `ما الهدف الأساسي من درس ${title} داخل ${track}؟`,
        answers: [
          { text: `فهم الفكرة الأساسية وتطبيقها عمليًا داخل ${category}`, correct: true },
          { text: 'حفظ العنوان فقط بدون تطبيق', correct: false },
          { text: 'تجاوز الدرس والانتقال مباشرة للنهاية', correct: false }
        ]
      },
      {
        id: `${lesson?.id || 'lesson'}-next-step`,
        question: `ما السلوك الأفضل بعد إنهاء ${title}؟`,
        answers: [
          { text: 'تجربة الفكرة عمليًا ثم مراجعة الاختبار', correct: true },
          { text: 'ترك الدرس بدون مراجعة أو تطبيق', correct: false },
          { text: 'الاعتماد على التخمين فقط', correct: false }
        ]
      },
      {
        id: `${lesson?.id || 'lesson'}-benefit`,
        question: `ما الفائدة العملية التي يجب أن تخرج بها من ${title}؟`,
        answers: [
          { text: `تحويل المفهوم إلى خطوة عملية يمكن استخدامها داخل ${track}`, correct: true },
          { text: 'قراءة الدرس مرة واحدة بدون أي تجربة', correct: false },
          { text: 'التركيز على الاسم فقط وترك التفاصيل', correct: false }
        ]
      },
      {
        id: `${lesson?.id || 'lesson'}-mistake`,
        question: `أي تصرف يعتبر خطأ أثناء دراسة ${title}؟`,
        answers: [
          { text: 'تجاهل التطبيق العملي والاعتماد على التخمين', correct: true },
          { text: 'إعادة تجربة الفكرة داخل مشروع صغير', correct: false },
          { text: 'مراجعة السؤال وربطه بالمحتوى', correct: false }
        ]
      },
      {
        id: `${lesson?.id || 'lesson'}-project`,
        question: `كيف تعرف أنك فهمت ${title} بشكل جيد؟`,
        answers: [
          { text: 'عندما تستطيع استخدامه داخل مثال أو مشروع حقيقي', correct: true },
          { text: 'عندما تكتفي بحفظ الاسم والعنوان', correct: false },
          { text: 'عندما تتركه بدون مراجعة أو اختبار', correct: false }
        ]
      }
    ];

    return [...baseQuestion, ...generatedQuestions].filter((item) => item.question && Array.isArray(item.answers) && item.answers.length);
  }

  function formatExamTimer(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function getExamAttempt(lessonId, exam, lesson, forceNew = false) {
    if (!forceNew && state.examAttempts[lessonId]) return state.examAttempts[lessonId];
    const pool = buildInteractiveExam(exam, lesson);
    const picked = shuffleArray(pool).slice(0, Math.min(3, pool.length)).map((questionItem) => ({
      ...questionItem,
      answers: shuffleArray(questionItem.answers || [])
    }));
    const attempt = {
      questions: picked,
      passScore: 70,
      durationSeconds: 10 * 60,
      startedAt: new Date().toISOString()
    };
    state.examAttempts[lessonId] = attempt;
    state.examSelections[lessonId] = {};
    state.examFeedback[lessonId] = null;
    return attempt;
  }

  function examRemainingSeconds(attempt) {
    if (!attempt?.startedAt || !attempt?.durationSeconds) return 0;
    const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
    return Math.max(0, attempt.durationSeconds - elapsed);
  }

  function examExpired(attempt) {
    return examRemainingSeconds(attempt) <= 0;
  }

  function renderUserSpots() {
    const user = state.session.user;
    if (!user) return;
    const initials = (user.name || 'طالب').trim().slice(0, 2);
    document.querySelectorAll('[data-user-name]').forEach((node) => { node.textContent = user.name; });
    document.querySelectorAll('[data-user-email]').forEach((node) => { node.textContent = user.email; });
    document.querySelectorAll('[data-user-phone]').forEach((node) => { node.textContent = user.phone; });
    document.querySelectorAll('[data-user-track]').forEach((node) => { node.textContent = user.track; });
    document.querySelectorAll('[data-user-level]').forEach((node) => { node.textContent = user.level; });
    document.querySelectorAll('[data-user-goal]').forEach((node) => { node.textContent = user.goal; });
    document.querySelectorAll('[data-user-initials]').forEach((node) => { node.textContent = initials; });
  }

  function renderPlanSpots() {
    const plan = currentPlan();
    const active = plan.status === 'active' && plan.expiresAt && new Date(plan.expiresAt).getTime() > Date.now();
    document.querySelectorAll('[data-plan-name]').forEach((node) => { node.textContent = plan.label || 'لم يتم التفعيل بعد'; });
    document.querySelectorAll('[data-plan-status]').forEach((node) => { node.textContent = active ? 'مفعل' : plan.status === 'pending_activation' ? 'بانتظار الكود' : 'غير مفعل'; });
    document.querySelectorAll('[data-plan-expire]').forEach((node) => { node.textContent = active ? formatDate(plan.expiresAt) : 'بانتظار التفعيل'; });
    document.querySelectorAll('[data-request-code]').forEach((node) => { node.textContent = plan.requestCode || 'سيظهر بعد طلب الاشتراك'; });
    const hint = document.getElementById('activationHint');
    if (hint) {
      hint.textContent = plan.planKey
        ? `بعد التواصل مع الإدارة على ${state.session.contactPhone} اطلب كود تفعيل باقة ${state.session.plans[plan.planKey].label}.`
        : 'بعد اختيار أي باقة سيتم تجهيز رسالة تلقائية على واتساب لطلب الكود.';
    }
  }

  function renderProgress() {
    const progress = progressData();
    document.querySelectorAll('[data-progress-value]').forEach((node) => { node.textContent = `${progress.progress}%`; });
    document.querySelectorAll('[data-progress-bar]').forEach((node) => { node.style.width = `${progress.progress}%`; });
    document.querySelectorAll('[data-achievements]').forEach((node) => { node.textContent = String(progress.achievements); });
    document.querySelectorAll('[data-completed-count]').forEach((node) => { node.textContent = String(progress.completedLessons.length); });
    document.querySelectorAll('[data-total-lessons]').forEach((node) => { node.textContent = String(state.session.lessons?.length || 0); });
    document.querySelectorAll('[data-passed-exams]').forEach((node) => { node.textContent = String(progress.passedExams.length); });
  }

  function escapePdfText(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function buildSimplePdfFromJpeg(jpegBinary, width, height) {
    const objects = [];
    const offsets = [];
    let pdf = '%PDF-1.4\n';

    function addObject(body) {
      offsets.push(pdf.length);
      pdf += `${offsets.length} 0 obj\n${body}\nendobj\n`;
    }

    addObject('<< /Type /Catalog /Pages 2 0 R >>');
    addObject('<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets.push(pdf.length);
    pdf += `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n`;
    pdf += jpegBinary;
    pdf += '\nendstream\nendobj\n';
    const contentStream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;
    addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  }

  async function downloadCertificatePdf() {
    const certificate = certificateStatus();
    if (!certificate.eligible) {
      setNotice(`يلزم اجتياز ${certificate.requiredExams} اختبارات على الأقل قبل تنزيل الشهادة.`);
      return;
    }
    const trackLabel = certificateTrackLabel();
    const issuedAt = formatDate(certificate.issuedAt || new Date().toISOString());
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setNotice('تعذر تجهيز ملف الشهادة الآن.');
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#07111f');
    gradient.addColorStop(1, '#0e2a45');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(55, 55, canvas.width - 110, canvas.height - 110);
    ctx.strokeStyle = '#103553';
    ctx.lineWidth = 16;
    ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);
    ctx.strokeStyle = '#5bb7ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(98, 98, canvas.width - 196, canvas.height - 196);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#12304b';
    ctx.font = '700 66px Tahoma';
    ctx.fillText('شهادة إتمام', canvas.width / 2, 220);

    ctx.fillStyle = '#2577b8';
    ctx.font = '600 34px Tahoma';
    ctx.fillText('منصة CodeCraft 3D', canvas.width / 2, 285);

    ctx.fillStyle = '#42576d';
    ctx.font = '500 28px Tahoma';
    ctx.fillText('تشهد المنصة بأن الطالب قد أكمل متطلبات الشهادة بنجاح في المسار التالي', canvas.width / 2, 390);

    ctx.fillStyle = '#081c2d';
    ctx.font = '700 58px Tahoma';
    ctx.fillText(certificate.studentName, canvas.width / 2, 500);

    ctx.fillStyle = '#1c6aa6';
    ctx.font = '700 46px Tahoma';
    ctx.fillText(trackLabel, canvas.width / 2, 590);

    ctx.fillStyle = '#42576d';
    ctx.font = '500 30px Tahoma';
    ctx.fillText(`بعد اجتياز ${certificate.passedCount} اختبارات تفاعلية واستيفاء الحد المطلوب داخل المنصة`, canvas.width / 2, 675);

    ctx.fillStyle = '#5a6f84';
    ctx.font = '500 24px Tahoma';
    ctx.fillText(`تاريخ الإصدار: ${issuedAt}`, 360, 905);
    ctx.fillText('جميع الحقوق محفوظة لعبده محمد عبده 2026', canvas.width - 360, 905);

    ctx.fillStyle = '#7890a8';
    ctx.font = '500 22px Tahoma';
    ctx.fillText('شهادة رقمية صادرة من داخل المنصة التعليمية', canvas.width / 2, 980);

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.96);
    const binary = atob(jpegDataUrl.split(',')[1]);
    const pdfString = buildSimplePdfFromJpeg(binary, 842, 595);
    const bytes = new Uint8Array(pdfString.length);
    for (let index = 0; index < pdfString.length; index += 1) {
      bytes[index] = pdfString.charCodeAt(index) & 0xff;
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTrack = String(trackLabel).replace(/[^\w\u0600-\u06FF-]+/g, '-');
    link.href = downloadUrl;
    link.download = `certificate-${safeTrack}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setNotice('تم تجهيز ملف الشهادة PDF وتنزيله بنجاح.');
  }

  function notificationTypeLabel(type) {
    if (type === 'success') return 'نجاح';
    if (type === 'warning') return 'تنبيه';
    return 'معلومة';
  }

  function renderNotifications() {
    const center = document.getElementById('notificationCenter');
    const list = document.getElementById('notificationList');
    const unreadNode = document.querySelector('[data-unread-notifications]');
    if (!center || !list || !unreadNode) return;

    const notifications = state.session.notifications || [];
    const unreadCount = Number(state.session.unreadNotifications || 0);
    unreadNode.textContent = String(unreadCount);

    if (!notifications.length) {
      center.hidden = true;
      return;
    }

    center.hidden = false;
    list.innerHTML = notifications.map((item) => `
      <article class="notification-item ${item.read ? 'is-read' : 'is-unread'}">
        <div class="notification-head">
          <span class="status-pill">${notificationTypeLabel(item.type)}</span>
          <span class="muted">${formatDate(item.createdAt)}</span>
        </div>
        <h4>${item.title}</h4>
        <p>${item.message}</p>
      </article>
    `).join('');

    const markAllButton = document.getElementById('markNotificationsReadBtn');
    if (markAllButton) {
      markAllButton.hidden = unreadCount === 0;
      markAllButton.onclick = async () => {
        try {
          await api('/api/notifications/read', { method: 'POST' });
          await loadSession();
          renderNotifications();
          renderUserSpots();
          renderPlanSpots();
          renderProgress();
          setNotice('تم تعليم كل الإشعارات كمقروءة.');
        } catch (error) {
          setNotice(error.message);
        }
      };
    }
  }

  function fillProfileForm() {
    const user = state.session.user;
    if (!user) return;
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');
    const phone = document.getElementById('profilePhone');
    const track = document.getElementById('profileTrack');
    const level = document.getElementById('profileLevel');
    const goal = document.getElementById('profileGoal');
    if (name) name.value = user.name || '';
    if (email) email.value = user.email || '';
    if (phone) phone.value = user.phone || '';
    if (track) track.value = user.track || 'Frontend';
    if (level) level.value = user.level || 'مبتدئ';
    if (goal) goal.value = user.goal || '';
  }

  function fillSupportForm() {
    const user = state.session.user;
    if (!user) return;
    const name = document.getElementById('supportName');
    const email = document.getElementById('supportEmail');
    const phone = document.getElementById('supportPhone');
    if (name) name.value = user.name || '';
    if (email) email.value = user.email || '';
    if (phone) phone.value = user.phone || '';
  }

  function updateNavForAuth() {
    const loggedIn = Boolean(state.session.authenticated);
    document.querySelectorAll('[data-auth-only]').forEach((node) => { node.hidden = !loggedIn; });
    document.querySelectorAll('[data-guest-only]').forEach((node) => { node.hidden = loggedIn; });
  }

  function renderVideoLibrary() {
    const wrap = document.getElementById('videoLibrary');
    if (!wrap) return;
    renderVideoLanguageSwitch();
    const progress = progressData();
    const tracks = courseTracks();
    const totalLessons = state.session.lessons.length;
    const completedCount = progress.completedLessons.length;
    const examsCount = Object.keys(state.session.exams || {}).length;
    const readyTracks = tracks.length;

    if (!tracks.length) {
      wrap.innerHTML = '<p class="muted">لا توجد مسارات جاهزة للعرض حاليًا.</p>';
      return;
    }

    const quickNav = document.getElementById('trackQuickNav');
    if (quickNav) {
      quickNav.innerHTML = tracks.map((track) => `
        <button class="chip video-nav-chip" type="button" data-track-nav="${track.key}">
          <span>${track.arabicTitle}</span>
          <strong>${track.levels.reduce((sum, level) => sum + level.modules.reduce((inner, module) => inner + module.lessons.length, 0), 0)} درس</strong>
        </button>
      `).join('');
    }

    wrap.innerHTML = `
      <section class="course-overview-grid">
        <article class="mini-card">
          <span class="muted">المسارات الرئيسية</span>
          <strong>${readyTracks}</strong>
          <p>Frontend و Backend و Full Stack جاهزين للتعبئة وربط الفيديوهات.</p>
        </article>
        <article class="mini-card">
          <span class="muted">إجمالي الدروس</span>
          <strong>${totalLessons}</strong>
          <p>الهيكل مقسم لمستويات ووحدات بدل مكتبة فيديوهات عامة.</p>
        </article>
        <article class="mini-card">
          <span class="muted">التقدم الحالي</span>
          <strong>${completedCount}</strong>
          <p>عدد الدروس التي أكد الطالب إتمامها حتى الآن.</p>
        </article>
        <article class="mini-card">
          <span class="muted">اختبارات المسار</span>
          <strong>${examsCount}</strong>
          <p>اختبارات جاهزة للدروس المفصلية داخل المسارات.</p>
        </article>
      </section>
      <section class="track-hero-grid">
        ${tracks.map((track) => {
          const trackLessons = track.levels.flatMap((level) => level.modules.flatMap((module) => module.lessons));
          const trackCompleted = trackLessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
          return `
            <article class="track-overview-card track-${track.color || 'cyan'}">
              <div class="track-card-head">
                <span class="status-pill">${track.arabicTitle}</span>
                <strong>${track.title}</strong>
              </div>
              <p>${track.audience}</p>
              <div class="lesson-meta">
                <span>${track.levels.length} مستويات</span>
                <span>${trackLessons.length} درس</span>
              </div>
              <div class="progress-bar track-progress"><span style="width:${trackLessons.length ? Math.round((trackCompleted / trackLessons.length) * 100) : 0}%"></span></div>
              <p class="inline-note">${track.outcome}</p>
            </article>
          `;
        }).join('')}
      </section>
      ${tracks.map((track) => `
        <section class="track-section" id="track-${track.key}">
          <div class="track-section-head">
            <div>
              <span class="status-pill">${track.arabicTitle}</span>
              <h3>${track.title}</h3>
            </div>
            <p>${track.outcome}</p>
          </div>
          <div class="track-levels">
            ${track.levels.map((level) => `
              <article class="level-block">
                <div class="level-block-head">
                  <div>
                    <span class="status-pill">${level.title}</span>
                    <h4>${level.summary}</h4>
                  </div>
                </div>
                <div class="module-stack">
                  ${level.modules.map((module) => `
                    <section class="module-block">
                      <div class="module-head">
                        <div>
                          <span class="muted">${module.title}</span>
                          <h5>${module.summary}</h5>
                        </div>
                        <span class="status-pill">${module.lessons.length} دروس</span>
                      </div>
                      <div class="module-lessons-grid">
                        ${module.lessons.map((lesson, lessonIndex) => {
                          const done = progress.completedLessons.includes(lesson.id);
                          const hasExam = Boolean(state.session.exams[lesson.id]);
                          const current = state.currentLessonId === lesson.id;
                          const playingArabic = current && state.currentVideoLanguage === 'ar';
                          const playingEnglish = current && state.currentVideoLanguage === 'en';
                          const durationText = lessonDurationLabel(lesson.duration);
                          const sources = lessonVideoSources(lesson);
                          const watch = watchRequirementForLesson(lesson.id);
                          const canComplete = done || watch.eligible;
                          const watchHint = done
                            ? 'تم اعتماد مشاهدة هذا الدرس.'
                            : watch.eligible
                              ? 'تمت مشاهدة الحد الأدنى ويمكنك الآن تأكيد الإكمال.'
                              : watch.startedAt
                                ? `شغّل الدرس وانتظر ${formatRemainingSeconds(watch.remainingSeconds)} لفتح الإكمال.`
                                : `يجب تشغيل الدرس ومشاهدته لمدة ${formatRemainingSeconds(watch.requiredSeconds)} قبل الإكمال.`;
                          return `
                            <article class="lesson-card ${done ? 'highlight' : ''} ${current ? 'is-current' : ''}">
                              <div class="video-placeholder">
                                <span>${lesson.videoLabel}</span>
                                <strong>${module.title}</strong>
                              </div>
                              <div class="lesson-tags">
                                <span class="status-pill">الدرس ${lessonIndex + 1}</span>
                                <span class="status-pill">${lesson.category}</span>
                                ${hasExam ? '<span class="status-pill">اختبار</span>' : ''}
                              </div>
                              <h3>${lesson.title}</h3>
                              <p>${lesson.summary}</p>
                              <div class="lesson-meta">
                                <span>${lesson.level}</span>
                                <span>${durationText}</span>
                              </div>
                              <div class="inline-actions lesson-language-actions">
                                <button class="btn ${playingArabic ? 'success' : 'secondary'}" ${sources.ar ? '' : 'disabled'} data-open-video="${lesson.id}" data-video-lang="ar" type="button">${playingArabic ? 'العربية تعمل الآن' : sources.ar ? 'مشاهدة بالعربية' : 'العربية قريبًا'}</button>
                                <button class="btn ${playingEnglish ? 'success' : 'secondary'}" ${sources.en ? '' : 'disabled'} data-open-video="${lesson.id}" data-video-lang="en" type="button">${playingEnglish ? 'English playing now' : sources.en ? 'Watch in English' : 'English unavailable'}</button>
                              </div>
                              <div class="lesson-language-status">
                                <span class="${sources.ar ? 'is-available' : 'is-missing'}">العربية: ${sources.ar ? 'متاحة' : 'غير مضافة'}</span>
                                <span class="${sources.en ? 'is-available' : 'is-missing'}">English: ${sources.en ? 'Available' : 'Missing'}</span>
                                <strong>${current ? `المفعلة الآن: ${videoLanguageLabel(state.currentVideoLanguage)}` : `المفضلة: ${videoLanguageLabel(state.videoLanguage)}`}</strong>
                              </div>
                              <p class="lesson-watch-hint ${canComplete ? 'is-ready' : ''}">${watchHint}</p>
                              <button class="btn ${done ? 'success' : canComplete ? '' : 'secondary'}" ${canComplete ? '' : 'disabled'} data-watch-lesson="${lesson.id}" type="button">
                                ${done ? 'تم إكمال الدرس' : canComplete ? 'تأكيد إكمال الدرس' : 'أكمل المشاهدة أولًا'}
                              </button>
                            </article>
                          `;
                        }).join('')}
                      </div>
                    </section>
                  `).join('')}
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      `).join('')}
    `;

    wrap.querySelectorAll('[data-watch-lesson]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await api(`/api/lessons/${button.dataset.watchLesson}/complete`, { method: 'POST' });
          setNotice('تم حفظ تقدمك وفتح الاختبار الخاص بهذا الدرس.');
          await loadSession();
          renderProgress();
          renderVideoLibrary();
        } catch (error) {
          setNotice(error.message);
        }
      });
    });

    wrap.querySelectorAll('[data-open-video]').forEach((button) => {
      button.addEventListener('click', () => {
        const lesson = state.session.lessons.find((item) => item.id === button.dataset.openVideo);
        const language = button.dataset.videoLang || state.videoLanguage;
        setPreferredVideoLanguage(language);
        openLessonVideo(lesson, language);
      });
    });

    quickNav?.querySelectorAll('[data-track-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = document.getElementById(`track-${button.dataset.trackNav}`);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function renderExamCards() {
    const wrap = document.getElementById('examGrid');
    if (!wrap) return;
    const progress = progressData();
    wrap.innerHTML = '';
    Object.entries(state.session.exams).forEach(([lessonId, exam]) => {
      const unlocked = progress.completedLessons.includes(lessonId);
      const solved = progress.passedExams.includes(lessonId);
      const lesson = state.session.lessons.find((item) => item.id === lessonId);
      const attempt = getExamAttempt(lessonId, exam, lesson);
      const questions = attempt.questions;
      const best = examBestScore(lessonId);
      const remainingSeconds = examRemainingSeconds(attempt);
      const expired = unlocked && examExpired(attempt);
      const selections = state.examSelections[lessonId] || {};
      const feedback = state.examFeedback[lessonId] || null;
      const card = document.createElement('article');
      card.className = `exam-card ${solved ? 'highlight' : ''}`;
      card.innerHTML = `
        <div class="exam-meta">
          <span>${solved ? 'تم الحل' : unlocked ? 'مفتوح' : 'مغلق'}</span>
          <span>${questions.length} أسئلة - النجاح من ${attempt.passScore}%</span>
        </div>
        <h3>${exam.title}</h3>
        <p class="muted">اختبار تفاعلي متعدد الأسئلة مع ترتيب عشوائي ودرجة فعلية قبل اعتماد النجاح.</p>
        <div class="exam-status-row">
          <span class="status-pill ${expired ? 'danger-lite' : ''}" data-exam-timer="${lessonId}">${unlocked ? `الوقت المتبقي: ${formatExamTimer(remainingSeconds)}` : 'يبدأ المؤقت بعد إكمال الدرس'}</span>
          <span class="status-pill">${best ? `أعلى درجة: ${best.score100}% (${best.score10}/10)` : 'لم تُسجل درجة بعد'}</span>
        </div>
        <div class="exam-question-stack">
          ${questions.map((questionItem, questionIndex) => `
            <section class="exam-question-block">
              <div class="exam-question-head">
                <span class="status-pill">السؤال ${questionIndex + 1}</span>
              </div>
              <p class="exam-question-text">${questionItem.question}</p>
              <div class="exam-options">
                ${questionItem.answers.map((answer, answerIndex) => {
                  const selected = selections[questionIndex] === answerIndex;
                  const correct = Boolean(answer.correct);
                  const revealCorrect = solved || Boolean(feedback);
                  const classes = [
                    'exam-option',
                    selected ? 'is-selected' : '',
                    revealCorrect && correct ? 'is-correct' : '',
                    revealCorrect && selected && !correct ? 'is-wrong' : ''
                  ].filter(Boolean).join(' ');
                  return `
                    <button class="${classes}" ${unlocked && !expired ? '' : 'disabled'} data-select-answer="${lessonId}" data-question-index="${questionIndex}" data-answer-index="${answerIndex}" type="button">
                      <span class="exam-option-mark">${answerIndex + 1}</span>
                      <span>${answer.text}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </section>
          `).join('')}
        </div>
        <div class="exam-feedback ${feedback ? `is-${feedback.type}` : ''}" ${feedback ? '' : 'hidden'} data-exam-feedback="${lessonId}">
          ${feedback?.message || ''}
        </div>
        <div class="inline-actions">
          <button class="btn ${unlocked ? 'success' : 'secondary'}" ${unlocked && !expired ? '' : 'disabled'} data-submit-exam="${lessonId}" type="button">
            ${unlocked ? (solved ? 'إعادة تصحيح المحاولة' : 'تصحيح الاختبار') : 'أكمل الدرس أولًا'}
          </button>
          ${unlocked ? `<button class="btn secondary" data-refresh-exam="${lessonId}" type="button">${solved ? 'محاولة جديدة لتحسين الدرجة' : 'تبديل الأسئلة'}</button>` : ''}
        </div>`;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll('[data-select-answer]').forEach((button) => {
      button.addEventListener('click', () => {
        const lessonId = button.dataset.selectAnswer;
        const questionIndex = Number(button.dataset.questionIndex);
        const answerIndex = Number(button.dataset.answerIndex);
        state.examSelections[lessonId] = state.examSelections[lessonId] || {};
        state.examSelections[lessonId][questionIndex] = answerIndex;
        state.examFeedback[lessonId] = null;
        renderExamCards();
      });
    });

    wrap.querySelectorAll('[data-refresh-exam]').forEach((button) => {
      button.addEventListener('click', () => {
        const lessonId = button.dataset.refreshExam;
        const exam = state.session.exams[lessonId];
        const lesson = state.session.lessons.find((item) => item.id === lessonId);
        getExamAttempt(lessonId, exam, lesson, true);
        setNotice('تم إنشاء محاولة جديدة بأسئلة وترتيب مختلفين.');
        renderExamCards();
      });
    });

    wrap.querySelectorAll('[data-submit-exam]').forEach((button) => {
      button.addEventListener('click', async () => {
        const lessonId = button.dataset.submitExam;
        const exam = state.session.exams[lessonId];
        const lesson = state.session.lessons.find((item) => item.id === lessonId);
        const attempt = getExamAttempt(lessonId, exam, lesson);
        if (examExpired(attempt)) {
          state.examFeedback[lessonId] = { type: 'error', message: 'انتهى وقت هذه المحاولة. ابدأ محاولة جديدة ليتم توليد أسئلة ومؤقت جديدين.' };
          renderExamCards();
          return;
        }
        const questions = attempt.questions;
        const selections = state.examSelections[lessonId] || {};
        const answeredAll = questions.every((_, index) => Number.isInteger(selections[index]));
        if (!answeredAll) {
          state.examFeedback[lessonId] = { type: 'error', message: 'أجب عن كل الأسئلة أولًا قبل التصحيح.' };
          renderExamCards();
          return;
        }
        const correctCount = questions.reduce((count, questionItem, index) => {
          const selectedAnswer = questionItem.answers[selections[index]];
          return count + (selectedAnswer?.correct ? 1 : 0);
        }, 0);
        const score100 = Math.round((correctCount / questions.length) * 100);
        const score10 = Math.round((score100 / 10) * 10) / 10;
        try {
          const result = await api(`/api/exams/${lessonId}/pass`, {
            method: 'POST',
            body: { score100, score10, correctCount, totalQuestions: questions.length }
          });
          if (score100 < attempt.passScore) {
            const best = result.bestScore;
            state.examFeedback[lessonId] = {
              type: 'error',
              message: `درجتك ${score100}% (${score10}/10). تحتاج إلى ${attempt.passScore}% على الأقل. أعلى درجة محفوظة لك الآن: ${best.score100}% (${best.score10}/10).`
            };
            await loadSession();
            renderProgress();
            renderExamSummary();
            renderExamCards();
            return;
          }
          state.examFeedback[lessonId] = {
            type: 'success',
            message: result.certificate?.eligible
              ? `ممتاز، درجتك ${score100}% (${score10}/10) وتم اعتماد النجاح. أصبحت الآن مؤهلًا لشهادة الإتمام.`
              : `ممتاز، درجتك ${score100}% (${score10}/10) وتم اعتماد النجاح. أعلى درجة محفوظة لك هي ${result.bestScore.score100}% (${result.bestScore.score10}/10).`
          };
          setNotice(`تم حفظ نتيجتك في ${state.session.exams[lessonId].title}.`);
          await loadSession();
          renderProgress();
          renderExamSummary();
          renderExamCards();
        } catch (error) {
          setNotice(error.message);
        }
      });
    });
  }

  function renderExamSummary() {
    const panel = document.getElementById('examSummaryPanel');
    if (!panel) return;
    const progress = progressData();
    const certificate = certificateStatus();
    const bestScores = Object.values(progress.examBestScores || {});
    const averageBest = bestScores.length
      ? Math.round(bestScores.reduce((sum, item) => sum + Number(item.score100 || 0), 0) / bestScores.length)
      : 0;
    panel.innerHTML = `
      <section class="exam-summary-grid">
        <article class="mini-card">
          <span class="muted">الاختبارات المجتازة</span>
          <strong>${progress.passedExams.length}</strong>
          <p>كل اختبار ناجح يفتح لك خطوة أقرب نحو الشهادة.</p>
        </article>
        <article class="mini-card">
          <span class="muted">أعلى متوسط درجات</span>
          <strong>${averageBest}%</strong>
          <p>يتم حفظ أعلى نتيجة لكل اختبار حتى بعد إعادة المحاولة.</p>
        </article>
        <article class="mini-card">
          <span class="muted">الشهادة</span>
          <strong>${certificate.eligible ? 'جاهزة' : `${certificate.remainingExams} متبقية`}</strong>
          <p>${certificate.eligible ? 'يمكنك الآن طباعة شهادة الإتمام من داخل المنصة.' : `يلزم اجتياز ${certificate.requiredExams} اختبارات على الأقل.`}</p>
        </article>
      </section>
      <section class="certificate-panel ${certificate.eligible ? 'is-ready' : ''}">
        <div>
          <span class="status-pill">${certificate.eligible ? 'مؤهل للشهادة' : 'قيد التقدم'}</span>
          <h3>شهادة إتمام الاختبارات التفاعلية</h3>
          <p>${certificate.eligible ? `${certificate.studentName} أصبح مؤهلًا الآن للحصول على شهادة PDF خاصة بـ ${certificateTrackLabel()}.` : `باقي لك ${certificate.remainingExams} اختبار للوصول إلى الحد المطلوب للشهادة.`}</p>
        </div>
        <button class="btn ${certificate.eligible ? 'success' : 'secondary'}" ${certificate.eligible ? '' : 'disabled'} id="printCertificateBtn" type="button">
          ${certificate.eligible ? 'تنزيل الشهادة PDF' : 'الشهادة غير متاحة بعد'}
        </button>
      </section>
    `;
    document.getElementById('printCertificateBtn')?.addEventListener('click', downloadCertificatePdf);
  }

  function bindLogout() {
    const button = document.getElementById('logoutBtn');
    if (!button) return;
    button.addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  function initLoginPage() {
    const form = document.getElementById('loginForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/api/login', {
          method: 'POST',
          body: {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
          }
        });
        window.location.href = '/dashboard.html';
      } catch (error) {
        setNotice(error.message);
      }
    });

    const resetForm = document.getElementById('resetPasswordForm');
    resetForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api('/api/reset-password', {
          method: 'POST',
          body: {
            email: document.getElementById('resetEmail').value.trim(),
            phone: document.getElementById('resetPhone').value.trim(),
            newPassword: document.getElementById('newPassword').value
          }
        });
        setNotice(result.message || 'تم تحديث كلمة المرور بنجاح.');
        resetForm.reset();
      } catch (error) {
        setNotice(error.message);
      }
    });
  }

  function initRegisterPage() {
    const form = document.getElementById('registerForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/api/register', {
          method: 'POST',
          body: {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            track: document.getElementById('track').value,
            level: document.getElementById('level').value,
            goal: document.getElementById('goal').value.trim(),
            password: document.getElementById('registerPassword').value
          }
        });
        window.location.href = '/subscription.html';
      } catch (error) {
        setNotice(error.message);
      }
    });
  }

  function initSubscriptionPage() {
    renderUserSpots();
    renderPlanSpots();
    document.querySelectorAll('[data-select-plan]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const result = await api('/api/subscription/request', {
            method: 'POST',
            body: { planKey: button.dataset.selectPlan }
          });
          setNotice(`تم تجهيز طلب الاشتراك. كود الطلب: ${result.requestCode}`);
          await loadSession();
          renderPlanSpots();
          window.location.href = result.whatsappUrl;
        } catch (error) {
          setNotice(error.message);
        }
      });
    });
    const form = document.getElementById('activationForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/api/subscription/activate', {
          method: 'POST',
          body: { code: document.getElementById('activationCode').value.trim() }
        });
        window.location.href = '/dashboard.html';
      } catch (error) {
        setNotice(error.message);
      }
    });
  }

  function initDashboardPage() {
    renderUserSpots();
    renderPlanSpots();
    renderProgress();
    renderNotifications();
    const ticket = state.session.latestSupportTicket;
    const ticketCard = document.getElementById('dashboardSupportCard');
    if (ticket && ticketCard) {
      ticketCard.hidden = false;
      document.querySelector('[data-dashboard-ticket-id]').textContent = `#${ticket.id}`;
      document.querySelector('[data-dashboard-ticket-subject]').textContent = ticket.subject || '-';
      document.querySelector('[data-dashboard-ticket-status]').textContent = supportStatusLabel(ticket.status);
      document.querySelector('[data-dashboard-ticket-updated]').textContent = formatDate(ticket.updatedAt);
      const replyNode = document.getElementById('dashboardSupportReply');
      if (replyNode) {
        replyNode.hidden = !ticket.adminReply;
        if (ticket.adminReply) replyNode.textContent = ticket.adminReply;
      }
    }
  }

  function initSupportPage() {
    fillSupportForm();
    const ticketStatusCard = document.getElementById('ticketStatusCard');
    let trackedTicket = null;

    function renderConversation(conversation) {
      const wrap = document.getElementById('ticketConversation');
      if (!wrap) return;
      const items = Array.isArray(conversation) ? conversation : [];
      if (!items.length) {
        wrap.innerHTML = '<p class="muted">لا توجد رسائل داخل هذه التذكرة حتى الآن.</p>';
        return;
      }
      wrap.innerHTML = items.map((item) => `
        <article class="conversation-bubble ${item.authorType === 'admin' ? 'is-admin' : 'is-user'}">
          <strong>${item.authorType === 'admin' ? 'الإدارة' : (item.authorName || 'الطالب')}</strong>
          <span class="muted">${formatDate(item.createdAt)}</span>
          <p>${item.message}</p>
        </article>
      `).join('');
    }

    function renderTicketStatus(ticket) {
      if (!ticketStatusCard) return;
      trackedTicket = ticket;
      ticketStatusCard.hidden = false;
      document.querySelector('[data-ticket-id]').textContent = `#${ticket.id}`;
      document.querySelector('[data-ticket-subject]').textContent = ticket.subject || '-';
      document.querySelector('[data-ticket-status]').textContent = supportStatusLabel(ticket.status);
      document.querySelector('[data-ticket-created]').textContent = formatDate(ticket.createdAt);
      document.querySelector('[data-ticket-updated]').textContent = formatDate(ticket.updatedAt);
      renderConversation(ticket.conversation);
      const replyForm = document.getElementById('ticketReplyForm');
      const replyMessage = document.getElementById('ticketReplyMessage');
      if (replyForm && replyMessage) {
        const isClosed = ticket.status === 'closed';
        replyMessage.disabled = isClosed;
        replyMessage.placeholder = isClosed ? 'هذه التذكرة مغلقة نهائيًا.' : 'اكتب أي تفاصيل إضافية أو رد على الإدارة...';
        const submitButton = replyForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = isClosed;
      }
    }

    const whatsappButton = document.getElementById('supportWhatsappBtn');
    if (whatsappButton) {
      whatsappButton.href = `https://wa.me/201280272177?text=${encodeURIComponent('السلام عليكم، عندي مشكلة في الموقع وأحتاج دعم فني.')}`;
    }

    const form = document.getElementById('supportForm');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const submittedEmail = document.getElementById('supportEmail').value.trim();
        const result = await api('/api/support/create', {
          method: 'POST',
          body: {
            name: document.getElementById('supportName').value.trim(),
            email: submittedEmail,
            phone: document.getElementById('supportPhone').value.trim(),
            subject: document.getElementById('supportSubject').value,
            message: document.getElementById('supportMessage').value.trim()
          }
        });
        form.reset();
        fillSupportForm();
        renderTicketStatus(result.ticket);
        const trackEmail = document.getElementById('trackTicketEmail');
        const trackTicketId = document.getElementById('trackTicketId');
        if (trackEmail) trackEmail.value = submittedEmail || state.session.user?.email || '';
        if (trackTicketId) trackTicketId.value = String(result.ticket.id);
        setNotice(`تم إرسال طلب الدعم بنجاح. رقم التذكرة: #${result.ticket.id}`);
      } catch (error) {
        setNotice(error.message);
      }
    });

    const trackForm = document.getElementById('trackTicketForm');
    trackForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api('/api/support/track', {
          method: 'POST',
          body: {
            ticketId: document.getElementById('trackTicketId').value.trim(),
            email: document.getElementById('trackTicketEmail').value.trim()
          }
        });
        renderTicketStatus(result.ticket);
        setNotice(`هذه هي آخر حالة للتذكرة #${result.ticket.id}.`);
      } catch (error) {
        if (ticketStatusCard) ticketStatusCard.hidden = true;
        trackedTicket = null;
        setNotice(error.message);
      }
    });

    document.getElementById('ticketReplyForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!trackedTicket) {
        setNotice('اعرض التذكرة أولًا قبل إرسال متابعة جديدة.');
        return;
      }
      try {
        const result = await api('/api/support/reply', {
          method: 'POST',
          body: {
            ticketId: trackedTicket.id,
            email: document.getElementById('trackTicketEmail').value.trim(),
            message: document.getElementById('ticketReplyMessage').value.trim()
          }
        });
        document.getElementById('ticketReplyForm').reset();
        renderTicketStatus(result.ticket);
        setNotice(`تمت إضافة متابعتك إلى التذكرة #${result.ticket.id}.`);
      } catch (error) {
        setNotice(error.message);
      }
    });
  }

  function initProfilePage() {
    renderUserSpots();
    renderPlanSpots();
    renderProgress();
    fillProfileForm();
    const profileForm = document.getElementById('profileUpdateForm');
    profileForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/api/account/update', {
          method: 'POST',
          body: {
            name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim(),
            track: document.getElementById('profileTrack').value,
            level: document.getElementById('profileLevel').value,
            goal: document.getElementById('profileGoal').value.trim()
          }
        });
        await loadSession();
        renderUserSpots();
        renderPlanSpots();
        renderProgress();
        fillProfileForm();
        setNotice('تم حفظ تعديلات الحساب بنجاح.');
      } catch (error) {
        setNotice(error.message);
      }
    });
    bindLogout();
  }

  function initVideosPage() {
    renderProgress();
    resetLessonPlayer();
    renderVideoLibrary();
    if (state.lessonWatchTicker) window.clearInterval(state.lessonWatchTicker);
    state.lessonWatchTicker = window.setInterval(() => {
      const watchMap = state.session.watchRequirements || {};
      let changed = false;
      Object.keys(watchMap).forEach((lessonId) => {
        const watch = watchMap[lessonId];
        if (!watch || watch.eligible || watch.watched || !watch.eligibleAt) return;
        const remainingSeconds = Math.max(0, Math.ceil((new Date(watch.eligibleAt).getTime() - Date.now()) / 1000));
        if (remainingSeconds !== watch.remainingSeconds) {
          watch.remainingSeconds = remainingSeconds;
          if (remainingSeconds <= 0) watch.eligible = true;
          changed = true;
        }
      });
      if (changed) renderVideoLibrary();
    }, 1000);
    document.getElementById('clearLessonPlayerBtn')?.addEventListener('click', () => {
      resetLessonPlayer();
      renderVideoLibrary();
    });
  }

  function initExamsPage() {
    renderExamSummary();
    renderProgress();
    renderExamCards();
    if (state.examTimerTicker) window.clearInterval(state.examTimerTicker);
    state.examTimerTicker = window.setInterval(() => {
      Object.entries(state.examAttempts).forEach(([lessonId, attempt]) => {
        const node = document.querySelector(`[data-exam-timer="${lessonId}"]`);
        if (!node) return;
        const unlocked = progressData().completedLessons.includes(lessonId);
        if (!unlocked) {
          node.textContent = 'يبدأ المؤقت بعد إكمال الدرس';
          return;
        }
        const remaining = examRemainingSeconds(attempt);
        node.textContent = remaining > 0 ? `الوقت المتبقي: ${formatExamTimer(remaining)}` : 'انتهى وقت المحاولة';
        node.classList.toggle('danger-lite', remaining === 0);
      });
    }, 1000);
  }

  async function initAdminPage() {
    const loginPanel = document.getElementById('adminLoginPanel');
    const adminPanel = document.getElementById('adminPanel');

    function matchesAdminFilters(item) {
      const planFilter = document.getElementById('adminPlanFilter')?.value || 'all';
      const statusFilter = document.getElementById('adminStatusFilter')?.value || 'all';
      const searchValue = (document.getElementById('adminSearchInput')?.value || '').trim().toLowerCase();
      const planOk = planFilter === 'all' || item.plan_key === planFilter;
      const statusOk = statusFilter === 'all'
        || (statusFilter === 'available' && !item.used && !item.disabled)
        || (statusFilter === 'used' && Boolean(item.used))
        || (statusFilter === 'disabled' && Boolean(item.disabled));
      const searchOk = !searchValue
        || item.code.toLowerCase().includes(searchValue)
        || String(item.used_by_email || '').toLowerCase().includes(searchValue);
      return planOk && statusOk && searchOk;
    }

    async function copyText(text) {
      await navigator.clipboard.writeText(text);
    }

    function whatsappPhone(phone) {
      const digits = String(phone || '').replace(/\D/g, '');
      if (!digits) return '201280272177';
      if (digits.startsWith('20')) return digits;
      if (digits.startsWith('0')) return `2${digits}`;
      return digits;
    }

    function bindAdminTableActions() {
      document.querySelectorAll('[data-copy-code]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await copyText(button.dataset.copyCode);
            setNotice(`تم نسخ الكود ${button.dataset.copyCode}`);
          } catch (error) {
            setNotice('تعذر النسخ التلقائي. انسخ الكود يدويًا من الجدول.');
          }
        });
      });
      document.querySelectorAll('[data-toggle-code]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await api(`/api/admin/codes/${encodeURIComponent(button.dataset.toggleCode)}/toggle`, {
              method: 'POST',
              body: { disabled: button.dataset.disabled === 'true' }
            });
            setNotice(button.dataset.disabled === 'true' ? 'تم إيقاف الكود.' : 'تمت إعادة تفعيل الكود.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });
      document.querySelectorAll('[data-delete-code]').forEach((button) => {
        button.addEventListener('click', async () => {
          const confirmed = window.confirm(`هل تريد حذف الكود ${button.dataset.deleteCode}؟`);
          if (!confirmed) return;
          try {
            await api(`/api/admin/codes/${encodeURIComponent(button.dataset.deleteCode)}`, {
              method: 'DELETE'
            });
            setNotice('تم حذف الكود.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });
    }

    function renderRequestsTable() {
      const tbody = document.getElementById('adminRequestsTable');
      if (!tbody) return;
      if (!state.adminRequests.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="padding:18px;text-align:center;color:var(--muted);">لا توجد طلبات اشتراك معلقة حاليًا.</td>
          </tr>
        `;
        return;
      }
      tbody.innerHTML = state.adminRequests.map((item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.label || state.session.plans[item.plan_key]?.label || item.plan_key}</td>
          <td>${item.email}</td>
          <td>${item.phone}</td>
          <td class="code-cell">${item.request_code}</td>
          <td>${item.updated_at ? formatDate(item.updated_at) : '-'}</td>
        </tr>
      `).join('');
    }

    function supportStatusLabel(status) {
      if (status === 'resolved') return 'تم الحل';
      if (status === 'in_progress') return 'جارٍ المتابعة';
      if (status === 'closed') return 'مغلقة';
      return 'مفتوحة';
    }

    function renderSupportTicketsTable() {
      const tbody = document.getElementById('adminSupportTable');
      if (!tbody) return;
      const supportStatusFilter = document.getElementById('adminSupportStatusFilter')?.value || 'all';
      const supportSearchValue = (document.getElementById('adminSupportSearchInput')?.value || '').trim().toLowerCase();
      const visibleTickets = state.adminTickets.filter((item) => {
        const statusOk = supportStatusFilter === 'all' || item.status === supportStatusFilter;
        const haystack = [
          item.id,
          item.name,
          item.email,
          item.subject,
          item.phone,
          ...(item.conversation || []).map((message) => message.message)
        ].join(' ').toLowerCase();
        const searchOk = !supportSearchValue || haystack.includes(supportSearchValue);
        return statusOk && searchOk;
      });

      if (!visibleTickets.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="padding:18px;text-align:center;color:var(--muted);">لا توجد تذاكر مطابقة للفلاتر الحالية.</td>
          </tr>
        `;
        return;
      }
      tbody.innerHTML = visibleTickets.map((item) => `
        <tr>
          <td class="code-cell">#${item.id}</td>
          <td>${item.name}</td>
          <td>${item.email}</td>
          <td>${item.phone}</td>
          <td>${item.subject}</td>
          <td>${(item.conversation || []).map((message) => `
            <div class="conversation-line ${message.authorType === 'admin' ? 'admin' : 'user'}">
              <strong>${message.authorType === 'admin' ? 'الإدارة' : 'الطالب'}:</strong> ${message.message}
            </div>
          `).join('')}</td>
          <td>
            <textarea class="admin-reply-input" data-reply-input="${item.id}" rows="4" placeholder="اكتب ردًا يظهر للطالب مباشرة...">${item.admin_reply || ''}</textarea>
            <div class="muted" style="margin-top:8px;">${item.admin_reply_at ? `آخر رد: ${formatDate(item.admin_reply_at)}` : 'لا يوجد رد بعد'}</div>
          </td>
          <td>${supportStatusLabel(item.status)}</td>
          <td class="admin-actions-cell">
            <button class="admin-action-btn" type="button" data-support-status="${item.id}" data-status-value="open">فتح</button>
            <button class="admin-action-btn" type="button" data-support-status="${item.id}" data-status-value="in_progress">متابعة</button>
            <button class="admin-action-btn" type="button" data-support-status="${item.id}" data-status-value="resolved">حل</button>
            <button class="admin-action-btn" type="button" data-support-status="${item.id}" data-status-value="closed">إغلاق</button>
            <button class="admin-action-btn" type="button" data-send-reply="${item.id}">حفظ الرد</button>
            <button class="admin-action-btn" type="button" data-send-whatsapp="${item.id}" data-ticket-name="${item.name}" data-ticket-phone="${item.phone}">واتساب</button>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('[data-support-status]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            const replyInput = document.querySelector(`[data-reply-input="${button.dataset.supportStatus}"]`);
            await api(`/api/admin/support/${button.dataset.supportStatus}/status`, {
              method: 'POST',
              body: { status: button.dataset.statusValue, reply: replyInput ? replyInput.value.trim() : '' }
            });
            setNotice('تم تحديث حالة تذكرة الدعم.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });

      document.querySelectorAll('[data-send-reply]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            const replyInput = document.querySelector(`[data-reply-input="${button.dataset.sendReply}"]`);
            await api(`/api/admin/support/${button.dataset.sendReply}/status`, {
              method: 'POST',
              body: { status: 'in_progress', reply: replyInput ? replyInput.value.trim() : '' }
            });
            setNotice('تم حفظ رد الإدارة داخل التذكرة.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });

      document.querySelectorAll('[data-send-whatsapp]').forEach((button) => {
        button.addEventListener('click', () => {
          const replyInput = document.querySelector(`[data-reply-input="${button.dataset.sendWhatsapp}"]`);
          const reply = replyInput ? replyInput.value.trim() : '';
          const message = `السلام عليكم ${button.dataset.ticketName}، بخصوص طلب الدعم الفني رقم #${button.dataset.sendWhatsapp}.${reply ? `\nرد الإدارة: ${reply}` : ''}`;
          window.open(`https://wa.me/${whatsappPhone(button.dataset.ticketPhone)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
        });
      });
    }

    function renderAdminActivityTable() {
      const tbody = document.getElementById('adminActivityTable');
      if (!tbody) return;
      if (!state.adminActivity.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="padding:18px;text-align:center;color:var(--muted);">لا توجد أنشطة مسجلة حتى الآن.</td>
          </tr>
        `;
        return;
      }
      tbody.innerHTML = state.adminActivity.map((item) => `
        <tr>
          <td>${item.createdAt ? formatDate(item.createdAt) : '-'}</td>
          <td>${item.actor || 'admin'}</td>
          <td>${item.action}</td>
          <td>${item.details || '-'}</td>
        </tr>
      `).join('');
    }

    function renderAdminLoginLocksTable() {
      const tbody = document.getElementById('adminLoginLocksTable');
      if (!tbody) return;
      if (!state.adminLoginLocks.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="padding:18px;text-align:center;color:var(--muted);">لا توجد حسابات محظورة مؤقتًا حاليًا.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.adminLoginLocks.map((item) => `
        <tr>
          <td>${item.userName || '-'}</td>
          <td>${item.email}</td>
          <td>${item.failedCount}</td>
          <td>${item.lastAttemptAt ? formatDate(item.lastAttemptAt) : '-'}</td>
          <td>${item.lockedUntil ? formatDate(item.lockedUntil) : '-'}</td>
          <td><button class="admin-action-btn" type="button" data-unlock-login="${item.email}">فك الحظر</button></td>
        </tr>
      `).join('');

      document.querySelectorAll('[data-unlock-login]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            const result = await api('/api/admin/login-locks/unlock', {
              method: 'POST',
              body: { email: button.dataset.unlockLogin }
            });
            setNotice(result.message || 'تم فك الحظر بنجاح.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });
    }

    function renderAdminStudentsTable() {
      const tbody = document.getElementById('adminStudentsTable');
      if (!tbody) return;
      const statusFilter = document.getElementById('adminStudentsStatusFilter')?.value || 'all';
      const searchValue = (document.getElementById('adminStudentsSearchInput')?.value || '').trim().toLowerCase();
      const visibleStudents = state.adminStudents.filter((item) => {
        const statusOk = statusFilter === 'all' || item.subscriptionStatus === statusFilter;
        const haystack = [item.name, item.email, item.phone, item.track, item.level, item.subscriptionLabel].join(' ').toLowerCase();
        const searchOk = !searchValue || haystack.includes(searchValue);
        return statusOk && searchOk;
      });

      if (!visibleStudents.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="padding:18px;text-align:center;color:var(--muted);">لا توجد حسابات مطابقة للفلاتر الحالية.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = visibleStudents.map((item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.email}</td>
          <td>${item.phone}</td>
          <td>${item.track} / ${item.level}</td>
          <td>${item.subscriptionLabel}${item.expiresAt ? ` - حتى ${formatDate(item.expiresAt)}` : ''}</td>
          <td>${item.progress}% - ${item.completedLessons} درس</td>
          <td>${item.lastSeenAt ? formatDate(item.lastSeenAt) : '-'}</td>
        </tr>
      `).join('');
    }

    function formatBytes(bytes) {
      const value = Number(bytes || 0);
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    }

    function renderAdminBackupsTable() {
      const tbody = document.getElementById('adminBackupsTable');
      if (!tbody) return;
      if (!state.adminBackups.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="padding:18px;text-align:center;color:var(--muted);">لا توجد نسخ احتياطية متاحة حاليًا.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.adminBackups.map((item) => `
        <tr>
          <td class="code-cell">${item.name}</td>
          <td>${formatBytes(item.size)}</td>
          <td>${formatDate(item.modifiedAt)}</td>
          <td><button class="admin-action-btn danger-lite" type="button" data-restore-backup="${item.name}">استعادة</button></td>
        </tr>
      `).join('');

      document.querySelectorAll('[data-restore-backup]').forEach((button) => {
        button.addEventListener('click', async () => {
          const confirmed = window.confirm(`هل تريد استعادة النسخة ${button.dataset.restoreBackup}؟ سيتم استبدال البيانات الحالية.`);
          if (!confirmed) return;
          try {
            const result = await api('/api/admin/backups/restore', {
              method: 'POST',
              body: { filename: button.dataset.restoreBackup }
            });
            setNotice(result.message || 'تمت استعادة النسخة الاحتياطية.');
            await renderCodes();
          } catch (error) {
            setNotice(error.message);
          }
        });
      });
    }

    function bindSupportFilters() {
      ['adminSupportStatusFilter', 'adminSupportSearchInput'].forEach((id) => {
        const element = document.getElementById(id);
        element?.addEventListener('input', renderSupportTicketsTable);
        element?.addEventListener('change', renderSupportTicketsTable);
      });
    }

    function bindStudentsFilters() {
      ['adminStudentsStatusFilter', 'adminStudentsSearchInput'].forEach((id) => {
        const element = document.getElementById(id);
        element?.addEventListener('input', renderAdminStudentsTable);
        element?.addEventListener('change', renderAdminStudentsTable);
      });
    }

    function renderAdminAnalytics() {
      const analytics = state.adminAnalytics || {};
      const studentsNode = document.querySelector('[data-analytics-students]');
      const activeSubsNode = document.querySelector('[data-analytics-active-subscriptions]');
      const supportTicketsNode = document.querySelector('[data-analytics-support-tickets]');
      const lessonsNode = document.querySelector('[data-analytics-completed-lessons]');
      const issuesList = document.getElementById('topIssuesList');
      const lessonsList = document.getElementById('topLessonsList');

      if (studentsNode) studentsNode.textContent = String(analytics.studentsCount || 0);
      if (activeSubsNode) activeSubsNode.textContent = String(analytics.activeSubscriptionsCount || 0);
      if (supportTicketsNode) supportTicketsNode.textContent = String(analytics.supportTicketsCount || 0);
      if (lessonsNode) lessonsNode.textContent = String(analytics.completedLessonsCount || 0);

      if (issuesList) {
        const topIssues = analytics.topIssues || [];
        issuesList.innerHTML = topIssues.length
          ? topIssues.map((item, index) => `
            <div class="analytics-row">
              <span class="analytics-rank">#${index + 1}</span>
              <strong>${item.subject}</strong>
              <span>${item.count} مرة</span>
            </div>
          `).join('')
          : '<p class="muted">لا توجد بيانات دعم كافية حتى الآن.</p>';
      }

      if (lessonsList) {
        const topLessons = analytics.topLessons || [];
        lessonsList.innerHTML = topLessons.length
          ? topLessons.map((item, index) => `
            <div class="analytics-row">
              <span class="analytics-rank">#${index + 1}</span>
              <strong>${item.title}</strong>
              <span>${item.count} مشاهدة</span>
            </div>
          `).join('')
          : '<p class="muted">لا توجد بيانات مشاهدة كافية حتى الآن.</p>';
      }
    }

    function renderSubscriptionReportList(containerId, rows, mode) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (!rows.length) {
        container.innerHTML = '<p class="muted">لا توجد حسابات في هذا القسم حاليًا.</p>';
        return;
      }

      container.innerHTML = rows.map((item) => {
        const message = mode === 'expired'
          ? `السلام عليكم ${item.name}، اشتراكك في ${item.planLabel} انتهى. نقدر نساعدك في التجديد لو تحب.`
          : `السلام عليكم ${item.name}، اشتراكك في ${item.planLabel} سينتهي بتاريخ ${formatDate(item.expiresAt)}. نحب ننبهك قبل الانتهاء.`;
        return `
          <div class="analytics-row">
            <span class="analytics-rank">${mode === 'expired' ? 'منتهي' : `${item.daysLeft}ي`}</span>
            <div>
              <strong>${item.name}</strong>
              <div class="muted">${item.planLabel} - ${item.email} - ${formatDate(item.expiresAt)}</div>
            </div>
            <a class="admin-action-btn" href="https://wa.me/${whatsappPhone(item.phone)}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">واتساب</a>
          </div>
        `;
      }).join('');
    }

    function renderSubscriptionReports() {
      const reports = state.adminSubscriptionReports || { expired: [], expiring3: [], expiring7: [] };
      renderSubscriptionReportList('expiredSubscriptionsList', reports.expired || [], 'expired');
      renderSubscriptionReportList('expiring3SubscriptionsList', reports.expiring3 || [], 'expiring3');
      renderSubscriptionReportList('expiring7SubscriptionsList', reports.expiring7 || [], 'expiring7');
    }

    function renderAdminTable() {
      const tbody = document.getElementById('adminCodesTable');
      const visibleCodes = state.adminCodes.filter(matchesAdminFilters);
      if (!visibleCodes.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="padding:18px;text-align:center;color:var(--muted);">لا توجد نتائج مطابقة للفلاتر الحالية.</td>
          </tr>
        `;
        return;
      }
      tbody.innerHTML = visibleCodes.map((item) => `
        <tr>
          <td class="code-cell">${item.code}</td>
          <td>${state.session.plans[item.plan_key]?.label || item.plan_key}</td>
          <td>${item.used ? 'مستخدم' : item.disabled ? 'موقوف' : 'متاح'}</td>
          <td>${item.used_by_email || '-'}</td>
          <td>${item.used_at ? formatDate(item.used_at) : '-'}</td>
          <td class="admin-actions-cell">
            <button class="admin-action-btn" type="button" data-copy-code="${item.code}">نسخ</button>
            ${item.used ? '' : `<button class="admin-action-btn" type="button" data-toggle-code="${item.code}" data-disabled="${item.disabled ? 'false' : 'true'}">${item.disabled ? 'تفعيل' : 'إيقاف'}</button>`}
            ${item.used ? '' : `<button class="admin-action-btn danger-lite" type="button" data-delete-code="${item.code}">حذف</button>`}
          </td>
        </tr>
      `).join('');
      bindAdminTableActions();
    }

    function bindAdminFilters() {
      ['adminPlanFilter', 'adminStatusFilter', 'adminSearchInput'].forEach((id) => {
        const element = document.getElementById(id);
        element?.addEventListener('input', renderAdminTable);
        element?.addEventListener('change', renderAdminTable);
      });
    }

    function bindQuickCopyButtons() {
      document.querySelectorAll('[data-copy-plan]').forEach((button) => {
        button.addEventListener('click', async () => {
          const code = state.adminCodes.find((item) => item.plan_key === button.dataset.copyPlan && !item.used);
          if (!code) {
            setNotice('لا يوجد كود متاح حاليًا لهذه الباقة.');
            return;
          }
          try {
            await copyText(code.code);
            setNotice(`تم نسخ أول كود متاح: ${code.code}`);
          } catch (error) {
            setNotice(`الكود الجاهز لهذه الباقة هو: ${code.code}`);
          }
        });
      });
    }

    async function renderCodes() {
      const result = await api('/api/admin/codes');
      state.adminAnalytics = result.analytics || null;
      state.adminSubscriptionReports = result.subscriptionReports || null;
      state.adminStudents = result.students || [];
      state.adminBackups = result.backups || [];
      state.adminCodes = result.codes;
      state.adminRequests = result.requests || [];
      state.adminTickets = result.supportTickets || [];
      state.adminLoginLocks = result.loginLocks || [];
      state.adminActivity = result.adminActivity || [];
      document.querySelector('[data-admin-total]').textContent = String(result.summary.total);
      document.querySelector('[data-admin-available]').textContent = String(result.summary.available);
      document.querySelector('[data-admin-used]').textContent = String(result.summary.used);
      document.querySelector('[data-admin-disabled]').textContent = String(result.summary.disabled || 0);
      document.querySelector('[data-admin-pending]').textContent = String(result.summary.pendingRequests || 0);
      const openTicketsNode = document.querySelector('[data-admin-open-tickets]');
      if (openTicketsNode) openTicketsNode.textContent = String(result.summary.openTickets || 0);
      const lockedLoginsNode = document.querySelector('[data-admin-locked-logins]');
      if (lockedLoginsNode) lockedLoginsNode.textContent = String(result.summary.lockedLogins || 0);
      renderAdminAnalytics();
      renderSubscriptionReports();
      renderRequestsTable();
      renderSupportTicketsTable();
      renderAdminLoginLocksTable();
      renderAdminActivityTable();
      renderAdminStudentsTable();
      renderAdminBackupsTable();
      renderAdminTable();
      loginPanel.hidden = true;
      adminPanel.hidden = false;
    }

    const session = await api('/api/admin/session');
    if (session.authenticated) {
      await renderCodes();
    }

    document.getElementById('adminLoginForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/api/admin/login', {
          method: 'POST',
          body: {
            username: document.getElementById('adminUsername').value.trim(),
            password: document.getElementById('adminPassword').value
          }
        });
        await renderCodes();
        setNotice('تم تسجيل دخول الإدارة بنجاح.');
      } catch (error) {
        setNotice(error.message);
      }
    });

    document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
      await api('/api/admin/logout', { method: 'POST' });
      adminPanel.hidden = true;
      loginPanel.hidden = false;
      setNotice('تم تسجيل خروج الإدارة.');
    });

    document.getElementById('adminPasswordForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = document.getElementById('adminCurrentPassword').value;
      const newPassword = document.getElementById('adminNewPassword').value;
      const confirmPassword = document.getElementById('adminConfirmPassword').value;
      if (newPassword !== confirmPassword) {
        setNotice('تأكيد كلمة المرور الجديدة غير مطابق.');
        return;
      }
      try {
        const result = await api('/api/admin/change-password', {
          method: 'POST',
          body: { currentPassword, newPassword }
        });
        document.getElementById('adminPasswordForm').reset();
        setNotice(result.message || 'تم تحديث كلمة مرور الأدمن.');
      } catch (error) {
        setNotice(error.message);
      }
    });

    document.getElementById('generateCodesForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api('/api/admin/codes/generate', {
          method: 'POST',
          body: {
            planKey: document.getElementById('generatePlanKey').value,
            count: Number(document.getElementById('generateCount').value)
          }
        });
        setNotice(`تم توليد ${result.generated.length} كود جديد.`);
        await renderCodes();
      } catch (error) {
        setNotice(error.message);
      }
    });

    bindAdminFilters();
    bindSupportFilters();
    bindStudentsFilters();
    bindQuickCopyButtons();
  }

  async function initPage() {
    initTheme();
    injectRightsFooter();
    if (!ensureServerMode()) return;
    try {
      await loadSession();
    } catch {
      state.session = { authenticated: false, plans: {}, tracks: [], lessons: [], exams: {}, watchRequirements: {}, contactPhone: '01280272177' };
      setNotice('تعذر الاتصال بالسيرفر. شغّل الموقع عبر node server.js ثم افتح http://localhost:3000');
    }
    updateNavForAuth();

    const page = document.body.dataset.page;
    if (page === 'login') return initLoginPage();
    if (page === 'register') return initRegisterPage();
    if (page === 'subscription') return initSubscriptionPage();
    if (page === 'dashboard') return initDashboardPage();
    if (page === 'support') return initSupportPage();
    if (page === 'profile') return initProfilePage();
    if (page === 'videos') return initVideosPage();
    if (page === 'exams') return initExamsPage();
    if (page === 'admin') return initAdminPage();
  }

  return { initPage };
})();

document.addEventListener('DOMContentLoaded', App.initPage);
