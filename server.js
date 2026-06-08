const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'codecraft-db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ADMIN_CONFIG_PATH = path.join(DATA_DIR, 'admin-config.json');
const PORT = Number(process.env.PORT || 3000);
const CONTACT_PHONE = '01280272177';
const CONTACT_WA = '201280272177';
const SESSION_DAYS = 14;
const ADMIN_SESSION_HOURS = 12;
const MAX_DB_BACKUPS = 20;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;
const LESSON_WATCH_REQUIRED_SECONDS = 30;
const EXAM_PASS_SCORE = 70;
const CERTIFICATE_REQUIRED_EXAMS = 10;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const PLAN_META = {
  basic: { label: 'Starter', days: 30, price: '149 جنيه' },
  pro: { label: 'Pro 3D', days: 90, price: '349 جنيه' },
  elite: { label: 'Elite Academy', days: 365, price: '999 جنيه' }
};

const TRACK_CATALOG = [
  {
    key: 'frontend',
    title: 'Frontend Developer',
    arabicTitle: 'مسار Frontend',
    audience: 'لمن يريد بناء واجهات احترافية متجاوبة وحديثة.',
    outcome: 'بنهاية المسار يكون الطالب قادرًا على بناء واجهات كاملة بـ HTML و CSS و JavaScript و React.',
    color: 'cyan',
    levels: [
      {
        key: 'frontend-foundation',
        title: 'المستوى 1: Frontend Foundation',
        summary: 'الانطلاقة الصحيحة من بنية الصفحة إلى التصميم المتجاوب.',
        modules: [
          {
            key: 'html-css-core',
            title: 'HTML + CSS Core',
            summary: 'أساس بناء الصفحات وتنسيقها بشكل نظيف.',
            lessons: [
              { id: 'html3d', title: 'HTML Full Course', level: 'مبتدئ', duration: 'مشاهدة داخل المنصة', category: 'HTML', summary: 'ابدأ من الصفر في فهم هيكل الصفحة والعناصر الأساسية وبناء أول صفحاتك بشكل صحيح.', videoLabel: 'فيديو FE-01', videoUrl: 'https://youtu.be/mJgBOIoGihA', videoSources: { en: 'https://youtu.be/mJgBOIoGihA', ar: 'https://youtu.be/qfPUMV9J5yw' } },
              { id: 'semantic-html', title: 'HTML & CSS Website Project', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Project Basics', summary: 'تطبيق عملي مبكر يساعد الطالب على ربط HTML و CSS في صفحة حقيقية بدل الاكتفاء بالأساسيات النظرية.', videoLabel: 'فيديو FE-02', videoUrl: 'https://youtu.be/FazgJVnrVuI', videoSources: { en: 'https://youtu.be/FazgJVnrVuI', ar: 'https://youtu.be/Z-5QVutAEW4' } },
              { id: 'css-layouts', title: 'CSS Full Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'CSS', summary: 'فهم التنسيقات الأساسية والمتقدمة وكيفية بناء شكل بصري مرتب وسهل التطوير.', videoLabel: 'فيديو FE-03', videoUrl: 'https://youtu.be/OXGznpKZ_sA', videoSources: { en: 'https://youtu.be/OXGznpKZ_sA', ar: 'https://youtu.be/qfPUMV9J5yw' } }
            ]
          },
          {
            key: 'responsive-accessibility',
            title: 'Layout + Responsive',
            summary: 'تعلم ترتيب العناصر وبناء واجهات متجاوبة حديثة.',
            lessons: [
              { id: 'responsive', title: 'Flexbox Crash Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Flexbox', summary: 'فهم توزيع العناصر أفقيًا وعموديًا بشكل عملي وسريع داخل الواجهات الحديثة.', videoLabel: 'فيديو FE-04', videoUrl: 'https://youtu.be/3YW65K6LcIA', videoSources: { en: 'https://youtu.be/3YW65K6LcIA', ar: 'https://youtu.be/fYq5PXgSsbE' } },
              { id: 'design-system', title: 'CSS Grid Tutorial', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'CSS Grid', summary: 'استخدم CSS Grid في بناء تخطيطات مرنة ومنظمة للمشاريع الكبيرة والمتوسطة.', videoLabel: 'فيديو FE-05', videoUrl: 'https://youtu.be/jV8B24rSN5o', videoSources: { en: 'https://youtu.be/jV8B24rSN5o', ar: 'https://youtu.be/jV8B24rSN5o' } },
              { id: 'accessibility-basics', title: 'Responsive Web Design', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Responsive', summary: 'جهز صفحاتك لتظهر وتعمل بشكل ممتاز على الموبايل والتابلت والكمبيوتر.', videoLabel: 'فيديو FE-06', videoUrl: 'https://youtu.be/srvUrASNj0s', videoSources: { en: 'https://youtu.be/srvUrASNj0s', ar: 'https://youtu.be/srvUrASNj0s' } }
            ]
          }
        ]
      },
      {
        key: 'frontend-interactive',
        title: 'المستوى 2: Interactive JavaScript',
        summary: 'الانتقال من واجهات ثابتة إلى واجهات حية وتفاعلية.',
        modules: [
          {
            key: 'javascript-core',
            title: 'JavaScript Core',
            summary: 'منطق البرمجة المطلوب للتفاعل داخل الواجهة.',
            lessons: [
              { id: 'jslogic', title: 'JavaScript Full Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'JavaScript', summary: 'فهم الأساسيات المهمة في JavaScript من المتغيرات وحتى المنطق المطلوب للمشاريع.', videoLabel: 'فيديو FE-07', videoUrl: 'https://youtu.be/jS4aFq5-91M', videoSources: { en: 'https://youtu.be/jS4aFq5-91M', ar: 'https://youtu.be/MAauLwSHO6Y' } },
              { id: 'js-arrays-objects', title: 'JavaScript Arrays & Objects', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Data Structures', summary: 'تعلم التعامل مع Arrays و Objects لأنها قلب أي تطبيق واجهة حديث.', videoLabel: 'فيديو FE-08', videoUrl: 'https://youtu.be/R8rmfD9Y5-c', videoSources: { en: 'https://youtu.be/R8rmfD9Y5-c', ar: 'https://youtu.be/4yQ--nrwy5w' } },
              { id: 'dommastery', title: 'DOM Manipulation Tutorial', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'DOM', summary: 'ربط JavaScript بعناصر الصفحة لبناء تجربة تفاعلية حقيقية للمستخدم.', videoLabel: 'فيديو FE-09', videoUrl: 'https://youtu.be/y17RuWkWdn8', videoSources: { en: 'https://youtu.be/y17RuWkWdn8', ar: 'https://youtu.be/X1ulCwyhCVM' } }
            ]
          },
          {
            key: 'browser-api',
            title: 'Browser APIs',
            summary: 'ربط الواجهة بالتخزين المحلي والبيانات الخارجية.',
            lessons: [
              { id: 'events-forms', title: 'JavaScript Form Validation', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Forms', summary: 'بناء نماذج صحيحة مع التحقق من المدخلات ورسائل الخطأ قبل إرسال البيانات.', videoLabel: 'فيديو FE-10', videoUrl: 'https://youtu.be/fNcJuPIZ2WE', videoSources: { en: 'https://youtu.be/fNcJuPIZ2WE', ar: 'https://youtu.be/In0nB0ABaUk' } },
              { id: 'fetch-api', title: 'Fetch API Crash Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Fetch API', summary: 'جلب البيانات من الـ APIs والتعامل مع الاستجابات داخل الواجهة بسهولة.', videoLabel: 'فيديو FE-11', videoUrl: 'https://youtu.be/VF-FGf_ZZiI', videoSources: { en: 'https://youtu.be/VF-FGf_ZZiI', ar: 'https://youtu.be/cuEtnrL9-H0' } },
              { id: 'local-storage', title: 'Local Storage JavaScript', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Local Storage', summary: 'حفظ بيانات بسيطة داخل المتصفح مثل التفضيلات وحالة المستخدم المؤقتة.', videoLabel: 'فيديو FE-12', videoUrl: 'https://youtu.be/DFhmNLKwwGw', videoSources: { en: 'https://youtu.be/DFhmNLKwwGw', ar: 'https://youtu.be/DFhmNLKwwGw' } }
            ]
          }
        ]
      },
      {
        key: 'frontend-react',
        title: 'المستوى 3: React + Real Projects',
        summary: 'إعداد الطالب لبناء واجهات حديثة قابلة للتوسع والعمل.',
        modules: [
          {
            key: 'react-core',
            title: 'React Core',
            summary: 'أساسيات React لبناء تطبيقات منظمة.',
            lessons: [
              { id: 'react-intro', title: 'React JS Full Course', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React', summary: 'دخول قوي إلى React لبناء مكونات وتطبيقات حديثة قابلة للتوسع.', videoLabel: 'فيديو FE-13', videoUrl: 'https://youtu.be/bMknfKXIFA8', videoSources: { en: 'https://youtu.be/bMknfKXIFA8', ar: 'https://youtu.be/bMknfKXIFA8' } },
              { id: 'react-state-hooks', title: 'React Hooks Tutorial', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React Hooks', summary: 'فهم Hooks الأساسية وكيفية استخدامها في إدارة الحالة والتأثيرات.', videoLabel: 'فيديو FE-14', videoUrl: 'https://youtu.be/TNhaISOUy6Q', videoSources: { en: 'https://youtu.be/TNhaISOUy6Q', ar: 'https://youtu.be/TNhaISOUy6Q' } },
              { id: 'react-routing', title: 'React Router Tutorial', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React Router', summary: 'تنظيم التنقل بين الصفحات داخل تطبيق React بطريقة صحيحة.', videoLabel: 'فيديو FE-15', videoUrl: 'https://youtu.be/Ul3y1LXxzdU', videoSources: { en: 'https://youtu.be/Ul3y1LXxzdU', ar: 'https://youtu.be/Ul3y1LXxzdU' } }
            ]
          },
          {
            key: 'frontend-production',
            title: 'Production Frontend',
            summary: 'الانتقال من التعلم إلى مشاريع قابلة للنشر.',
            lessons: [
              { id: 'typescript-front', title: 'TypeScript Full Course', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'TypeScript', summary: 'رفع جودة مشاريع الواجهة بإضافة typing أوضح وتقليل الأخطاء وقت التطوير.', videoLabel: 'فيديو FE-16', videoUrl: 'https://youtu.be/30LWjhZzg50', videoSources: { en: 'https://youtu.be/30LWjhZzg50', ar: 'https://youtu.be/30LWjhZzg50' } },
              { id: 'frontendapp', title: 'Frontend Project Tutorial', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Project Build', summary: 'مشروع عملي يساعد الطالب على تجميع HTML و CSS و JavaScript في تطبيق واحد.', videoLabel: 'فيديو FE-17', videoUrl: 'https://youtu.be/3PHXvlpOkf4', videoSources: { en: 'https://youtu.be/3PHXvlpOkf4', ar: 'https://youtu.be/3PHXvlpOkf4' } },
              { id: 'frontend-deploy', title: 'React Final Project + Deploy', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Deploy', summary: 'مشروع React نهائي مع فكرة الإطلاق والنشر لربط التعلم بسيناريو حقيقي.', videoLabel: 'فيديو FE-18', videoUrl: 'https://youtu.be/dCLhUialKPQ', videoSources: { en: 'https://youtu.be/dCLhUialKPQ', ar: 'https://youtu.be/dCLhUialKPQ' } }
            ]
          }
        ]
      }
    ]
  },
  {
    key: 'backend',
    title: 'Backend Developer',
    arabicTitle: 'مسار Backend',
    audience: 'لمن يريد بناء APIs وأنظمة آمنة وقابلة للتوسع.',
    outcome: 'بنهاية المسار يكون الطالب قادرًا على بناء Backend متكامل بالمصادقة وقواعد البيانات والحماية.',
    color: 'violet',
    levels: [
      {
        key: 'backend-foundation',
        title: 'المستوى 1: Backend Foundation',
        summary: 'فهم الصورة الكبيرة قبل كتابة الـ API.',
        modules: [
          {
            key: 'server-web-basics',
            title: 'Server + Web Basics',
            summary: 'مفاهيم أساسية لكل مطور Backend.',
            lessons: [
              { id: 'backend-intro', title: 'Node.js Full Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Node.js Basics', summary: 'ابدأ فهم بيئة Node.js من الصفر وكيف يعمل الـ runtime على السيرفر.', videoLabel: 'فيديو BE-01', videoUrl: 'https://youtu.be/fBNz5xF-Kx4', videoSources: { en: 'https://youtu.be/fBNz5xF-Kx4', ar: 'https://youtu.be/32M1al-Y6Ag' } },
              { id: 'http-json', title: 'Node.js Crash Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Node Crash Course', summary: 'نظرة عملية وسريعة على أهم أفكار Node.js قبل الدخول في التطبيقات الكبيرة.', videoLabel: 'فيديو BE-02', videoUrl: 'https://youtu.be/TlB_eWDSMt4', videoSources: { en: 'https://youtu.be/TlB_eWDSMt4', ar: 'https://youtu.be/TlB_eWDSMt4' } },
              { id: 'api-design', title: 'Node.js Beginner Tutorial', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Node Beginner', summary: 'ترسيخ الأساسيات التي يحتاجها الطالب قبل بناء أي Backend فعلي.', videoLabel: 'فيديو BE-03', videoUrl: 'https://youtu.be/fBNz5xF-Kx4', videoSources: { en: 'https://youtu.be/fBNz5xF-Kx4', ar: 'https://youtu.be/TlB_eWDSMt4' } }
            ]
          },
          {
            key: 'node-core',
            title: 'Express Core',
            summary: 'الانتقال من Node.js الخام إلى بناء API حقيقي بـ Express.',
            lessons: [
              { id: 'node-basics', title: 'Express JS Full Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Express.js', summary: 'بناء API كامل باستخدام Express مع فهم طريقة تنظيم المشروع والمسارات.', videoLabel: 'فيديو BE-04', videoUrl: 'https://youtu.be/L72fhGm1tfE', videoSources: { en: 'https://youtu.be/L72fhGm1tfE', ar: 'https://youtu.be/Oe421EPjeBE' } },
              { id: 'npm-env', title: 'Express JS Crash Course', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'Express Crash Course', summary: 'مرور سريع وعملي على أهم أدوات Express المطلوبة في الشغل اليومي.', videoLabel: 'فيديو BE-05', videoUrl: 'https://youtu.be/SccSCuHhOw0', videoSources: { en: 'https://youtu.be/SccSCuHhOw0', ar: 'https://youtu.be/l8WPWK9mS5M' } },
              { id: 'async-node', title: 'Build REST API with Express', level: 'مبتدئ', duration: 'شاهد داخل المنصة', category: 'REST API', summary: 'تطبيق عملي لبناء REST API منظم يصلح كنقطة انطلاق قوية للمسار.', videoLabel: 'فيديو BE-06', videoUrl: 'https://youtu.be/pKd0Rpw7O48', videoSources: { en: 'https://youtu.be/pKd0Rpw7O48', ar: 'https://youtu.be/l8WPWK9mS5M' } }
            ]
          }
        ]
      },
      {
        key: 'backend-apis',
        title: 'المستوى 2: Building APIs',
        summary: 'بناء API حقيقي قابل للاستخدام الفعلي.',
        modules: [
          {
            key: 'express-core',
            title: 'Express Core',
            summary: 'الهيكل العملي لأي مشروع API.',
            lessons: [
              { id: 'express-setup', title: 'MongoDB Full Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'MongoDB', summary: 'فهم قواعد MongoDB من الصفر حتى التعامل مع البيانات بشكل واقعي.', videoLabel: 'فيديو BE-07', videoUrl: 'https://youtu.be/c2M-rlkkT5o', videoSources: { en: 'https://youtu.be/c2M-rlkkT5o', ar: 'https://youtu.be/gB6WLkSrtJk' } },
              { id: 'backendapi', title: 'MongoDB Crash Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'MongoDB Crash Course', summary: 'مرور سريع على أساسيات MongoDB وكيفية استخدامها داخل مشاريع الباك إند.', videoLabel: 'فيديو BE-08', videoUrl: 'https://youtu.be/-56x56UppqQ', videoSources: { en: 'https://youtu.be/-56x56UppqQ', ar: 'https://youtu.be/pWbMrx5rVBE' } },
              { id: 'middleware-errors', title: 'Node.js + MongoDB Integration', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Mongo Integration', summary: 'ربط Node.js بقاعدة البيانات وتحريك البيانات بين التطبيق وMongoDB.', videoLabel: 'فيديو BE-09', videoUrl: 'https://youtu.be/fgTGADljAeg', videoSources: { en: 'https://youtu.be/fgTGADljAeg', ar: 'https://youtu.be/fgTGADljAeg' } }
            ]
          },
          {
            key: 'database-core',
            title: 'Authentication + Security',
            summary: 'بناء تسجيل الدخول والأمان الأساسي للمشاريع الخلفية.',
            lessons: [
              { id: 'databaseflow', title: 'JWT Authentication Tutorial', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'JWT', summary: 'فهم Authentication باستخدام JSON Web Tokens لحماية الوصول إلى الـ API.', videoLabel: 'فيديو BE-10', videoUrl: 'https://youtu.be/mbsmsi7l3r4', videoSources: { en: 'https://youtu.be/mbsmsi7l3r4', ar: 'https://youtu.be/mbsmsi7l3r4' } },
              { id: 'mongodb-schema', title: 'User Login System Backend', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Login System', summary: 'بناء نظام تسجيل دخول وخروج عملي داخل جهة السيرفر.', videoLabel: 'فيديو BE-11', videoUrl: 'https://youtu.be/Ud5xKCYQTjM', videoSources: { en: 'https://youtu.be/Ud5xKCYQTjM', ar: 'https://youtu.be/mbsmsi7l3r4' } },
              { id: 'crud-api', title: 'Password Hashing (bcrypt)', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'bcrypt', summary: 'حماية كلمات المرور بالطريقة الصحيحة قبل تخزينها داخل قاعدة البيانات.', videoLabel: 'فيديو BE-12', videoUrl: 'https://youtu.be/7Q17ubqLfaM', videoSources: { en: 'https://youtu.be/7Q17ubqLfaM', ar: 'https://youtu.be/7Q17ubqLfaM' } }
            ]
          }
        ]
      },
      {
        key: 'backend-security',
        title: 'المستوى 3: Auth + Security + Deployment',
        summary: 'جعل المشروع مناسبًا للإطلاق والاستخدام الحقيقي.',
        modules: [
          {
            key: 'auth-security',
            title: 'Authentication + Security',
            summary: 'حماية المستخدمين والـ API والبيانات.',
            lessons: [
              { id: 'auth-flow', title: 'REST API Full Project', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'REST API Project', summary: 'مشروع كامل يربط المفاهيم السابقة في API حقيقية قابلة للتشغيل.', videoLabel: 'فيديو BE-13', videoUrl: 'https://youtu.be/-MTSQjw5DrM', videoSources: { en: 'https://youtu.be/-MTSQjw5DrM', ar: 'https://youtu.be/-MTSQjw5DrM' } },
              { id: 'validation-security', title: 'CRUD Backend Project', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'CRUD Project', summary: 'تطبيق عملي على عمليات الإضافة والتعديل والحذف والقراءة داخل Backend كامل.', videoLabel: 'فيديو BE-14', videoUrl: 'https://youtu.be/5OdVJbNCSso', videoSources: { en: 'https://youtu.be/5OdVJbNCSso', ar: 'https://youtu.be/5OdVJbNCSso' } },
              { id: 'role-access', title: 'Node.js + MongoDB Project', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Node + Mongo Project', summary: 'مشروع يدمج الخادم مع MongoDB داخل سيناريو عملي مناسب للمسار.', videoLabel: 'فيديو BE-15', videoUrl: 'https://youtu.be/7CqJlxBYj-M', videoSources: { en: 'https://youtu.be/7CqJlxBYj-M', ar: 'https://youtu.be/0sSYmRImgRY' } }
            ]
          },
          {
            key: 'backend-production',
            title: 'Production Backend',
            summary: 'تشغيل المشروع خارج بيئة التعلم.',
            lessons: [
              { id: 'logging-monitoring', title: 'Deploy Node.js App', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Deployment', summary: 'تعلم نشر تطبيق Node.js وتشغيله على بيئة فعلية خارج جهاز التطوير.', videoLabel: 'فيديو BE-16', videoUrl: 'https://youtu.be/oykl1Ih9pMg', videoSources: { en: 'https://youtu.be/oykl1Ih9pMg', ar: 'https://youtu.be/oykl1Ih9pMg' } },
              { id: 'backend-deploy', title: 'Backend Best Practices', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Best Practices', summary: 'أفضل الممارسات في تنظيم ملفات الباك إند وكتابة كود أسهل في الصيانة.', videoLabel: 'فيديو BE-17', videoUrl: 'https://youtu.be/BMUiFMZr7vk', videoSources: { en: 'https://youtu.be/BMUiFMZr7vk', ar: 'https://youtu.be/BMUiFMZr7vk' } },
              { id: 'backend-capstone', title: 'Advanced Node.js Project (Clean Architecture)', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Capstone', summary: 'مشروع نهائي متقدم يوضح تنظيم الباك إند بأسلوب Clean Architecture وقابلية الصيانة.', videoLabel: 'فيديو BE-18', videoUrl: 'https://youtu.be/CnailTcJV_U', videoSources: { en: 'https://youtu.be/CnailTcJV_U', ar: 'https://youtu.be/CnailTcJV_U' } }
            ]
          }
        ]
      }
    ]
  },
  {
    key: 'fullstack',
    title: 'Full Stack Developer',
    arabicTitle: 'مسار Full Stack',
    audience: 'لمن يريد دمج الواجهة مع الخادم وبناء منتجات كاملة.',
    outcome: 'بنهاية المسار يكون الطالب قادرًا على بناء ونشر تطبيق كامل من الواجهة إلى قاعدة البيانات.',
    color: 'amber',
    levels: [
      {
        key: 'fullstack-foundation',
        title: 'المستوى 1: Full Stack Workflow',
        summary: 'فهم كيف تتكامل الطبقات المختلفة داخل المنتج.',
        modules: [
          {
            key: 'workflow-planning',
            title: 'Workflow + Planning',
            summary: 'الربط بين متطلبات المنتج والمسارات التقنية.',
            lessons: [
              { id: 'product-thinking', title: 'MERN Stack Intro', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'MERN Intro', summary: 'مقدمة واضحة لفهم مكونات MERN Stack وكيف تُبنى التطبيقات الكاملة باستخدامه.', videoLabel: 'فيديو FS-01', videoUrl: 'https://youtu.be/7CqJlxBYj-M', videoSources: { en: 'https://youtu.be/7CqJlxBYj-M', ar: 'https://youtu.be/98BzS5Oz5E4' } },
              { id: 'git-teamflow', title: 'Full Stack Overview', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Overview', summary: 'صورة شاملة لمسار العمل من الواجهة إلى الخادم وقاعدة البيانات داخل المشروع الكامل.', videoLabel: 'فيديو FS-02', videoUrl: 'https://youtu.be/4Z6lxfglvUU', videoSources: { en: 'https://youtu.be/4Z6lxfglvUU', ar: 'https://youtu.be/zJSY8tbf_ys' } },
              { id: 'api-contracts', title: 'How Frontend & Backend Connect', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Frontend + Backend', summary: 'فهم نقطة الربط بين الواجهة والخلفية وكيف تنتقل البيانات بينهما في التطبيق.', videoLabel: 'فيديو FS-03', videoUrl: 'https://youtu.be/8KaJRw-rfn8', videoSources: { en: 'https://youtu.be/8KaJRw-rfn8', ar: 'https://youtu.be/8KaJRw-rfn8' } }
            ]
          },
          {
            key: 'integration-basics',
            title: 'Backend Core',
            summary: 'بناء طبقة الخادم وقاعدة البيانات كأساس للتطبيق الكامل.',
            lessons: [
              { id: 'auth-ui-flow', title: 'Node.js Full Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Node.js', summary: 'تأسيس قوي لطبقة السيرفر داخل مشروع Full Stack باستخدام Node.js.', videoLabel: 'فيديو FS-04', videoUrl: 'https://youtu.be/fBNz5xF-Kx4', videoSources: { en: 'https://youtu.be/fBNz5xF-Kx4', ar: 'https://youtu.be/32M1al-Y6Ag' } },
              { id: 'dashboard-data', title: 'Express.js REST API', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'Express API', summary: 'بناء REST API تخدم تطبيق Full Stack بشكل عملي ومنظم.', videoLabel: 'فيديو FS-05', videoUrl: 'https://youtu.be/pKd0Rpw7O48', videoSources: { en: 'https://youtu.be/pKd0Rpw7O48', ar: 'https://youtu.be/Oe421EPjeBE' } },
              { id: 'file-media-flow', title: 'MongoDB Full Course', level: 'متوسط', duration: 'شاهد داخل المنصة', category: 'MongoDB', summary: 'إعداد قاعدة البيانات وربطها بطبقة الخادم داخل بنية MERN.', videoLabel: 'فيديو FS-06', videoUrl: 'https://youtu.be/c2M-rlkkT5o', videoSources: { en: 'https://youtu.be/c2M-rlkkT5o', ar: 'https://youtu.be/gB6WLkSrtJk' } }
            ]
          }
        ]
      },
      {
        key: 'fullstack-systems',
        title: 'المستوى 2: Core Product Systems',
        summary: 'بناء الأنظمة التي تجعل المنصة تعمل كمنتج حقيقي.',
        modules: [
          {
            key: 'subscriptions-notifications',
            title: 'Subscriptions + Notifications',
            summary: 'بناء أنظمة الاشتراكات والإشعارات وتدفق التفعيل.',
            lessons: [
              { id: 'subscription-flow', title: 'JWT Authentication', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'JWT', summary: 'تأمين الوصول بين الواجهة والخادم باستخدام JWT داخل مشروع Full Stack.', videoLabel: 'فيديو FS-07', videoUrl: 'https://youtu.be/mbsmsi7l3r4', videoSources: { en: 'https://youtu.be/mbsmsi7l3r4', ar: 'https://youtu.be/mbsmsi7l3r4' } },
              { id: 'notification-system', title: 'Login System Backend', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'Login System', summary: 'إنشاء تسجيل دخول عملي يمكن ربطه بسهولة مع واجهة React لاحقًا.', videoLabel: 'فيديو FS-08', videoUrl: 'https://youtu.be/Ud5xKCYQTjM', videoSources: { en: 'https://youtu.be/Ud5xKCYQTjM', ar: 'https://youtu.be/mbsmsi7l3r4' } },
              { id: 'admin-panels', title: 'CRUD REST API Project', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'CRUD API', summary: 'بناء مشروع API يقدّم عمليات CRUD كاملة تصلح كأساس لتطبيق MERN.', videoLabel: 'فيديو FS-09', videoUrl: 'https://youtu.be/mrHNSanmqQ4', videoSources: { en: 'https://youtu.be/mrHNSanmqQ4', ar: 'https://youtu.be/mrHNSanmqQ4' } }
            ]
          },
          {
            key: 'support-analytics',
            title: 'React Frontend',
            summary: 'بناء طبقة الواجهة داخل تطبيق Full Stack باستخدام React.',
            lessons: [
              { id: 'support-system', title: 'React Full Course', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React', summary: 'بناء واجهة كاملة في React لتستهلك بيانات الخادم وتعرضها للمستخدم.', videoLabel: 'فيديو FS-10', videoUrl: 'https://youtu.be/bMknfKXIFA8', videoSources: { en: 'https://youtu.be/bMknfKXIFA8', ar: 'https://youtu.be/bMknfKXIFA8' } },
              { id: 'analytics-panels', title: 'React Hooks Tutorial', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React Hooks', summary: 'فهم إدارة الحالة والتأثيرات داخل واجهة Full Stack حديثة.', videoLabel: 'فيديو FS-11', videoUrl: 'https://youtu.be/TNhaISOUy6Q', videoSources: { en: 'https://youtu.be/TNhaISOUy6Q', ar: 'https://youtu.be/TNhaISOUy6Q' } },
              { id: 'backups-recovery', title: 'React Router Tutorial', level: 'متقدم', duration: 'شاهد داخل المنصة', category: 'React Router', summary: 'تنظيم الصفحات والتنقل داخل واجهة التطبيق الكامل.', videoLabel: 'فيديو FS-12', videoUrl: 'https://youtu.be/Ul3y1LXxzdU', videoSources: { en: 'https://youtu.be/Ul3y1LXxzdU', ar: 'https://youtu.be/Ul3y1LXxzdU' } }
            ]
          }
        ]
      },
      {
        key: 'fullstack-launch',
        title: 'المستوى 3: Launch + Career',
        summary: 'التجهيز للإطلاق الفعلي وسوق العمل.',
        modules: [
          {
            key: 'launch-readiness',
            title: 'Launch Readiness',
            summary: 'آخر ما يحتاجه التطبيق قبل النشر.',
            lessons: [
              { id: 'testing-review', title: 'React + Node Full Project', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'Full Project', summary: 'مشروع Full Stack يربط React مع Node في تطبيق واحد عملي.', videoLabel: 'فيديو FS-13', videoUrl: 'https://youtu.be/7CqJlxBYj-M', videoSources: { en: 'https://youtu.be/7CqJlxBYj-M', ar: 'https://youtu.be/7CqJlxBYj-M' } },
              { id: 'deploy-checklist', title: 'Connect React with API', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'Integration', summary: 'فهم عملي لكيفية ربط الواجهة مباشرة بالـ API داخل التطبيق الكامل.', videoLabel: 'فيديو FS-14', videoUrl: 'https://youtu.be/8KaJRw-rfn8', videoSources: { en: 'https://youtu.be/8KaJRw-rfn8', ar: 'https://youtu.be/8KaJRw-rfn8' } },
              { id: 'aiweb', title: 'MERN Stack Todo App', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'MERN App', summary: 'تطبيق MERN عملي يساعد الطالب على رؤية التكامل الكامل في سيناريو بسيط وواضح.', videoLabel: 'فيديو FS-15', videoUrl: 'https://youtu.be/ekXBuR77Zd0', videoSources: { en: 'https://youtu.be/ekXBuR77Zd0', ar: 'https://youtu.be/ekXBuR77Zd0' } }
            ]
          },
          {
            key: 'career-portfolio',
            title: 'Deploy + Advanced Production',
            summary: 'الانتقال من مشروع تعليمي إلى تطبيق MERN جاهز للإطلاق.',
            lessons: [
              { id: 'careerprep', title: 'Deploy Full Stack App', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'Deployment', summary: 'نشر تطبيق Full Stack وتشغيله في بيئة حقيقية بدل بيئة التطوير المحلية.', videoLabel: 'فيديو FS-16', videoUrl: 'https://youtu.be/oykl1Ih9pMg', videoSources: { en: 'https://youtu.be/oykl1Ih9pMg', ar: 'https://youtu.be/oykl1Ih9pMg' } },
              { id: 'client-delivery', title: 'MERN Social Media Project', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'Advanced MERN', summary: 'مشروع أكبر يوضح كيف تُبنى تطبيقات MERN أقرب لمنتجات السوق الحقيقية.', videoLabel: 'فيديو FS-17', videoUrl: 'https://youtu.be/3PHXvlpOkf4', videoSources: { en: 'https://youtu.be/3PHXvlpOkf4', ar: 'https://youtu.be/3PHXvlpOkf4' } },
              { id: 'fullstack-capstone', title: 'Advanced MERN Production Project', level: 'احترافي', duration: 'شاهد داخل المنصة', category: 'Production Capstone', summary: 'مشروع نهائي متقدم يربط مفاهيم MERN بأسلوب إنتاجي أقوى.', videoLabel: 'فيديو FS-18', videoUrl: 'https://youtu.be/7CqJlxBYj-M', videoSources: { en: 'https://youtu.be/7CqJlxBYj-M', ar: 'https://youtu.be/7CqJlxBYj-M' } }
            ]
          }
        ]
      }
    ]
  }
];

const LESSONS = TRACK_CATALOG.flatMap((track) => (
  track.levels.flatMap((level, levelIndex) => (
    level.modules.flatMap((module, moduleIndex) => (
      module.lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        trackKey: track.key,
        trackTitle: track.title,
        trackArabicTitle: track.arabicTitle,
        trackAudience: track.audience,
        levelKey: level.key,
        levelTitle: level.title,
        moduleKey: module.key,
        moduleTitle: module.title,
        moduleSummary: module.summary,
        order: `${levelIndex + 1}.${moduleIndex + 1}.${lessonIndex + 1}`
      }))
    ))
  ))
));

const BASE_EXAMS = {
  html3d: { title: 'اختبار HTML و CSS', question: 'ما أفضل خطوة أولى لبناء واجهة منظمة؟', answers: [{ text: 'تقسيم الصفحة إلى أقسام واضحة ثم تنسيقها', correct: true }, { text: 'بدء المشروع بالأنيميشن فقط', correct: false }, { text: 'كتابة كل شيء في سطر واحد', correct: false }] },
  responsive: { title: 'اختبار التصميم المتجاوب', question: 'ما الذي يجعل الموقع مناسبًا لكل الأجهزة؟', answers: [{ text: 'استخدام Grid و Media Queries', correct: true }, { text: 'تثبيت العرض على مقاس واحد', correct: false }, { text: 'إلغاء الـ viewport', correct: false }] },
  jslogic: { title: 'اختبار منطق JavaScript', question: 'كيف نرفع جودة التفاعل البرمجي داخل الموقع؟', answers: [{ text: 'بربط الأحداث بواجهة واضحة وتغذية راجعة فورية', correct: true }, { text: 'بحذف التحقق من الإدخال', correct: false }, { text: 'بإخفاء رسائل النظام', correct: false }] },
  dommastery: { title: 'اختبار DOM', question: 'ما فائدة التعامل مع عناصر الصفحة برمجيًا؟', answers: [{ text: 'تحديث المحتوى والتفاعل بدون إعادة بناء الصفحة يدويًا', correct: true }, { text: 'منع المستخدم من رؤية المحتوى', correct: false }, { text: 'إلغاء التنقل تمامًا', correct: false }] },
  frontendapp: { title: 'اختبار مشروع Frontend', question: 'ما الذي يجعل المشروع قابلًا للعرض على العملاء؟', answers: [{ text: 'واجهة مرتبة وسريعة ومتجاوبة', correct: true }, { text: 'الألوان فقط', correct: false }, { text: 'إهمال تجربة الهاتف', correct: false }] },
  backendapi: { title: 'اختبار REST API', question: 'ما العنصر الذي يجعل الـ API قابلة للتوسع والصيانة؟', answers: [{ text: 'تنظيم المسارات والمنطق والمعالجة في طبقات واضحة', correct: true }, { text: 'كتابة كل شيء داخل route واحد', correct: false }, { text: 'إرجاع بيانات عشوائية بلا تنسيق', correct: false }] },
  'auth-flow': { title: 'اختبار التحقق والمصادقة', question: 'ما الخطوة الأساسية لحماية حسابات المستخدمين؟', answers: [{ text: 'تشفير كلمات المرور والتحقق من الجلسات', correct: true }, { text: 'حفظ كلمة المرور كما هي', correct: false }, { text: 'إلغاء التحقق من الصلاحيات', correct: false }] },
  'subscription-flow': { title: 'اختبار نظام الاشتراكات', question: 'كيف نحافظ على صلاحيات المحتوى المدفوع؟', answers: [{ text: 'ربط الوصول بحالة الاشتراك من السيرفر', correct: true }, { text: 'الاعتماد على أزرار الواجهة فقط', correct: false }, { text: 'إظهار كل المحتوى للجميع', correct: false }] },
  'support-system': { title: 'اختبار الدعم الفني', question: 'ما الذي يجعل تذكرة الدعم مفيدة ومنظمة؟', answers: [{ text: 'وجود حالة واضحة وسجل محادثة وتحديثات', correct: true }, { text: 'الرد خارج النظام فقط', correct: false }, { text: 'حذف الرسائل القديمة دائمًا', correct: false }] },
  aiweb: { title: 'اختبار تجربة المنصة', question: 'ما الذي يرفع جودة رحلة الطالب داخل المنصة؟', answers: [{ text: 'لوحة تقدم واضحة ومسار تعلم شخصي', correct: true }, { text: 'إخفاء حالة الاشتراك', correct: false }, { text: 'حذف صفحة الحساب', correct: false }] },
  'fullstack-capstone': { title: 'اختبار Full Stack النهائي', question: 'ما أهم علامة على نجاح مشروع Full Stack؟', answers: [{ text: 'أن تعمل الواجهة والخادم والبيانات معًا بشكل متكامل', correct: true }, { text: 'وجود شاشة دخول فقط', correct: false }, { text: 'كثرة الصفحات بدون تكامل', correct: false }] }
};

function autoExamForLesson(lesson) {
  const area = lesson.category || lesson.moduleTitle || lesson.trackArabicTitle || 'الدرس';
  const trackLabel = lesson.trackArabicTitle || 'المسار';
  const lessonTitle = lesson.title || 'هذا الدرس';
  return {
    title: `اختبار ${area}`,
    question: `بعد دراسة ${lessonTitle} داخل ${trackLabel}، ما النتيجة الصحيحة المتوقعة من فهم هذا الدرس؟`,
    answers: [
      { text: `فهم الفكرة الأساسية وتطبيقها عمليًا داخل مشروع أو مهمة حقيقية`, correct: true },
      { text: `الاعتماد على الحفظ فقط بدون تجربة أو تنفيذ`, correct: false },
      { text: `تجاوز الدرس بدون مراجعة المفهوم أو ربطه بالمسار`, correct: false }
    ]
  };
}

const EXAMS = LESSONS.reduce((collection, lesson) => {
  collection[lesson.id] = BASE_EXAMS[lesson.id] || autoExamForLesson(lesson);
  return collection;
}, {});

const ACTIVATION_CODES = [
  ['CC-BASIC-A01F9K', 'basic'], ['CC-BASIC-B12L7Q', 'basic'], ['CC-BASIC-C23M8R', 'basic'], ['CC-BASIC-D34N2T', 'basic'], ['CC-BASIC-E45P6V', 'basic'],
  ['CC-BASIC-F56Q1W', 'basic'], ['CC-BASIC-G67R4X', 'basic'], ['CC-BASIC-H78S9Y', 'basic'], ['CC-BASIC-J89T3Z', 'basic'], ['CC-BASIC-K90U5A', 'basic'],
  ['CC-BASIC-L11V7B', 'basic'], ['CC-BASIC-M22W8C', 'basic'], ['CC-BASIC-N33X4D', 'basic'], ['CC-BASIC-P44Y6E', 'basic'], ['CC-BASIC-Q55Z2F', 'basic'],
  ['CC-BASIC-R66A7G', 'basic'], ['CC-BASIC-S77B1H', 'basic'], ['CC-BASIC-T88C5J', 'basic'], ['CC-BASIC-U99D8K', 'basic'], ['CC-BASIC-V10E3L', 'basic'],
  ['CC-PRO-A13F7M', 'pro'], ['CC-PRO-B24G9N', 'pro'], ['CC-PRO-C35H2P', 'pro'], ['CC-PRO-D46J6Q', 'pro'], ['CC-PRO-E57K1R', 'pro'],
  ['CC-PRO-F68L4S', 'pro'], ['CC-PRO-G79M8T', 'pro'], ['CC-PRO-H80N3U', 'pro'], ['CC-PRO-J91P5V', 'pro'], ['CC-PRO-K12Q7W', 'pro'],
  ['CC-PRO-L23R1X', 'pro'], ['CC-PRO-M34S6Y', 'pro'], ['CC-PRO-N45T9Z', 'pro'], ['CC-PRO-P56U2A', 'pro'], ['CC-PRO-Q67V4B', 'pro'],
  ['CC-PRO-R78W8C', 'pro'], ['CC-PRO-S89X3D', 'pro'], ['CC-PRO-T90Y5E', 'pro'], ['CC-PRO-U11Z7F', 'pro'], ['CC-PRO-V22A1G', 'pro'],
  ['CC-ELITE-A25B6H', 'elite'], ['CC-ELITE-B36C9J', 'elite'], ['CC-ELITE-C47D2K', 'elite'], ['CC-ELITE-D58E5L', 'elite'], ['CC-ELITE-E69F8M', 'elite'],
  ['CC-ELITE-F70G1N', 'elite'], ['CC-ELITE-G81H4P', 'elite'], ['CC-ELITE-H92J7Q', 'elite'], ['CC-ELITE-J13K3R', 'elite'], ['CC-ELITE-K24L6S', 'elite']
];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function createDefaultDb() {
  return {
    users: [],
    subscriptions: [],
    progress: [],
    supportTickets: [],
    notifications: [],
    loginAttempts: [],
    adminActivityLog: [],
    activationCodes: ACTIVATION_CODES.map(([code, planKey]) => ({ code, planKey, used: false, disabled: false, usedBy: null, usedAt: null, createdAt: nowIso ? nowIso() : new Date().toISOString() })),
    sessions: [],
    counters: { userId: 0, supportId: 0, notificationId: 0, adminLogId: 0 }
  };
}

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = createDefaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    createDbBackup(initial, 'initial');
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.users)) data.users = [];
  data.users = data.users.map((item) => ({
    ...item,
    name: repairStoredArabic(item.name),
    track: repairStoredArabic(item.track),
    level: repairStoredArabic(item.level),
    goal: repairStoredArabic(item.goal)
  }));
  if (!Array.isArray(data.activationCodes) || !data.activationCodes.length) {
    data.activationCodes = createDefaultDb().activationCodes;
  }
  data.activationCodes = data.activationCodes.map((item) => ({
    disabled: false,
    createdAt: new Date().toISOString(),
    ...item
  }));
  if (!Array.isArray(data.supportTickets)) data.supportTickets = [];
  data.supportTickets = data.supportTickets.map((item) => ({
    status: 'open',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    adminReply: repairStoredArabic(item.adminReply) || '',
    adminReplyAt: null,
    conversation: Array.isArray(item.conversation) ? item.conversation : [
      ...(item.message ? [{
        authorType: 'user',
        authorName: repairStoredArabic(item.name) || 'الطالب',
        message: repairStoredArabic(item.message),
        createdAt: item.createdAt || nowIso()
      }] : []),
      ...(item.adminReply ? [{
        authorType: 'admin',
        authorName: 'admin',
        message: repairStoredArabic(item.adminReply),
        createdAt: item.adminReplyAt || item.updatedAt || nowIso()
      }] : [])
    ],
    ...item
  })).map((item) => ({
    ...item,
    name: repairStoredArabic(item.name),
    subject: repairStoredArabic(item.subject),
    message: repairStoredArabic(item.message),
    adminReply: repairStoredArabic(item.adminReply),
    conversation: Array.isArray(item.conversation) ? item.conversation.map((entry) => ({
      ...entry,
      authorName: repairStoredArabic(entry.authorName),
      message: repairStoredArabic(entry.message)
    })) : []
  }));
  if (!Array.isArray(data.notifications)) data.notifications = [];
  data.notifications = data.notifications.map((item) => ({
    read: false,
    createdAt: nowIso(),
    ...item
  }));
  if (!Array.isArray(data.loginAttempts)) data.loginAttempts = [];
  data.loginAttempts = data.loginAttempts.map((item) => ({
    email: String(item.email || '').trim().toLowerCase(),
    failedCount: Number(item.failedCount || 0),
    lockedUntil: item.lockedUntil || null,
    lastAttemptAt: item.lastAttemptAt || nowIso(),
    ...item
  })).filter((item) => item.email);
  if (!Array.isArray(data.adminActivityLog)) data.adminActivityLog = [];
  data.adminActivityLog = data.adminActivityLog.map((item) => ({
    createdAt: nowIso(),
    ...item
  }));
  if (!data.counters) data.counters = { userId: 0, supportId: 0, notificationId: 0, adminLogId: 0 };
  if (typeof data.counters.supportId !== 'number') data.counters.supportId = 0;
  if (typeof data.counters.notificationId !== 'number') data.counters.notificationId = 0;
  if (typeof data.counters.adminLogId !== 'number') data.counters.adminLogId = 0;
  return data;
}

function listBackupFiles() {
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith('codecraft-db-') && name.endsWith('.json'))
    .sort((first, second) => second.localeCompare(first));
}

function sanitizeBackupLabel(label) {
  return String(label || 'auto').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function createDbBackup(snapshot, reason = 'auto') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `codecraft-db-${timestamp}-${sanitizeBackupLabel(reason)}.json`;
  const backupPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), 'utf8');

  const backups = listBackupFiles();

  backups.slice(MAX_DB_BACKUPS).forEach((name) => {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, name));
    } catch {
      // Some OneDrive-managed files may be temporarily locked; skip them.
    }
  });
}

function saveDb(db, reason = 'auto') {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  createDbBackup(db, reason);
}

let db = loadDb();
createDbBackup(db, 'startup');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  };
}

function verifyPassword(password, hash, salt) {
  return hashPassword(password, salt).hash === hash;
}

function nowIso() {
  return new Date().toISOString();
}

function repairStoredArabic(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return value;
  if (!/[ØÙطظ]/.test(text)) return value;
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8').trim();
    if (/[\u0600-\u06FF]/.test(repaired)) return repaired;
  } catch {
    return value;
  }
  return value;
}

function createDefaultAdminConfig() {
  const defaultPassword = 'AbdoAdmin2026!';
  const { hash, salt } = hashPassword(defaultPassword);
  return {
    username: 'admin',
    passwordHash: hash,
    salt,
    updatedAt: nowIso()
  };
}

function loadAdminConfig() {
  if (!fs.existsSync(ADMIN_CONFIG_PATH)) {
    const initial = createDefaultAdminConfig();
    fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8').replace(/^\uFEFF/, '');
  const config = JSON.parse(raw);
  if (!config.username || !config.passwordHash || !config.salt) {
    const repaired = createDefaultAdminConfig();
    fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(repaired, null, 2), 'utf8');
    return repaired;
  }
  return config;
}

let adminConfig = loadAdminConfig();

function saveAdminConfig(nextConfig) {
  adminConfig = {
    ...adminConfig,
    ...nextConfig,
    updatedAt: nowIso()
  };
  fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(adminConfig, null, 2), 'utf8');
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function addHours(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const cookies = {};
  raw.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (!name) return;
    cookies[name] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (IS_PRODUCTION) parts.push('Secure');
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
  const existing = res.getHeader('Set-Cookie');
  const next = Array.isArray(existing) ? existing.concat(parts.join('; ')) : existing ? [existing, parts.join('; ')] : [parts.join('; ')];
  res.setHeader('Set-Cookie', next);
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0, expires: new Date(0).toISOString() });
}

function sendJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  const body = Buffer.from(html);
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function addMinutes(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function addSeconds(seconds) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
}

function findUserByEmail(email) {
  return db.users.find((item) => item.email === normalizeEmail(email)) || null;
}

function findUserById(id) {
  return db.users.find((item) => item.id === id) || null;
}

function findSubscription(userId) {
  return db.subscriptions.find((item) => item.userId === userId) || null;
}

function findProgress(userId) {
  return db.progress.find((item) => item.userId === userId) || null;
}

function findLoginAttempt(email) {
  const normalizedEmail = normalizeEmail(email);
  return db.loginAttempts.find((item) => item.email === normalizedEmail) || null;
}

function loginLockState(email) {
  const attempt = findLoginAttempt(email);
  if (!attempt) return null;
  if (attempt.lockedUntil && new Date(attempt.lockedUntil).getTime() > Date.now()) {
    return attempt;
  }
  if (attempt.lockedUntil && new Date(attempt.lockedUntil).getTime() <= Date.now()) {
    attempt.lockedUntil = null;
    attempt.failedCount = 0;
  }
  return null;
}

function recordFailedLogin(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  let attempt = findLoginAttempt(normalizedEmail);
  if (!attempt) {
    attempt = { email: normalizedEmail, failedCount: 0, lockedUntil: null, lastAttemptAt: nowIso() };
    db.loginAttempts.push(attempt);
  }
  if (attempt.lockedUntil && new Date(attempt.lockedUntil).getTime() > Date.now()) {
    attempt.lastAttemptAt = nowIso();
    return attempt;
  }
  attempt.failedCount += 1;
  attempt.lastAttemptAt = nowIso();
  if (attempt.failedCount >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = addMinutes(LOGIN_LOCK_MINUTES);
  }
  return attempt;
}

function clearLoginAttempt(email) {
  const attempt = findLoginAttempt(email);
  if (!attempt) return;
  attempt.failedCount = 0;
  attempt.lockedUntil = null;
  attempt.lastAttemptAt = nowIso();
}

function lockedLoginAttempts() {
  const now = Date.now();
  return db.loginAttempts
    .filter((item) => item.lockedUntil && new Date(item.lockedUntil).getTime() > now)
    .sort((first, second) => new Date(second.lockedUntil).getTime() - new Date(first.lockedUntil).getTime());
}

function notificationsForUser(userId) {
  return db.notifications
    .filter((item) => item.userId === userId)
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
}

function lessonExists(lessonId) {
  return LESSONS.some((item) => item.id === lessonId);
}

function recalculateProgress(progress) {
  if (!progress) return {
    progress: 0,
    achievements: 0,
    completedLessons: [],
    passedExams: [],
    watchedLessons: [],
    watchSessions: {},
    examBestScores: {},
    certificateIssuedAt: null
  };
  const completedLessons = Array.isArray(progress.completedLessons) ? progress.completedLessons : [];
  const passedExams = Array.isArray(progress.passedExams) ? progress.passedExams : [];
  if (!Array.isArray(progress.watchedLessons)) progress.watchedLessons = [];
  if (!progress.watchSessions || typeof progress.watchSessions !== 'object') progress.watchSessions = {};
  if (!progress.examBestScores || typeof progress.examBestScores !== 'object') progress.examBestScores = {};
  if (!progress.certificateIssuedAt) progress.certificateIssuedAt = null;
  const lessonShare = LESSONS.length ? Math.round((completedLessons.length / LESSONS.length) * 70) : 0;
  const examTotal = Object.keys(EXAMS).length;
  const examShare = examTotal ? Math.round((passedExams.length / examTotal) * 30) : 0;
  progress.progress = Math.min(100, lessonShare + examShare);
  progress.achievements = completedLessons.length + passedExams.length;
  return progress;
}

function buildCertificateStatus(user, progress) {
  const passedCount = Array.isArray(progress?.passedExams) ? progress.passedExams.length : 0;
  const remaining = Math.max(0, CERTIFICATE_REQUIRED_EXAMS - passedCount);
  return {
    eligible: passedCount >= CERTIFICATE_REQUIRED_EXAMS,
    requiredExams: CERTIFICATE_REQUIRED_EXAMS,
    passedCount,
    remainingExams: remaining,
    studentName: user?.name || 'طالب المنصة',
    issuedAt: passedCount >= CERTIFICATE_REQUIRED_EXAMS ? progress?.certificateIssuedAt || nowIso() : null
  };
}

function watchStateForLesson(progress, lessonId) {
  const watched = Array.isArray(progress?.watchedLessons) && progress.watchedLessons.includes(lessonId);
  const session = progress?.watchSessions?.[lessonId] || null;
  const eligible = watched || Boolean(session?.eligibleAt && new Date(session.eligibleAt).getTime() <= Date.now());
  const remainingSeconds = eligible
    ? 0
    : session?.eligibleAt
      ? Math.max(0, Math.ceil((new Date(session.eligibleAt).getTime() - Date.now()) / 1000))
      : LESSON_WATCH_REQUIRED_SECONDS;
  return {
    startedAt: session?.startedAt || null,
    eligibleAt: session?.eligibleAt || null,
    watched,
    eligible,
    requiredSeconds: LESSON_WATCH_REQUIRED_SECONDS,
    remainingSeconds
  };
}

function createNotification(userId, title, message, type = 'info') {
  if (!userId || !title || !message) return null;
  const dedupeKey = arguments.length > 4 ? String(arguments[4] || '').trim() : '';
  if (dedupeKey && db.notifications.some((item) => item.userId === userId && item.dedupeKey === dedupeKey)) {
    return null;
  }
  db.counters.notificationId += 1;
  const notification = {
    id: db.counters.notificationId,
    userId,
    title: String(title).trim(),
    message: String(message).trim(),
    type,
    read: false,
    dedupeKey,
    createdAt: nowIso()
  };
  db.notifications.push(notification);
  return notification;
}

function latestAdminReply(ticket) {
  const conversation = Array.isArray(ticket?.conversation) ? ticket.conversation : [];
  return conversation
    .filter((item) => item.authorType === 'admin')
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())[0] || null;
}

function buildAdminAnalytics() {
  const activeSubscriptions = db.subscriptions.filter((item) => (
    item.status === 'active'
    && item.expiresAt
    && new Date(item.expiresAt).getTime() > Date.now()
  ));

  const issueCounter = new Map();
  db.supportTickets.forEach((ticket) => {
    const key = String(ticket.subject || 'غير مصنف').trim() || 'غير مصنف';
    issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
  });

  const lessonCounter = new Map();
  db.progress.forEach((entry) => {
    (entry.completedLessons || []).forEach((lessonId) => {
      lessonCounter.set(lessonId, (lessonCounter.get(lessonId) || 0) + 1);
    });
  });

  const topIssues = Array.from(issueCounter.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);

  const topLessons = Array.from(lessonCounter.entries())
    .map(([lessonId, count]) => {
      const lesson = LESSONS.find((item) => item.id === lessonId);
      return {
        lessonId,
        title: lesson?.title || lessonId,
        count
      };
    })
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);

  return {
    studentsCount: db.users.length,
    activeSubscriptionsCount: activeSubscriptions.length,
    supportTicketsCount: db.supportTickets.length,
    completedLessonsCount: Array.from(lessonCounter.values()).reduce((sum, value) => sum + value, 0),
    topIssues,
    topLessons
  };
}

function daysUntil(dateValue) {
  const target = new Date(dateValue).getTime();
  const diff = target - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildSubscriptionReports() {
  const reports = {
    expired: [],
    expiring3: [],
    expiring7: []
  };

  db.subscriptions.forEach((subscription) => {
    if (!subscription || !subscription.expiresAt || !subscription.planKey) return;
    const user = findUserById(subscription.userId);
    if (!user) return;
    const daysLeft = daysUntil(subscription.expiresAt);
    const row = {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      planLabel: subscription.label || PLAN_META[subscription.planKey]?.label || subscription.planKey,
      expiresAt: subscription.expiresAt,
      daysLeft
    };

    if (daysLeft < 0) {
      reports.expired.push(row);
      return;
    }
    if (daysLeft <= 3) {
      reports.expiring3.push(row);
      return;
    }
    if (daysLeft <= 7) {
      reports.expiring7.push(row);
    }
  });

  ['expired', 'expiring3', 'expiring7'].forEach((key) => {
    reports[key].sort((first, second) => new Date(first.expiresAt).getTime() - new Date(second.expiresAt).getTime());
  });

  return reports;
}

function refreshSubscriptionAlerts() {
  let changed = false;
  db.subscriptions.forEach((subscription) => {
    if (!subscription || !subscription.expiresAt || !subscription.planKey) return;
    const user = findUserById(subscription.userId);
    if (!user) return;
    const planLabel = subscription.label || PLAN_META[subscription.planKey]?.label || subscription.planKey;
    const expiryDate = new Date(subscription.expiresAt).toLocaleDateString('ar-EG');
    const daysLeft = daysUntil(subscription.expiresAt);

    if (daysLeft < 0) {
      const created = createNotification(
        user.id,
        'انتهى اشتراكك',
        `اشتراك ${planLabel} انتهى في ${expiryDate}. جدد الاشتراك للاستمرار في الدروس والاختبارات.`,
        'warning',
        `subscription-expired-${user.id}-${subscription.expiresAt}`
      );
      if (created) changed = true;
      return;
    }

    if (daysLeft <= 3) {
      const created = createNotification(
        user.id,
        'اشتراكك على وشك الانتهاء',
        `اشتراك ${planLabel} سينتهي خلال ${daysLeft} يوم${daysLeft === 1 ? '' : ''} بتاريخ ${expiryDate}.`,
        'warning',
        `subscription-expiring3-${user.id}-${subscription.expiresAt}`
      );
      if (created) changed = true;
      return;
    }

    if (daysLeft <= 7) {
      const created = createNotification(
        user.id,
        'تنبيه مبكر للاشتراك',
        `اشتراك ${planLabel} سينتهي خلال ${daysLeft} أيام بتاريخ ${expiryDate}.`,
        'info',
        `subscription-expiring7-${user.id}-${subscription.expiresAt}`
      );
      if (created) changed = true;
    }
  });

  if (changed) saveDb(db, 'subscription-alerts');
}

function buildAdminStudents() {
  return db.users.map((user) => {
    const subscription = findSubscription(user.id);
    const progress = recalculateProgress(findProgress(user.id) || { progress: 0, achievements: 0, completedLessons: [], passedExams: [] });
    const latestSession = db.sessions
      .filter((item) => item.sessionType === 'user' && item.userId === user.id)
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())[0] || null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      track: user.track,
      level: user.level,
      createdAt: user.createdAt,
      subscriptionStatus: subscription?.status || 'inactive',
      subscriptionLabel: subscription?.label || 'بدون اشتراك',
      expiresAt: subscription?.expiresAt || null,
      progress: progress.progress || 0,
      completedLessons: (progress.completedLessons || []).length,
      passedExams: (progress.passedExams || []).length,
      achievements: progress.achievements || 0,
      lastSeenAt: latestSession?.createdAt || null
    };
  }).sort((first, second) => first.name.localeCompare(second.name, 'ar'));
}

function buildAdminBackups() {
  return listBackupFiles().map((name) => {
    const backupPath = path.join(BACKUP_DIR, name);
    const stats = fs.statSync(backupPath);
    return {
      name,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    };
  });
}

function addAdminActivity(action, details) {
  db.counters.adminLogId += 1;
  const entry = {
    id: db.counters.adminLogId,
    actor: adminConfig.username,
    action: String(action || '').trim(),
    details: String(details || '').trim(),
    createdAt: nowIso()
  };
  db.adminActivityLog.push(entry);
  if (db.adminActivityLog.length > 300) {
    db.adminActivityLog = db.adminActivityLog
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
      .slice(0, 300);
  }
  return entry;
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, track: user.track, level: user.level, goal: user.goal };
}

function bundleForUser(userId) {
  const user = findUserById(userId);
  const subscription = findSubscription(userId);
  const progress = recalculateProgress(findProgress(userId) || { progress: 0, achievements: 0, completedLessons: [], passedExams: [] });
  const latestSupportTicket = db.supportTickets
    .filter((item) => item.userId === userId || normalizeEmail(item.email) === normalizeEmail(user?.email))
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())[0] || null;
  const notifications = notificationsForUser(userId).slice(0, 12);
  return {
    user: publicUser(user),
    subscription: subscription ? {
      status: subscription.status,
      label: subscription.label,
      planKey: subscription.planKey,
      requestCode: subscription.requestCode,
      activationCode: subscription.activationCode,
      expiresAt: subscription.expiresAt
    } : null,
    progress,
    watchRequirements: LESSONS.reduce((collection, lesson) => {
      collection[lesson.id] = watchStateForLesson(progress, lesson.id);
      return collection;
    }, {}),
    notifications,
    unreadNotifications: notifications.filter((item) => !item.read).length,
    certificate: buildCertificateStatus(user, progress),
    latestSupportTicket: latestSupportTicket ? {
      id: latestSupportTicket.id,
      subject: latestSupportTicket.subject,
      status: latestSupportTicket.status,
      adminReply: latestAdminReply(latestSupportTicket)?.message || latestSupportTicket.adminReply || '',
      adminReplyAt: latestAdminReply(latestSupportTicket)?.createdAt || latestSupportTicket.adminReplyAt || null,
      createdAt: latestSupportTicket.createdAt,
      updatedAt: latestSupportTicket.updatedAt
    } : null
  };
}

function createSession(userId, sessionType) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = sessionType === 'admin' ? addHours(ADMIN_SESSION_HOURS) : addDays(SESSION_DAYS);
  db.sessions.push({ token, userId: userId || null, sessionType, expiresAt, createdAt: nowIso() });
  saveDb(db);
  return { token, expiresAt };
}

function getSession(req, sessionType) {
  const cookies = parseCookies(req);
  const token = cookies[sessionType === 'admin' ? 'cc_admin' : 'cc_session'];
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token && item.sessionType === sessionType) || null;
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.sessions = db.sessions.filter((item) => item.token !== token);
    saveDb(db);
    return null;
  }
  return session;
}

