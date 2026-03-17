import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Chuyển markdown đơn giản trong câu trả lời bot: **bold**, xuống dòng.
 * Escape HTML trước để tránh XSS.
 */
@Pipe({ name: 'chatbotMarkdown', standalone: false })
export class ChatbotMarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (value == null || value === '') return '';
    let s = escapeHtml(value);
    s = s.replace(/\n/g, '<br/>');
    s = s.replace(/(^|<br\/>)#{1,3}\s*/g, '$1'); /* xoá ### ## # ở đầu dòng */
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/<br\/>\* /g, '<br/>• ');
    const segments = s.split('<br/>');
    const wrapped = segments.map((seg) =>
      seg.startsWith('• ') ? `<div class="chat-bullet-line">${seg}</div>` : seg,
    );
    s = wrapped.join('<br/>');
    return this.sanitizer.bypassSecurityTrustHtml(s);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
