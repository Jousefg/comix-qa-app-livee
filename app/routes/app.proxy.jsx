import db from "../db.server";
import { authenticate } from "../shopify.server";

// --- LOADER (GET): Siteye HTML Slider'ı Gönderir ---
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return new Response("", { status: 400 });
  }

  // 1. Veritabanından bu ürünün ONAYLI sorularını çek
  const questions = await db.question.findMany({
    where: {
      productId: String(productId),
      status: "PUBLISHED"
    },
    orderBy: { createdAt: "desc" }
  });

  // Eğer soru yoksa boş dön
  if (questions.length === 0) {
    return { html: "" };
  }

  // 2. GELİŞMİŞ HTML SLIDER OLUŞTUR
  // Modern, renkli ve interaktif tasarım
  const htmlContent = `
    <style>
      .qa-container {
        margin: 50px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        position: relative;
      }
      
      .qa-header {
        margin-bottom: 25px;
        text-align: center;
      }
      
      .qa-title {
        font-size: 28px;
        font-weight: 800;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 8px 0;
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }
      
      .qa-subtitle {
        color: #666;
        font-size: 14px;
        font-weight: 400;
      }
      
      .qa-count {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 10px;
      }
      
      .qa-slider-wrapper {
        position: relative;
        padding: 0 50px;
      }
      
      .qa-slider {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        scroll-behavior: smooth;
        padding: 20px 5px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #667eea #f0f0f0;
      }
      
      .qa-slider::-webkit-scrollbar {
        height: 8px;
      }
      
      .qa-slider::-webkit-scrollbar-track {
        background: #f0f0f0;
        border-radius: 10px;
      }
      
      .qa-slider::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
      }
      
      .qa-card {
        min-width: 320px;
        max-width: 360px;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        position: relative;
      }
      
      .qa-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 35px rgba(102, 126, 234, 0.25);
      }
      
      .qa-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      .qa-question-section {
        padding: 24px;
        background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
        border-bottom: 2px dashed #e0e7ff;
      }
      
      .qa-label {
        font-size: 11px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .qa-question-text {
        font-size: 15px;
        color: #1a1a1a;
        line-height: 1.6;
        font-weight: 600;
        margin: 0;
      }
      
      .qa-answer-section {
        padding: 24px;
        background: white;
      }
      
      .qa-answer-label {
        font-size: 11px;
        font-weight: 700;
        color: #10b981;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .qa-answer-text {
        font-size: 14px;
        color: #374151;
        line-height: 1.7;
        margin: 0 0 12px 0;
      }
      
      .qa-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
      }
      
      .qa-date {
        font-size: 11px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .qa-helpful {
        font-size: 11px;
        color: #667eea;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 12px;
        background: #f0f4ff;
        transition: all 0.2s;
        border: none;
        font-weight: 600;
      }
      
      .qa-helpful:hover {
        background: #667eea;
        color: white;
      }
      
      .qa-nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: white;
        border: 2px solid #667eea;
        color: #667eea;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        z-index: 10;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }
      
      .qa-nav-btn:hover {
        background: #667eea;
        color: white;
        transform: translateY(-50%) scale(1.1);
      }
      
      .qa-nav-btn.prev {
        left: 0;
      }
      
      .qa-nav-btn.next {
        right: 0;
      }
      
      .qa-indicator {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 20px;
      }
      
      .qa-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e0e7ff;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .qa-dot.active {
        background: #667eea;
        width: 24px;
        border-radius: 4px;
      }
      
      @media (max-width: 768px) {
        .qa-slider-wrapper {
          padding: 0 10px;
        }
        
        .qa-card {
          min-width: 280px;
        }
        
        .qa-nav-btn {
          display: none;
        }
      }
    </style>
    
    <div class="qa-container">
      <div class="qa-header">
        <h2 class="qa-title">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="url(#gradient1)" stroke-width="2"/>
            <path d="M12 16v-4M12 8h.01" stroke="url(#gradient1)" stroke-width="2" stroke-linecap="round"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea"/>
                <stop offset="100%" style="stop-color:#764ba2"/>
              </linearGradient>
            </defs>
          </svg>
          Soru & Cevaplar
          <span class="qa-count">${questions.length} Soru</span>
        </h2>
        <p class="qa-subtitle">Müşterilerimizin merak ettiği sorular ve yanıtları</p>
      </div>
      
      <div class="qa-slider-wrapper">
        <button class="qa-nav-btn prev" onclick="qaScrollPrev()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div class="qa-slider" id="qaSlider">
          ${questions.map((item, index) => `
            <div class="qa-card" data-index="${index}">
              <div class="qa-question-section">
                <div class="qa-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  ${item.customer || 'Ziyaretçi'} Sordu
                </div>
                <p class="qa-question-text">"${item.question}"</p>
              </div>
              
              <div class="qa-answer-section">
                <div class="qa-answer-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Yanıtımız
                </div>
                <p class="qa-answer-text">${item.answer}</p>
                
                <div class="qa-footer">
                  <span class="qa-date">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${new Date(item.createdAt).toLocaleDateString('tr-TR', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                  <button class="qa-helpful" onclick="qaMarkHelpful(${index})">
                    👍 Faydalı
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <button class="qa-nav-btn next" onclick="qaScrollNext()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      <div class="qa-indicator">
        ${questions.map((_, index) => `
          <div class="qa-dot ${index === 0 ? 'active' : ''}" onclick="qaScrollTo(${index})"></div>
        `).join('')}
      </div>
    </div>
    
    <script>
      function qaScrollNext() {
        const slider = document.getElementById('qaSlider');
        slider.scrollBy({ left: 340, behavior: 'smooth' });
      }
      
      function qaScrollPrev() {
        const slider = document.getElementById('qaSlider');
        slider.scrollBy({ left: -340, behavior: 'smooth' });
      }
      
      function qaScrollTo(index) {
        const slider = document.getElementById('qaSlider');
        const card = slider.querySelector(\`[data-index="\${index}"]\`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
        
        // Update dots
        document.querySelectorAll('.qa-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }
      
      function qaMarkHelpful(index) {
        alert('Geri bildiriminiz için teşekkürler! 🎉');
      }
      
      // Update active dot on scroll
      const slider = document.getElementById('qaSlider');
      slider.addEventListener('scroll', () => {
        const cards = slider.querySelectorAll('.qa-card');
        const scrollLeft = slider.scrollLeft;
        const cardWidth = cards[0]?.offsetWidth || 340;
        const activeIndex = Math.round(scrollLeft / (cardWidth + 20));
        
        document.querySelectorAll('.qa-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === activeIndex);
        });
      });
    </script>
  `;

  return { html: htmlContent };
};

// --- ACTION (POST): Soru Kaydetme ---
export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return new Response("Yetkisiz Giriş", { status: 403 });
  }

  const formData = await request.formData();
  const productId = formData.get("productId");
  const productTitle = formData.get("productTitle");
  const customer = formData.get("customer") || "Ziyaretçi";
  const question = formData.get("question");

  if (!question || !productId) {
    return { success: false, message: "Eksik bilgi." };
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

  return { 
    success: true,
    message: "Sorunuz başarıyla tarafımıza ulaşmıştır. Onaylandıktan sonra yayınlanacaktır." 
  };
};