function getUserSession(req) { return getSession(req, 'user'); }
function getAdminSession(req) { return getSession(req, 'admin'); }

function requireUserPage(req, res) {
  const session = getUserSession(req);
  if (!session) {
    redirect(res, '/login.html');
    return null;
  }
  return session;
}

function requireActiveSubscriptionPage(req, res) {
  const session = requireUserPage(req, res);
  if (!session) return null;
  const subscription = findSubscription(session.userId);
  if (!subscription || subscription.status !== 'active' || !subscription.expiresAt || new Date(subscription.expiresAt).getTime() <= Date.now()) {
    redirect(res, '/subscription.html');
    return null;
  }
  return session;
}

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) return sendHtml(res, 404, '<h1>404</h1>');
  const body = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  res.end(body);
}

function createRequestCode() {
  return `REQ-${Date.now().toString(36).toUpperCase()}`;
}

function requireAdminApi(req, res) {
  if (!getAdminSession(req)) {
    sendJson(res, 401, { error: 'غير مصرح.' });
    return false;
  }
  return true;
}

function randomCodeSegment(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateUniqueActivationCode(planKey) {
  const prefixMap = { basic: 'CC-BASIC', pro: 'CC-PRO', elite: 'CC-ELITE' };
  let code = '';
  do {
    code = `${prefixMap[planKey]}-${randomCodeSegment(3)}${randomCodeSegment(3)}`;
  } while (db.activationCodes.some((item) => item.code === code));
  return code;
}

function whatsappLink(user, planKey, requestCode) {
  const plan = PLAN_META[planKey];
  const message = encodeURIComponent(`السلام عليكم، أريد الاشتراك في ${plan.label}\nالاسم: ${user.name}\nالبريد: ${user.email}\nالهاتف: ${user.phone}\nكود الطلب: ${requestCode}\nمن فضلك أرسل لي كود التفعيل.`);
  return `https://wa.me/${CONTACT_WA}?text=${message}`;
}

function handleApiSession(req, res) {
  refreshSubscriptionAlerts();
  const session = getUserSession(req);
  if (!session) return sendJson(res, 200, { authenticated: false, plans: PLAN_META, tracks: TRACK_CATALOG, lessons: LESSONS, exams: EXAMS, contactPhone: CONTACT_PHONE });
  return sendJson(res, 200, { authenticated: true, ...bundleForUser(session.userId), plans: PLAN_META, tracks: TRACK_CATALOG, lessons: LESSONS, exams: EXAMS, contactPhone: CONTACT_PHONE });
}

function handleRegister(res, body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const track = String(body.track || '').trim();
  const level = String(body.level || '').trim();
  const goal = String(body.goal || '').trim();
  const password = String(body.password || '');
  if (!name || !email || !phone || !track || !level || !goal || password.length < 6) {
    return sendJson(res, 400, { error: 'أكمل البيانات المطلوبة وكلمة مرور لا تقل عن 6 أحرف.' });
  }
  if (findUserByEmail(email)) {
    return sendJson(res, 409, { error: 'هذا البريد الإلكتروني مسجل بالفعل.' });
  }
  const { hash, salt } = hashPassword(password);
  db.counters.userId += 1;
  const userId = db.counters.userId;
  db.users.push({ id: userId, name, email, phone, track, level, goal, passwordHash: hash, salt, createdAt: nowIso() });
  db.subscriptions.push({ userId, status: 'inactive', label: 'بدون اشتراك', planKey: null, requestCode: null, activationCode: null, expiresAt: null, updatedAt: nowIso() });
  db.progress.push({ userId, progress: 0, achievements: 0, completedLessons: [], passedExams: [], watchedLessons: [], watchSessions: {}, examBestScores: {}, certificateIssuedAt: null });
  createNotification(userId, 'أهلاً بك في CodeCraft 3D', 'تم إنشاء حسابك بنجاح. اختر باقتك وابدأ رحلتك داخل المنصة.', 'success');
  saveDb(db);
  const session = createSession(userId, 'user');
  setCookie(res, 'cc_session', session.token, { expires: session.expiresAt });
  return sendJson(res, 201, { ok: true });
}

function handleLogin(res, body) {
  const email = normalizeEmail(body.email);
  const lockedAttempt = loginLockState(email);
  if (lockedAttempt) {
    return sendJson(res, 423, {
      error: `تم حظر تسجيل الدخول مؤقتًا بسبب كثرة المحاولات الخاطئة. حاول مرة أخرى بعد ${new Date(lockedAttempt.lockedUntil).toLocaleTimeString('ar-EG')}.`
    });
  }
  const user = findUserByEmail(email);
  const password = String(body.password || '');
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    const failedAttempt = recordFailedLogin(email);
    saveDb(db, 'login-attempt');
    if (failedAttempt?.lockedUntil && new Date(failedAttempt.lockedUntil).getTime() > Date.now()) {
      return sendJson(res, 423, {
        error: `تم حظر هذا الحساب مؤقتًا لمدة ${LOGIN_LOCK_MINUTES} دقيقة بسبب تكرار كلمة المرور الغلط.`
      });
    }
    return sendJson(res, 401, { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
  }
  clearLoginAttempt(email);
  const session = createSession(user.id, 'user');
  setCookie(res, 'cc_session', session.token, { expires: session.expiresAt });
  return sendJson(res, 200, { ok: true });
}

function handleResetPassword(res, body) {
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  const newPassword = String(body.newPassword || '');
  const user = findUserByEmail(email);
  if (!user || user.phone !== phone) {
    return sendJson(res, 404, { error: 'البيانات غير مطابقة لحساب موجود.' });
  }
  if (newPassword.length < 6) {
    return sendJson(res, 400, { error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.' });
  }
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  clearLoginAttempt(email);
  db.sessions = db.sessions.filter((item) => !(item.sessionType === 'user' && item.userId === user.id));
  saveDb(db);
  return sendJson(res, 200, { ok: true, message: 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
}

function handleLogout(req, res) {
  const session = getUserSession(req);
  if (session) {
    db.sessions = db.sessions.filter((item) => item.token !== session.token);
    saveDb(db);
  }
  clearCookie(res, 'cc_session');
  return sendJson(res, 200, { ok: true });
}

function handleAccountUpdate(req, res, body) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  const user = findUserById(session.userId);
  if (!user) return sendJson(res, 404, { error: 'الحساب غير موجود.' });
  const nextEmail = normalizeEmail(body.email);
  const nextName = String(body.name || '').trim();
  const nextPhone = String(body.phone || '').trim();
  const nextTrack = String(body.track || '').trim();
  const nextLevel = String(body.level || '').trim();
  const nextGoal = String(body.goal || '').trim();
  if (!nextName || !nextEmail || !nextPhone || !nextTrack || !nextLevel || !nextGoal) {
    return sendJson(res, 400, { error: 'أكمل كل البيانات المطلوبة.' });
  }
  const duplicated = db.users.find((item) => item.email === nextEmail && item.id !== user.id);
  if (duplicated) {
    return sendJson(res, 409, { error: 'هذا البريد الإلكتروني مستخدم في حساب آخر.' });
  }
  Object.assign(user, {
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
    track: nextTrack,
    level: nextLevel,
    goal: nextGoal
  });
  saveDb(db);
  return sendJson(res, 200, { ok: true, user: publicUser(user) });
}

function handleSupportCreate(req, res, body) {
  const session = getUserSession(req);
  const linkedUser = session ? findUserById(session.userId) : null;
  const name = String(body.name || linkedUser?.name || '').trim();
  const email = normalizeEmail(body.email || linkedUser?.email || '');
  const phone = String(body.phone || linkedUser?.phone || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (!name || !email || !phone || !subject || message.length < 10) {
    return sendJson(res, 400, { error: 'أكمل الاسم والبريد والهاتف وموضوع المشكلة، واكتب وصفًا أوضح للمشكلة.' });
  }

  db.counters.supportId += 1;
  const ticket = {
    id: db.counters.supportId,
    userId: linkedUser?.id || null,
    name,
    email,
    phone,
    subject,
    message,
    status: 'open',
    adminReply: '',
    adminReplyAt: null,
    conversation: [{
      authorType: 'user',
      authorName: name,
      message,
      createdAt: nowIso()
    }],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  db.supportTickets.push(ticket);
  if (linkedUser?.id) {
    createNotification(linkedUser.id, 'تم استلام طلب الدعم', `استلمنا تذكرتك رقم #${ticket.id} بعنوان "${subject}" وسنتابعها قريبًا.`, 'info');
  }
  saveDb(db);

  return sendJson(res, 201, {
    ok: true,
    ticket: {
      id: ticket.id,
      status: ticket.status,
      adminReply: ticket.adminReply,
      adminReplyAt: ticket.adminReplyAt,
      conversation: ticket.conversation,
      createdAt: ticket.createdAt
    },
    whatsappUrl: `https://wa.me/${CONTACT_WA}?text=${encodeURIComponent(`السلام عليكم، عندي مشكلة في الموقع.\nرقم التذكرة: #${ticket.id}\nالاسم: ${name}\nالموضوع: ${subject}\nالتفاصيل: ${message}`)}`
  });
}

function handleSupportTrack(res, body) {
  const ticketId = Number(String(body.ticketId || '').replace(/[^\d]/g, ''));
  const email = normalizeEmail(body.email);
  if (!ticketId || !email) {
    return sendJson(res, 400, { error: 'اكتب رقم التذكرة والبريد الإلكتروني المرتبط بها.' });
  }
  const ticket = db.supportTickets.find((item) => item.id === ticketId && normalizeEmail(item.email) === email);
  if (!ticket) {
    return sendJson(res, 404, { error: 'لم نجد تذكرة مطابقة لهذه البيانات.' });
  }
  return sendJson(res, 200, {
    ok: true,
    ticket: {
      id: ticket.id,
      name: ticket.name,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      adminReply: ticket.adminReply || '',
      adminReplyAt: ticket.adminReplyAt || null,
      conversation: Array.isArray(ticket.conversation) ? ticket.conversation : [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    }
  });
}

function handleSupportReply(res, body) {
  const ticketId = Number(String(body.ticketId || '').replace(/[^\d]/g, ''));
  const email = normalizeEmail(body.email);
  const message = String(body.message || '').trim();
  if (!ticketId || !email || message.length < 2) {
    return sendJson(res, 400, { error: 'اكتب رقم التذكرة والبريد والرسالة الجديدة بشكل صحيح.' });
  }
  const ticket = db.supportTickets.find((item) => item.id === ticketId && normalizeEmail(item.email) === email);
  if (!ticket) {
    return sendJson(res, 404, { error: 'لم نجد تذكرة مطابقة لهذه البيانات.' });
  }
  if (ticket.status === 'closed') {
    return sendJson(res, 409, { error: 'هذه التذكرة مغلقة نهائيًا ولا تقبل رسائل جديدة.' });
  }
  ticket.conversation = Array.isArray(ticket.conversation) ? ticket.conversation : [];
  ticket.conversation.push({
    authorType: 'user',
    authorName: ticket.name || 'الطالب',
    message,
    createdAt: nowIso()
  });
  ticket.status = 'open';
  ticket.updatedAt = nowIso();
  saveDb(db);
  return sendJson(res, 200, {
    ok: true,
    ticket: {
      id: ticket.id,
      name: ticket.name,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      adminReply: ticket.adminReply || '',
      adminReplyAt: ticket.adminReplyAt || null,
      conversation: ticket.conversation,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    }
  });
}

function handlePlanRequest(req, res, body) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  const planKey = String(body.planKey || '');
  const plan = PLAN_META[planKey];
  if (!plan) return sendJson(res, 400, { error: 'الباقة غير صحيحة.' });
  const subscription = findSubscription(session.userId);
  const requestCode = createRequestCode();
  Object.assign(subscription, { status: 'pending_activation', label: plan.label, planKey, requestCode, activationCode: null, expiresAt: null, updatedAt: nowIso() });
  createNotification(session.userId, 'تم تسجيل طلب الاشتراك', `تم تجهيز طلب باقة ${plan.label}. كود الطلب الخاص بك هو ${requestCode}.`, 'info');
  saveDb(db);
  const user = findUserById(session.userId);
  return sendJson(res, 200, { ok: true, requestCode, whatsappUrl: whatsappLink(user, planKey, requestCode) });
}

function handleActivate(req, res, body) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  const code = String(body.code || '').trim().toUpperCase();
  const subscription = findSubscription(session.userId);
  if (!subscription || !subscription.planKey) return sendJson(res, 400, { error: 'اختر باقة أولًا قبل التفعيل.' });
  const activation = db.activationCodes.find((item) => item.code === code);
  if (!activation) return sendJson(res, 404, { error: 'كود التفعيل غير صحيح.' });
  if (activation.used) return sendJson(res, 409, { error: 'هذا الكود تم استخدامه من قبل.' });
  if (activation.disabled) return sendJson(res, 409, { error: 'هذا الكود موقوف من الإدارة.' });
  if (activation.planKey !== subscription.planKey) return sendJson(res, 400, { error: 'هذا الكود لا يخص الباقة المطلوبة.' });
  const plan = PLAN_META[subscription.planKey];
  activation.used = true;
  activation.usedBy = session.userId;
  activation.usedAt = nowIso();
  Object.assign(subscription, { status: 'active', label: plan.label, activationCode: code, expiresAt: addDays(plan.days), updatedAt: nowIso() });
  createNotification(session.userId, 'تم تفعيل اشتراكك', `اشتراك ${plan.label} أصبح مفعلًا الآن وينتهي في ${new Date(addDays(plan.days)).toLocaleDateString('ar-EG')}.`, 'success');
  saveDb(db);
  return sendJson(res, 200, { ok: true });
}

function handleNotificationsRead(req, res) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  let changed = false;
  db.notifications.forEach((item) => {
    if (item.userId === session.userId && !item.read) {
      item.read = true;
      changed = true;
    }
  });
  if (changed) saveDb(db);
  return sendJson(res, 200, { ok: true });
}

function handleLessonWatchStart(req, res, lessonId) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  if (!hasActiveSubscription(session.userId)) return sendJson(res, 403, { error: 'هذه الصفحة متاحة بعد تفعيل الاشتراك فقط.' });
  if (!lessonExists(lessonId)) return sendJson(res, 404, { error: 'الدرس المطلوب غير موجود.' });
  const progress = recalculateProgress(findProgress(session.userId));
  const currentState = watchStateForLesson(progress, lessonId);
  if (currentState.eligible) return sendJson(res, 200, { ok: true, watch: currentState });
  const currentSession = progress.watchSessions[lessonId] || {};
  progress.watchSessions[lessonId] = {
    startedAt: currentSession.startedAt || nowIso(),
    eligibleAt: currentSession.eligibleAt || addSeconds(LESSON_WATCH_REQUIRED_SECONDS),
    updatedAt: nowIso()
  };
  saveDb(db);
  return sendJson(res, 200, { ok: true, watch: watchStateForLesson(progress, lessonId) });
}

function hasActiveSubscription(userId) {
  const subscription = findSubscription(userId);
  return Boolean(subscription && subscription.status === 'active' && subscription.expiresAt && new Date(subscription.expiresAt).getTime() > Date.now());
}

function handleLessonComplete(req, res, lessonId) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  if (!hasActiveSubscription(session.userId)) return sendJson(res, 403, { error: 'هذه الصفحة متاحة بعد تفعيل الاشتراك فقط.' });
  if (!lessonExists(lessonId)) return sendJson(res, 404, { error: 'الدرس المطلوب غير موجود.' });
  const progress = recalculateProgress(findProgress(session.userId));
  const watchState = watchStateForLesson(progress, lessonId);
  if (!watchState.eligible) {
    return sendJson(res, 409, { error: `يجب مشاهدة الدرس أولًا. المتبقي تقريبًا ${watchState.remainingSeconds} ثانية قبل فتح الإكمال.` });
  }
  if (!progress.watchedLessons.includes(lessonId)) progress.watchedLessons.push(lessonId);
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    recalculateProgress(progress);
  }
  saveDb(db);
  return sendJson(res, 200, { ok: true });
}

function handleExamPass(req, res, lessonId, body = {}) {
  const session = getUserSession(req);
  if (!session) return sendJson(res, 401, { error: 'سجل الدخول أولًا.' });
  if (!EXAMS[lessonId]) return sendJson(res, 404, { error: 'الاختبار المطلوب غير موجود.' });
  const progress = recalculateProgress(findProgress(session.userId));
  if (!progress.completedLessons.includes(lessonId)) return sendJson(res, 400, { error: 'أكمل الدرس أولًا.' });
  const score100 = Math.max(0, Math.min(100, Number(body.score100 || 0)));
  const score10 = Math.max(0, Math.min(10, Number(body.score10 || 0)));
  const totalQuestions = Math.max(0, Number(body.totalQuestions || 0));
  const correctCount = Math.max(0, Number(body.correctCount || 0));
  const bestScore = progress.examBestScores?.[lessonId] || null;
  if (!bestScore || score100 >= Number(bestScore.score100 || 0)) {
    progress.examBestScores[lessonId] = {
      score100,
      score10,
      totalQuestions,
      correctCount,
      savedAt: nowIso()
    };
  }

  const passedNow = score100 >= EXAM_PASS_SCORE;
  const wasPassed = progress.passedExams.includes(lessonId);
  if (passedNow && !wasPassed) {
    progress.passedExams.push(lessonId);
    recalculateProgress(progress);
    if (!progress.certificateIssuedAt && progress.passedExams.length >= CERTIFICATE_REQUIRED_EXAMS) {
      progress.certificateIssuedAt = nowIso();
    }
    if (progress.passedExams.length === CERTIFICATE_REQUIRED_EXAMS) {
      createNotification(session.userId, 'أصبحت مؤهلًا لشهادة الإتمام', `مبروك، اجتزت ${CERTIFICATE_REQUIRED_EXAMS} اختبارات ويمكنك الآن الحصول على شهادة الإتمام من صفحة الاختبارات.`, 'success');
    }
  }
  saveDb(db);
  return sendJson(res, 200, {
    ok: true,
    passed: passedNow,
    bestScore: progress.examBestScores[lessonId],
    progress,
    certificate: buildCertificateStatus(findUserById(session.userId), progress)
  });
}

function handleAdminLogin(res, body) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (username !== adminConfig.username || !verifyPassword(password, adminConfig.passwordHash, adminConfig.salt)) {
    return sendJson(res, 401, { error: 'بيانات الأدمن غير صحيحة.' });
  }
  const session = createSession(null, 'admin');
  addAdminActivity('تسجيل دخول', 'تم تسجيل دخول الأدمن إلى لوحة الإدارة.');
  saveDb(db);
  setCookie(res, 'cc_admin', session.token, { expires: session.expiresAt });
  return sendJson(res, 200, { ok: true });
}

function handleAdminChangePassword(req, res, body) {
  if (!requireAdminApi(req, res)) return;
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!verifyPassword(currentPassword, adminConfig.passwordHash, adminConfig.salt)) {
    return sendJson(res, 401, { error: 'كلمة المرور الحالية غير صحيحة.' });
  }
  if (newPassword.length < 8) {
    return sendJson(res, 400, { error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.' });
  }
  const { hash, salt } = hashPassword(newPassword);
  saveAdminConfig({ passwordHash: hash, salt });
  addAdminActivity('تغيير كلمة المرور', 'تم تحديث كلمة مرور الأدمن من داخل لوحة الإدارة.');
  saveDb(db);
  return sendJson(res, 200, { ok: true, message: 'تم تغيير كلمة مرور الأدمن بنجاح.' });
}

function handleAdminLogout(req, res) {
  const session = getAdminSession(req);
  if (session) {
    addAdminActivity('تسجيل خروج', 'تم تسجيل خروج الأدمن من لوحة الإدارة.');
    db.sessions = db.sessions.filter((item) => item.token !== session.token);
    saveDb(db);
  }
  clearCookie(res, 'cc_admin');
  return sendJson(res, 200, { ok: true });
}

function handleAdminSession(req, res) {
  return sendJson(res, 200, { authenticated: Boolean(getAdminSession(req)) });
}

function handleAdminCodes(req, res) {
  if (!requireAdminApi(req, res)) return;
  refreshSubscriptionAlerts();
  const analytics = buildAdminAnalytics();
  const subscriptionReports = buildSubscriptionReports();
  const students = buildAdminStudents();
  const backups = buildAdminBackups();
  const codes = db.activationCodes.map((item) => ({
    code: item.code,
    plan_key: item.planKey,
    used: item.used ? 1 : 0,
    disabled: item.disabled ? 1 : 0,
    used_at: item.usedAt,
    used_by_email: item.usedBy ? findUserById(item.usedBy)?.email || null : null,
    created_at: item.createdAt || null
  }));
  const requests = db.subscriptions
    .filter((item) => item.status === 'pending_activation')
    .map((item) => {
      const user = findUserById(item.userId);
      return {
        user_id: item.userId,
        name: user?.name || '-',
        email: user?.email || '-',
        phone: user?.phone || '-',
        plan_key: item.planKey,
        label: item.label,
        request_code: item.requestCode,
        updated_at: item.updatedAt
      };
    })
    .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime());
  const supportTickets = db.supportTickets
    .map((item) => ({
      id: item.id,
      user_id: item.userId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      subject: item.subject,
      message: item.message,
      status: item.status,
      admin_reply: item.adminReply || '',
      admin_reply_at: item.adminReplyAt || null,
      conversation: Array.isArray(item.conversation) ? item.conversation : [],
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }))
    .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime());
  const adminActivity = db.adminActivityLog
    .slice()
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 40);
  const loginLocks = lockedLoginAttempts().map((item) => ({
    email: item.email,
    failedCount: item.failedCount,
    lockedUntil: item.lockedUntil,
    lastAttemptAt: item.lastAttemptAt,
    userName: findUserByEmail(item.email)?.name || null
  }));
  return sendJson(res, 200, {
    summary: {
      total: codes.length,
      available: codes.filter((item) => item.used === 0 && item.disabled === 0).length,
      used: codes.filter((item) => item.used === 1).length,
      disabled: codes.filter((item) => item.disabled === 1).length,
      pendingRequests: requests.length,
      openTickets: supportTickets.filter((item) => item.status === 'open').length,
      lockedLogins: loginLocks.length
    },
    analytics,
    subscriptionReports,
    students,
    backups,
    codes,
    requests,
    supportTickets,
    loginLocks,
    adminActivity,
    contactPhone: CONTACT_PHONE
  });
}

