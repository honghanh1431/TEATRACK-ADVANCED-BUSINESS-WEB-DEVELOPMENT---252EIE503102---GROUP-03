import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  loading?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private apiKey = environment.geminiApiKey || '';
  private readonly modelIds = [
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'gemini-2.5-flash',
  ];
  private getApiUrl(modelId: string, stream = false): string {
    const action = stream ? ':streamGenerateContent?alt=sse' : ':generateContent';
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}${action}`;
  }

  private history: { role: string; parts: { text: string }[] }[] = [];

  private systemPrompt = `Bạn là trợ lý ảo chính thức của Ngô Gia / TeaTrack - thương hiệu chuyên về trà sữa, trà trái cây và các loại đồ uống hiện đại. Nhiệm vụ của bạn là hỗ trợ khách hàng đặt hàng, tư vấn menu và giải đáp thắc mắc với phong cách chuyên nghiệp, nhiệt tình.

### 1. PHONG CÁCH NGÔN NGỮ (Tone of Voice)
- **Thân thiện & Trẻ trung:** Sử dụng ngôn ngữ gần gũi nhưng vẫn lịch sự (ví dụ: "Ngô Gia nghe đây ạ", "Dạ, bạn đợi mình một chút nhé").
- **Đa ngôn ngữ:** Luôn trả lời bằng ngôn ngữ mà khách hàng sử dụng (Việt hoặc Anh).

### 2. KIẾN THỨC THƯƠNG HIỆU & SẢN PHẨM
- **Sản phẩm chủ đạo:** Trà sữa truyền thống, Trà trái cây tươi, các loại Topping (trân châu đen, thạch phô mai, pudding).
- **Điểm bán hàng (USP):** Nguyên liệu sạch, trà pha mới mỗi ngày, hương vị đậm đà đặc trưng của Ngô Gia.
- **Tùy chỉnh:** Luôn nhắc khách hàng về mức đường (0%, 30%, 50%, 100%) và mức đá nếu họ đang có ý định đặt món.

### 3. QUY TRÌNH HỖ TRỢ
- **Chào hỏi:** "Chào bạn! Hôm nay Ngô Gia có thể mang đến cho bạn ly trà thơm ngon nào nhỉ? 🧋"
- **Tư vấn món:** Nếu khách phân vân, hãy gợi ý "Món đặc trưng" (Signature) như Trà sữa Ngô Gia hoặc Trà trái cây nhiệt đới.
- **Xử lý khiếu nại:** Luôn xin lỗi trước, giữ thái độ cầu thị và hướng dẫn khách liên hệ hotline (nếu có) hoặc để lại thông tin để quản lý xử lý.

### 4. GIỚI HẠN (Guardrails)
- **Không bàn luận:** Chính trị, tôn giáo, hoặc các chủ đề nhạy cảm không liên quan đến thương hiệu.
- **Không hứa hẹn sai:** Không tự ý đưa ra các chương trình giảm giá nếu không có trong dữ liệu hệ thống.
- **Bảo mật:** Không hỏi hoặc lưu trữ mật khẩu cá nhân của khách hàng.

### 5. ĐỊNH DẠNG PHẢN HỒI
- Sử dụng Markdown (bullet points, bold) để menu hoặc danh sách tùy chọn dễ nhìn hơn.`;

  async sendMessageStream(
    userMessage: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ): Promise<void> {
    this.history.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    if (!this.apiKey || this.apiKey.includes('YOUR_') || this.apiKey.length < 10) {
      onError(
        'Chưa cấu hình API Key. Vui lòng thêm Gemini API Key vào src/environments/environment.ts',
      );
      return;
    }

    const maxHistoryMessages = 20;
    const contents =
      this.history.length <= maxHistoryMessages
        ? this.history
        : this.history.slice(-maxHistoryMessages);

    const body = {
      systemInstruction: {
        parts: [{ text: this.systemPrompt }],
      },
      contents,
    };

    let lastError = '';
    const requestTimeoutMs = 30000;

    for (const modelId of this.modelIds) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

        const url =
          this.getApiUrl(modelId, false) + `?key=${encodeURIComponent(this.apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          lastError = `Model ${modelId} không tồn tại.`;
          continue;
        }

        if (!response.ok) {
          const errBody = await response.text();
          let msg = `HTTP ${response.status}`;
          try {
            const parsed = JSON.parse(errBody);
            msg = parsed?.error?.message || parsed?.error?.status || msg;
          } catch {
            if (errBody) msg = errBody.slice(0, 200);
          }
          if (response.status === 400) msg = 'Dữ liệu gửi không đúng định dạng. ' + msg;
          if (response.status === 403)
            msg = 'API Key không hợp lệ hoặc bị giới hạn. Kiểm tra key trong environment.ts';
          if (response.status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded')) {
            const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i) || msg.match(/(\d+(?:\.\d+)?)\s*s\.?/i);
            const sec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 40;
            msg = `Đã hết lượt gọi miễn phí tạm thời (giới hạn API). Bạn vui lòng thử lại sau khoảng ${sec} giây nhé.`;
          }
          throw new Error(msg);
        }

        const data = await response.json();
        const botReply =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
        if (botReply) onChunk(botReply);

        this.history.push({
          role: 'model',
          parts: [{ text: botReply }],
        });

        onDone();
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          lastError = err.message;
          continue;
        }
        this.history.pop();
        const isAbort = err instanceof Error && err.name === 'AbortError';
        let message = isAbort
          ? 'Kết nối quá lâu (quá 90 giây). Bạn thử lại hoặc kiểm tra mạng.'
          : err instanceof Error
            ? err.message
            : 'Lỗi kết nối Gemini';
        if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('exceeded')) {
          const retryMatch = message.match(/retry in (\d+(?:\.\d+)?)\s*s/i) || message.match(/(\d+(?:\.\d+)?)\s*s/i);
          const sec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 40;
          message = `Đã hết lượt gọi miễn phí tạm thời (giới hạn API). Bạn vui lòng thử lại sau khoảng ${sec} giây nhé.`;
        }
        // #region agent log
        fetch('http://127.0.0.1:7466/ingest/ee251387-72e4-4650-86ba-52158ac1f412', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cb5bd8' },
          body: JSON.stringify({
            sessionId: 'cb5bd8',
            location: 'chatbot.service.ts:onError',
            message: 'chatbot onError',
            data: { rawLength: message.length, isQuota: message.includes('lượt') },
            timestamp: Date.now(),
            hypothesisId: 'A',
          }),
        }).catch(() => {});
        // #endregion
        onError(message);
        return;
      }
    }

    this.history.pop();
    onError(
      lastError ||
        'Không tìm thấy model phù hợp. Kiểm tra API key tại https://ai.google.dev/gemini-api/docs/models',
    );
  }

  saveHistory(messages: Message[]): void {
    const max = 50;
    const toSave = messages.length > max ? messages.slice(-max) : messages;
    localStorage.setItem(
      'chat_history',
      JSON.stringify(toSave.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }))),
    );
  }

  loadHistory(): Message[] {
    const saved = localStorage.getItem('chat_history');
    if (!saved) return [];
    const msgs: (Omit<Message, 'timestamp'> & { timestamp: string })[] = JSON.parse(saved);
    this.history = msgs
      .filter((m) => !m.loading)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
    return msgs.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  }

  clearHistory(): void {
    this.history = [];
    localStorage.removeItem('chat_history');
  }
}
