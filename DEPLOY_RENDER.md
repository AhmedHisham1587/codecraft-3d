# نشر CodeCraft 3D على Render

## قبل النشر

- اجعل مستودع GitHub خاصًا `Private`.
- لا ترفع مجلد `data/backups`.
- Render المجاني مناسب للتجربة، لكنه قد ينام بعد عدم الاستخدام.
- قاعدة البيانات الحالية ملف JSON محلي داخل `data/codecraft-db.json`. على الاستضافة المجانية قد لا تكون مناسبة كحل طويل المدى للطلاب الحقيقيين.

## إعدادات Render

- Service type: `Web Service`
- Runtime: `Node`
- Build Command: اتركه فارغًا
- Start Command: `npm start`
- Environment Variable:
  - `NODE_ENV=production`

## بعد النشر

- افتح رابط Render وجرب تسجيل الدخول.
- افتح `/admin.html` وجرب دخول الأدمن.
- جرّب فيديو عربي وفيديو English.
- جرّب طلب اشتراك وكود تفعيل.