function handleAdminUnlockLogin(req, res, body) {
  if (!requireAdminApi(req, res)) return;
  const email = normalizeEmail(body.email);
  if (!email) {
    return sendJson(res, 400, { error: 'حدد البريد الإلكتروني المطلوب فك الحظر عنه.' });
  }
  const attempt = findLoginAttempt(email);
  if (!attempt) {
    return sendJson(res, 404, { error: 'لا يوجد حظر مسجل لهذا البريد الإلكتروني.' });
  }
  clearLoginAttempt(email);
  addAdminActivity('فك حظر تسجيل الدخول', `تم فك الحظر المؤقت عن الحساب ${email}.`);
  saveDb(db, 'unlock-login');
  return sendJson(res, 200, { ok: true, message: `تم فك الحظر عن ${email}.` });
}

function handleAdminRestoreBackup(req, res, body) {
  if (!requireAdminApi(req, res)) return;
  const filename = String(body.filename || '').trim();
  if (!filename || /[\\/]/.test(filename) || !filename.endsWith('.json')) {
    return sendJson(res, 400, { error: 'اسم النسخة الاحتياطية غير صحيح.' });
  }
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return sendJson(res, 404, { error: 'النسخة الاحتياطية غير موجودة.' });
  }

  createDbBackup(db, 'pre-restore');
  fs.copyFileSync(backupPath, DB_PATH);
  db = loadDb();
  addAdminActivity('استعادة نسخة احتياطية', `تمت استعادة النسخة ${filename}.`);
  saveDb(db, 'restore');
  return sendJson(res, 200, { ok: true, message: `تمت استعادة النسخة ${filename} بنجاح.` });
}

