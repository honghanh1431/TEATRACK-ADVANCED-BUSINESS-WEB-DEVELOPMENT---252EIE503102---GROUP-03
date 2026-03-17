import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ChatbotService, Message } from './chatbot.service';

@Component({
  selector: 'app-chatbot',
  standalone: false,
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  userInput = '';
  isTyping = false;
  isOpen = false;
  showChatbot = true;
  private routeSub?: Subscription;

  constructor(
    private chatbotService: ChatbotService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  private updateVisibility(): void {
    const path = (this.router.url || '').split('?')[0];
    const isAdminPath = path.indexOf('admin') !== -1;
    const isAdminUser = typeof localStorage !== 'undefined' && !!localStorage.getItem('authAdmin');
    const hide =
      path === '/login' ||
      path === '/login-admin' ||
      path === '/register' ||
      path === '/forgot-password' ||
      path === '/404' ||
      isAdminPath ||
      isAdminUser;
    this.showChatbot = !hide;
  }

  ngOnInit(): void {
    this.updateVisibility();
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateVisibility());

    this.messages = this.chatbotService.loadHistory();
    if (this.messages.length === 0) {
      this.messages.push({
        role: 'bot',
        text: 'Xin chào! Bạn cần giúp gì nào? (I can also chat in English!)',
        timestamp: new Date(),
      });
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.messages.push({ role: 'user', text, timestamp: new Date() });
    this.userInput = '';
    this.cdr.detectChanges();
    this.isTyping = true;

    const botMsg: Message = {
      role: 'bot',
      text: '',
      timestamp: new Date(),
      loading: true,
    };
    this.messages.push(botMsg);

    await this.chatbotService.sendMessageStream(
      text,
      (chunk) => {
        botMsg.text += chunk;
        botMsg.loading = false;
      },
      () => {
        this.isTyping = false;
        this.chatbotService.saveHistory(this.messages);
      },
      (err) => {
        botMsg.text = `❌ Lỗi: ${err}`;
        botMsg.loading = false;
        this.isTyping = false;
      },
    );
  }

  clearChat(): void {
    this.chatbotService.clearHistory();
    this.messages = [
      {
        role: 'bot',
        text: 'Lịch sử đã được làm mới. Ngô Gia sẵn sàng lắng nghe bạn rồi đây!',
        timestamp: new Date(),
      },
    ];
  }

  scrollToBottom(): void {
    try {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (_) {}
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }
}
