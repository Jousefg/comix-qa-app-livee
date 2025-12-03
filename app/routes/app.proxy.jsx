import { json } from "@remix-run/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";

// --- LOADER (GET): SİTEYE SİYAH-BEYAZ TASARIMI GÖNDERİR ---
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) return new Response("", { status: 400 });

  // 1. Soruları Çek
  const questions = await db.question.findMany({
    where: { productId: String(productId), status: "PUBLISHED" },
    orderBy: { createdAt: "desc" }
  });

  // Soru yoksa boş dön
  if (questions.length === 0) return json({ html: "" });

  // 2. HTML TASARIMI (BLACK & WHITE EDITION) 🏴🏳️
  const htmlContent = `
    <style>
      .qa-bw-title {
        color: #000000;
        letter-spacing: -0.5px;
      }
      .qa-card-bw {
        min-width: 300px;
        max-width: 340px;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 4px; /* Daha keskin köşeler */
        overflow: hidden;
        flex-shrink: 0;
        scroll-snap-align: start;
        transition: all 0.3s ease;
      }
      .qa-card-bw:hover {
        border-color: #000000;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .qa-slider-bw::-webkit-scrollbar { height: 4px; }
      .qa-slider-bw::-webkit-scrollbar-track { background: #f5f5f5; }
      .qa-slider-bw::-webkit-scrollbar-thumb { background: #000; }
    </style>

    <div style="margin: 50px 0; font-family: inherit;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; color: #000;">
          Müşteri Soruları
        </h2>
        <div style="font-size: 12px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>MERAK EDİLENLER</span>
          <span style="width: 4px; height: 4px; background: #000; border-radius: 50%;"></span>
          <span>${questions.length} KAYIT</span>
        </div>
      </div>

      <div style="position: relative; padding: 0 5px;">
        
        <div class="qa-slider-bw" style="display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
          ${questions.map(q => `
            <div class="qa-card-bw">
              
              <div style="padding: 24px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <div style="width: 28px; height: 28px; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border-radius: 2px;">
                    ${(q.customer || 'Z').charAt(0).toUpperCase()}
                  </div>
                  <span style="font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${q.customer || 'Ziyaretçi'}
                  </span>
                </div>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333; font-weight: 500;">
                  "${q.question}"
                </p>
              </div>

              <div style="background: #f9f9f9; padding: 20px; border-top: 1px solid #e0e0e0; position: relative;">
                <div style="position: absolute; top: -6px; left: 34px; width: 10px; height: 10px; background: #f9f9f9; border-top: 1px solid #e0e0e0; border-left: 1px solid #e0e0e0; transform: rotate(45deg);"></div>
                
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                  <span style="font-size: 11px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">
                    Comix Life
                  </span>
                </div>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555;">
                  ${q.answer}
                </p>
                <div style="margin-top: 12px; font-size: 10px; color: #999; text-align: right; font-family: monospace;">
                  ${new Date(q.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>

            </div>
          `).join('')}
        </div>

      </div>
    </div>
  `;

  // CACHE KIRICI BAŞLIKLAR (Eski renkli tasarım gelmesin diye)
  return json(
    { html: htmlContent },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    }
  );
};

// --- ACTION (POST): Soru Kaydetme ---
export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  // Auth hatası vermeden geçiyoruz
  
  const formData = await request.formData();
  const productId = formData.get("productId");
  const productTitle = formData.get("productTitle");
  const customer = formData.get("customer") || "Ziyaretçi";
  const question = formData.get("question");

  if (!question || !productId) {
    return json({ success: false, message: "Eksik bilgi." });
  }

  await db.question.create({
    data: {
      productId: String(productId),
      productName: String(productTitle),
      customer: String(customer),
      question: String(question),
      status: "PENDING"
    }
  });

  return json({ 
    success: true, 
    message: "Sorunuz başarıyla alındı. Onaylandıktan sonra yayınlanacaktır." 
  });
};