function handleAdminSupportStatus(req, res, ticketId, body) {
  if (!requireAdminApi(req, res)) return;
  const targetId = Number(ticketId);
  const nextStatus = String(body.status || '').trim();
  const adminReply = typeof body.reply === 'string' ? body.reply.trim() : null;
  const allowed = ['open', 'in_progress', 'resolved', 'closed'];
  if (!allowed.includes(nextStatus)) {
    return sendJson(res, 400, { error: 'حالة التذكرة غير صحيحة.' });
  }
  const ticket = db.supportTickets.find((item) => item.id === targetId);
  if (!ticket) return sendJson(res, 404, { error: 'تذكرة الدعم غير موجودة.' });
  ticket.status = nextStatus;
  ticket.updatedAt = nowIso();
  if (adminReply !== null) {
    ticket.adminReply = adminReply;
    ticket.adminReplyAt = adminReply ? nowIso() : null;
    ticket.conversation = Array.isArray(ticket.conversation) ? ticket.conversation : [];
    if (adminReply) {
      ticket.conversation.push({
        authorType: 'admin',
        authorName: adminConfig.username,
        message: adminReply,
        createdAt: ticket.adminReplyAt
      });
    }
  }
  if (ticket.userId) {
    const replyText = ticket.adminReply ? ` رد الإدارة: ${ticket.adminReply}` : '';
    const statusText = nextStatus === 'resolved'
      ? 'تم الحل'
      : nextStatus === 'in_progress'
        ? 'جارٍ المتابعة'
        : nextStatus === 'closed'
          ? 'مغلقة'
          : 'مفتوحة';
    createNotification(ticket.userId, 'تم تحديث حالة طلب الدعم', `تذكرتك رقم #${ticket.id} أصبحت الآن: ${statusText}.${replyText}`, nextStatus === 'resolved' || nextStatus === 'closed' ? 'success' : 'info');
  }
  addAdminActivity('تحديث تذكرة دعم', `تم تغيير حالة التذكرة #${ticket.id} إلى ${nextStatus}${ticket.adminReply ? ' مع إضافة رد إداري.' : '.'}`);
  saveDb(db);
  return sendJson(res, 200, { ok: true, ticket: { id: ticket.id, status: ticket.status, adminReply: ticket.adminReply || '', adminReplyAt: ticket.adminReplyAt || null } });
}

