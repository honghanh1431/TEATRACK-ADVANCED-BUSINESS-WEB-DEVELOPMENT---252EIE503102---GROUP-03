import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

export interface Feedback {
  id: string; // Đổi sang string để khớp với MongoDB ObjectId
  fullname: string;
  email: string;
  phone: string;
  branch: string;
  topic: 'complain' | 'praise' | 'issued' | 'other';
  content: string;
  time: string;
  status: 0 | 1 | 2; // 0: Chờ xử lý, 1: Đang xử lý, 2: Đã xử lý
  read: boolean;
  note: string;
}

export interface LogEntry {
  text: string;
  time: string;
}

@Component({
  selector: 'app-admin-contact',
  standalone: false,
  templateUrl: './admin-contact.html',
  styleUrl: './admin-contact.css',
})
export class AdminContact implements OnInit, OnDestroy {
  feedbacks: Feedback[] = [];
  private readonly API = 'http://localhost:3002/api/contacts';
  private socket: Socket | undefined;

  //   State 
  filteredFeedbacks: Feedback[] = [];
  selectedFeedback: Feedback | null = null;
  activeFilter: string = 'all';
  searchQuery: string = '';
  showAlert = false;
  alertMessage = '';

  readonly topicLabel: Record<string, string> = {
    complain: 'Than phiền',
    praise: 'Khen ngợi',
    issued: 'Đề xuất',
    other: 'Vấn đề khác',
  };

  readonly statusLabel: string[] = ['Chờ xử lý', 'Đang xử lý', 'Đã xử lý'];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('contactUpdated', () => {
      this.loadFeedbacks();
    });
  }

  //   Lifecycle  
  ngOnInit(): void {
    this.loadFeedbacks();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  loadFeedbacks(): void {
    this.http.get<Feedback[]>(this.API).subscribe({
      next: (data) => {
        this.feedbacks = (data || []).map((item) => ({
          ...item,
          topic: item.topic || 'other',
        }));
        this.applyFilter();
        
        // Cập nhật lại feedback đang chọn nếu có
        if (this.selectedFeedback) {
          const updated = this.feedbacks.find(f => f.id === this.selectedFeedback?.id);
          if (updated) this.selectedFeedback = updated;
        }
      },
      error: () => {
        this.feedbacks = [];
        this.applyFilter();
      },
    });
  }

  //   Computed  
  get unreadCount(): number {
    return this.feedbacks.filter((f) => !f.read).length;
  }

  countByStatus(status: number): number {
    return this.feedbacks.filter((f) => Number(f.status) === status).length;
  }

  //   Filter & search  
  setFilter(topic: string): void {
    this.activeFilter = topic;
    this.applyFilter();
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredFeedbacks = this.feedbacks.filter((f) => {
      const matchTopic = this.activeFilter === 'all' || f.topic === this.activeFilter;
      const matchSearch =
        !q ||
        (f.fullname && f.fullname.toLowerCase().includes(q)) ||
        (f.content && f.content.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.phone && f.phone.toLowerCase().includes(q)) ||
        (f.branch && f.branch.toLowerCase().includes(q));
      return matchTopic && matchSearch;
    });
    this.cdr.detectChanges();
  }

  //   Select  
  selectFeedback(fb: Feedback): void {
    if (!fb.read) {
        fb.read = true;
        this.http.put(`${this.API}/${fb.id}`, { read: true }).subscribe({
          next: () => this.loadFeedbacks()
        });
    }
    this.selectedFeedback = fb;
  }

  //   Status change  
  onStatusChange(fb: Feedback): void {
    // Ép kiểu về số để đảm bảo so sánh ở Box chính xác ngay lập tức
    fb.status = Number(fb.status) as any;
    this.cdr.detectChanges(); 

    this.http.put(`${this.API}/${fb.id}`, { status: fb.status }).subscribe({
        next: () => {
            console.log(`Cập nhật trạng thái feedback #${fb.id} → ${this.statusLabel[fb.status]}`);
            this.loadFeedbacks(); // Reload để đồng bộ database
        },
        error: (err) => {
            console.error('Update status error:', err);
            this.loadFeedbacks(); // Rollback trạng thái nếu lỗi
        }
    });
  }

  //   Save note  
  saveNote(fb: Feedback): void {
    this.http.put(`${this.API}/${fb.id}`, { note: fb.note }).subscribe({
        next: () => {
            this.loadFeedbacks();
            console.log(`Lưu ghi chú feedback #${fb.id}:`, fb.note);
        },
        error: (err) => console.error('Save note error:', err)
    });
  }

  //   Helpers  
  getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getActivityLog(fb: Feedback): LogEntry[] {
    const logs: LogEntry[] = [];
    logs.push({ text: `Phản hồi được gửi bởi <strong>${fb.fullname}</strong>`, time: fb.time });
    if (fb.status >= 1) {
      logs.push({
        text: 'Trạng thái chuyển sang <strong>Đang xử lý</strong>',
        time: fb.time,
      });
    }
    if (fb.status === 2) {
      logs.push({ text: 'Trạng thái chuyển sang <strong>Đã xử lý</strong>', time: fb.time });
    }
    if (fb.note) {
      logs.push({
        text: `Ghi chú: ${fb.note}`,
        time: new Date().toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).replace(',', ''),
      });
    }
    return logs.reverse();
  }

  //  Export Excel 
  async exportExcel(): Promise<void> {
    const data = this.filteredFeedbacks.length ? this.filteredFeedbacks : this.feedbacks;
    if (!data.length) {
      this.showAlertModal('Không có phản hồi để xuất!');
      return;
    }
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      return;
    }
    const workbook = new ExcelJSLib.Workbook();
    const sheet = workbook.addWorksheet('Danh sách phản hồi', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };
    sheet.columns = [
      { header: 'Họ tên', key: 'fullname', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Điện thoại', key: 'phone', width: 14 },
      { header: 'Chi nhánh', key: 'branch', width: 28 },
      { header: 'Chủ đề', key: 'topic', width: 12 },
      { header: 'Nội dung', key: 'content', width: 40 },
      { header: 'Thời gian', key: 'time', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 14 },
    ];
    sheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    for (const f of data) {
      sheet.addRow({
        fullname: f.fullname || '',
        email: f.email || '',
        phone: f.phone || '',
        branch: f.branch || '',
        topic: this.topicLabel[f.topic] || f.topic,
        content: f.content || '',
        time: f.time || '',
        status: this.statusLabel[f.status] ?? '',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    saveAsLib(new Blob([buffer]), `Phan_hoi_khach_hang_${today}.xlsx`);
    this.showAlertModal('Đã xuất danh sách phản hồi ra file Excel thành công.');
  }

  showAlertModal(message: string): void {
    this.alertMessage = message;
    this.showAlert = true;
    this.cdr.detectChanges();
  }

  closeAlertModal(): void {
    this.showAlert = false;
    this.cdr.detectChanges();
  }

  closeAlertOnOverlay(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) this.closeAlertModal();
  }
}
