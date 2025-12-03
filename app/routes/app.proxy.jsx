import db from "../db.server";
import { authenticate } from "../shopify.server";

// --- LOADER (GET): Sends Minimalist Black & White HTML ---
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) return new Response("", { status: 400 });

  // 1. Fetch Approved Questions
  const questions = await db.question.findMany({
    where: { productId: String(productId), status: "PUBLISHED" },
    orderBy: { createdAt: "desc" }
  });

  if (questions.length === 0) return { html: "" };

  // 2. BLACK & WHITE HTML DESIGN 🏴🏳️
  const htmlContent = `
    <style>
      .qa-bw-container {
        margin: 50px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      .qa-bw-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #000;
        padding-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .qa-bw-title {
        font-size: 22px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000;
        margin: 0;
      }
      .qa-bw-count {
        font-size: 12px;
        font-weight: 700;
        background: #000;
        color: #fff;
        padding: 4px 8px;
        border-radius: 2px;
      }
      
      /* SLIDER */
      .qa-bw-slider {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        padding-bottom: 20px;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
      .qa-bw-slider::-webkit-scrollbar { height: 4px; }
      .qa-bw-slider::-webkit-scrollbar-track { background: #eee; }
      .qa-bw-slider::-webkit-scrollbar-thumb { background: #000; }

      /* CARD */
      .qa-bw-card {
        min-width: 300px;
        max-width: 340px;
        background: #fff;
        border: 1px solid #ddd;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }
      .qa-bw-card:hover {
        border-color: #000;
        box-shadow: 4px 4px 0px #000; /* Brutalist shadow effect */
        transform: translateY(-2px);
      }

      /* QUESTION PART */
      .qa-bw-question {
        padding: 20px;
        background: #fff;
        flex-grow: 1;
      }
      .qa-bw-user {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #666;
      }
      .qa-bw-user-icon {
        width: 24px;
        height: 24px;
        background: #000;
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      .qa-bw-q-text {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #000;
        line-height: 1.5;
        font-style: italic;
      }

      /* ANSWER PART */
      .qa-bw-answer {
        padding: 20px;
        background: #f9f9f9;
        border-top: 1px solid #ddd;
        position: relative;
      }
      .qa-bw-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        color: #000;
      }
      .qa-bw-a-text {
        margin: 0;
        font-size: 14px;
        color: #333;
        line-height: 1.6;
      }
      .qa-bw-date {
        margin-top: 12px;
        font-size: 10px;
        color: #999;
        text-align: right;
        font-family: monospace;
      }
    </style>

    <div class="qa-bw-container">
      
      <div class="qa-bw-header">
        <h2 class="qa-bw-title">Müşteri Soruları</h2>
        <span class="qa-bw-count">${questions.length} KAYIT</span>
      </div>

      <div class="qa-bw-slider">
        ${questions.map(q => `
          <div class="qa-bw-card">
            
            <div class="qa-bw-question">
              <div class="qa-bw-user">
                <div class="qa-bw-user-icon">
                  ${(q.customer || 'Z').charAt(0).toUpperCase()}
                </div>
                <span>${q.customer || 'Ziyaretçi'}</span>
              </div>
              <p class="qa-bw-q-text">"${q.question}"</p>
            </div>

            <div class="qa-bw-answer">
              <div class="qa-bw-brand">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                Comix Life Yanıtı
              </div>
              <p class="qa-bw-a-text">${q.answer}</p>
              <div class="qa-bw-date">
                ${new Date(q.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>

          </div>
        `).join('')}
      </div>

    </div>
  `;

  return { html: htmlContent };
};

// --- ACTION (POST): Save Question ---
// ... üst kısımlar aynı ...
export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const formData = await request.formData();
  
  const productId = formData.get("productId");
  const productTitle = formData.get("productTitle");
  const customer = formData.get("customer") || "Ziyaretçi";
  const question = formData.get("question");
  const email = formData.get("email"); // <--- MAİLİ ALIYORUZ

  // Email kontrolü
  if (!question || !productId || !email) {
    return { success: false, message: "Lütfen e-posta adresinizi ve sorunuzu eksiksiz girin." };
  }

  await db.question.create({
    data: {
      productId: String(productId),
      productName: String(productTitle),
      customer: String(customer),
      email: String(email), // <--- DB'YE YAZIYORUZ
      question: String(question),
      status: "PENDING"
    }
  });

  return { success: true, message: "Sorunuz alındı! Yanıtlandığında mail gelecektir." };
};