function handleAdminGenerateCodes(req, res, body) {
  if (!requireAdminApi(req, res)) return;
  const planKey = String(body.planKey || '');
  const count = Math.max(1, Math.min(100, Number(body.count || 1)));
  if (!PLAN_META[planKey]) return sendJson(res, 400, { error: 'الباقة غير صحيحة.' });
  const generated = [];
  for (let index = 0; index < count; index += 1) {
    const code = generateUniqueActivationCode(planKey);
    const row = { code, planKey, used: false, disabled: false, usedBy: null, usedAt: null, createdAt: nowIso() };
    db.activationCodes.push(row);
    generated.push(row);
  }
  addAdminActivity('توليد أكواد', `تم توليد ${generated.length} كود جديد لباقة ${PLAN_META[planKey].label}.`);
  saveDb(db);
  return sendJson(res, 201, { ok: true, generated: generated.map((item) => item.code) });
}

function handleAdminToggleCode(req, res, code, body) {
  if (!requireAdminApi(req, res)) return;
  const target = db.activationCodes.find((item) => item.code === code);
  if (!target) return sendJson(res, 404, { error: 'الكود غير موجود.' });
  if (target.used) return sendJson(res, 409, { error: 'لا يمكن إيقاف أو إعادة تفعيل كود مستخدم.' });
  target.disabled = Boolean(body.disabled);
  addAdminActivity(target.disabled ? 'إيقاف كود' : 'تفعيل كود', `تم ${target.disabled ? 'إيقاف' : 'تفعيل'} الكود ${target.code}.`);
  saveDb(db);
  return sendJson(res, 200, { ok: true, disabled: target.disabled });
}

function handleAdminDeleteCode(req, res, code) {
  if (!requireAdminApi(req, res)) return;
  const index = db.activationCodes.findIndex((item) => item.code === code);
  if (index === -1) return sendJson(res, 404, { error: 'الكود غير موجود.' });
  if (db.activationCodes[index].used) return sendJson(res, 409, { error: 'لا يمكن حذف كود مستخدم.' });
  addAdminActivity('حذف كود', `تم حذف الكود ${db.activationCodes[index].code} من قاعدة البيانات.`);
  db.activationCodes.splice(index, 1);
  saveDb(db);
  return sendJson(res, 200, { ok: true });
}

function handleAdminExportCodes(req, res, format) {
  if (!requireAdminApi(req, res)) return;
  const rows = db.activationCodes.map((item) => ({
    code: item.code,
    planKey: item.planKey,
    status: item.used ? 'used' : item.disabled ? 'disabled' : 'available',
    usedByEmail: item.usedBy ? findUserById(item.usedBy)?.email || '' : '',
    usedAt: item.usedAt || '',
    createdAt: item.createdAt || ''
  }));
  if (format === 'json') {
    const body = Buffer.from(JSON.stringify(rows, null, 2));
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename=\"activation-codes.json\"',
      'Content-Length': body.length
    });
    res.end(body);
    return;
  }
  const csv = [
    'code,planKey,status,usedByEmail,usedAt,createdAt',
    ...rows.map((item) => [item.code, item.planKey, item.status, item.usedByEmail, item.usedAt, item.createdAt].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const body = Buffer.from(csv, 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename=\"activation-codes.csv\"',
    'Content-Length': body.length
  });
  res.end(body);
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === 'GET' && pathname === '/api/session') return handleApiSession(req, res);
    if (req.method === 'POST' && pathname === '/api/register') return handleRegister(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/login') return handleLogin(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/reset-password') return handleResetPassword(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/logout') return handleLogout(req, res);
    if (req.method === 'POST' && pathname === '/api/account/update') return handleAccountUpdate(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/support/create') return handleSupportCreate(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/support/track') return handleSupportTrack(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/support/reply') return handleSupportReply(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/notifications/read') return handleNotificationsRead(req, res);
    if (req.method === 'POST' && pathname === '/api/subscription/request') return handlePlanRequest(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/subscription/activate') return handleActivate(req, res, await readBody(req));
    if (req.method === 'POST' && pathname.startsWith('/api/lessons/') && pathname.endsWith('/watch-start')) return handleLessonWatchStart(req, res, pathname.split('/')[3]);
    if (req.method === 'POST' && pathname.startsWith('/api/lessons/') && pathname.endsWith('/complete')) return handleLessonComplete(req, res, pathname.split('/')[3]);
    if (req.method === 'POST' && pathname.startsWith('/api/exams/') && pathname.endsWith('/pass')) return handleExamPass(req, res, pathname.split('/')[3], await readBody(req));
    if (req.method === 'GET' && pathname === '/api/admin/session') return handleAdminSession(req, res);
    if (req.method === 'POST' && pathname === '/api/admin/login') return handleAdminLogin(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/admin/change-password') return handleAdminChangePassword(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/admin/logout') return handleAdminLogout(req, res);
    if (req.method === 'GET' && pathname === '/api/admin/codes') return handleAdminCodes(req, res);
    if (req.method === 'POST' && pathname === '/api/admin/login-locks/unlock') return handleAdminUnlockLogin(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/admin/backups/restore') return handleAdminRestoreBackup(req, res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/admin/codes/generate') return handleAdminGenerateCodes(req, res, await readBody(req));
    if (req.method === 'GET' && pathname === '/api/admin/codes/export') return handleAdminExportCodes(req, res, new URL(req.url, 'http://localhost').searchParams.get('format'));
    if (req.method === 'POST' && pathname.startsWith('/api/admin/codes/') && pathname.endsWith('/toggle')) {
      return handleAdminToggleCode(req, res, decodeURIComponent(pathname.split('/')[4]), await readBody(req));
    }
    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/codes/')) {
      return handleAdminDeleteCode(req, res, decodeURIComponent(pathname.split('/')[4]));
    }
    if (req.method === 'POST' && pathname.startsWith('/api/admin/support/') && pathname.endsWith('/status')) {
      return handleAdminSupportStatus(req, res, pathname.split('/')[4], await readBody(req));
    }
    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Server error' });
  }
}

function routeRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (pathname === '/' || pathname === '/index.html') return serveStaticFile(res, path.join(ROOT, 'index.html'));
  if (pathname === '/login.html' || pathname === '/register.html' || pathname === '/admin.html' || pathname === '/support.html') return serveStaticFile(res, path.join(ROOT, pathname.slice(1)));
  if (pathname === '/dashboard.html' || pathname === '/profile.html' || pathname === '/subscription.html') {
    if (!requireUserPage(req, res)) return;
    return serveStaticFile(res, path.join(ROOT, pathname.slice(1)));
  }
  if (pathname === '/videos.html' || pathname === '/exams.html') {
    if (!requireActiveSubscriptionPage(req, res)) return;
    return serveStaticFile(res, path.join(ROOT, pathname.slice(1)));
  }
  if (pathname === '/css/style.css' || pathname === '/js/site.js') return serveStaticFile(res, path.join(ROOT, pathname.slice(1)));
  return sendHtml(res, 404, '<h1>404</h1>');
}

function createAppServer() {
  return http.createServer(routeRequest);
}

if (require.main === module) {
  createAppServer().listen(PORT, () => {
    console.log(`CodeCraft server running on http://localhost:${PORT}`);
    console.log(`Admin username: ${adminConfig.username}`);
    console.log(`Admin config file: ${ADMIN_CONFIG_PATH}`);
  });
}

module.exports = { createAppServer, hashPassword, ADMIN_CONFIG_PATH };

