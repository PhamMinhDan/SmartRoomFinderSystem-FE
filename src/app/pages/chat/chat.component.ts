import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessagePayload } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatboxRef') chatboxRef!: ElementRef<HTMLDivElement>;

  conversations: Conversation[] = [];
  messages: any[] = [];
  selectedConv: Conversation | null = null;
  messageText = '';
  loading = false;

  userId = '';
  roomId = 0;
  receiverIdFromRoute = '';

  private subs = new Subscription();
  private shouldScrollBottom = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    this.userId = user.user_id;
    this.chatService.connect(this.userId);

    // ── Subscribe tất cả tin nhắn (đến + echo) ────────────────────
    this.subs.add(
      this.chatService.message$.subscribe((msg) => {
        const senderId = this.getSenderId(msg);
        const receiverId = this.getReceiverId(msg);
        const isEcho = msg.type === 'ECHO';

        // Xác định partner trong cuộc trò chuyện này
        const partnerId = isEcho ? receiverId : senderId;

        // ── Nếu đang mở đúng cuộc trò chuyện → hiện tin ngay ────
        if (this.selectedConv?.partnerId === partnerId) {
          // ECHO: server xác nhận đã lưu → cập nhật messageId nếu cần
          // MESSAGE: tin người khác gửi → thêm vào list
          if (!isEcho) {
            // Tránh duplicate với optimistic message
            this.messages.push(msg);
            // Đánh dấu đã đọc ngay vì đang mở
            this.chatService.markRead(senderId, this.userId);
          } else {
            // Echo: cập nhật messageId cho optimistic message cuối cùng
            const last = this.messages[this.messages.length - 1];
            if (last && !last.messageId) {
              last.messageId = msg.messageId;
              last.createdAt = msg.createdAt;
            }
          }
          this.shouldScrollBottom = true;
        } else {
          // ── Không đang mở → cập nhật sidebar ────────────────────
          if (!isEcho) {
            // Tin đến từ người khác → tăng unread
            const conv = this.conversations.find((c) => c.partnerId === senderId);
            if (conv) {
              conv.unreadCount++;
              conv.lastMessage = this.getMessageText(msg);
              conv.lastTime = this.getCreatedAt(msg);
            } else {
              // Cuộc trò chuyện mới → reload sidebar
              this.loadConversations();
              return;
            }
          } else {
            // Echo tin mình gửi đến người khác → cập nhật lastMessage
            const conv = this.conversations.find((c) => c.partnerId === receiverId);
            if (conv) {
              conv.lastMessage = this.getMessageText(msg);
              conv.lastTime = this.getCreatedAt(msg);
            }
          }
          this.sortConversations();
        }

        this.cdr.detectChanges();
      }),
    );

    // Đọc query params (navigate từ search page)
    this.route.queryParamMap.subscribe((params) => {
      this.roomId = Number(params.get('roomId')) || 0;
      this.receiverIdFromRoute = params.get('receiverId') || '';
      this.loadConversations(this.receiverIdFromRoute || undefined);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Field accessors (tương thích camelCase & snake_case) ──────────

  getMessageText(m: any): string {
    return m?.message ?? m?.messageContent ?? m?.message_content ?? '';
  }

  getSenderId(m: any): string {
    return m?.senderId ?? m?.sender_id ?? '';
  }

  getReceiverId(m: any): string {
    return m?.receiverId ?? m?.receiver_id ?? '';
  }

  getCreatedAt(m: any): string {
    return m?.createdAt ?? m?.created_at ?? new Date().toISOString();
  }

  isMe(m: any): boolean {
    return this.getSenderId(m) === this.userId;
  }

  // ── Load conversations ────────────────────────────────────────────

  loadConversations(autoSelectPartnerId?: string): void {
    this.chatService.getMyChats(this.userId).subscribe({
      next: (list: any[]) => {
        this.conversations = list.map((c) => ({
          partnerId: c.partnerId ?? c.partner_id ?? c.userId ?? c.user_id ?? '',
          partnerName: c.partnerName ?? c.partner_name ?? c.name ?? 'Người dùng',
          partnerAvatar: c.partnerAvatar ?? c.partner_avatar ?? c.avatar ?? '',
          lastMessage: c.lastMessage ?? c.last_message ?? '',
          lastTime: c.lastTime ?? c.last_time ?? '',
          unreadCount: c.unreadCount ?? c.unread_count ?? 0,
        }));
        this.sortConversations();

        if (autoSelectPartnerId) {
          const existing = this.conversations.find((c) => c.partnerId === autoSelectPartnerId);
          if (existing) {
            this.selectConversation(existing);
          } else {
            const partnerNameFromRoute =
              this.route.snapshot.queryParamMap.get('partnerName') || 'Người dùng';
            const partnerAvatarFromRoute =
              this.route.snapshot.queryParamMap.get('partnerAvatar') || '';
            const newConv: Conversation = {
              partnerId: autoSelectPartnerId,
              partnerName: partnerNameFromRoute,
              partnerAvatar: partnerAvatarFromRoute,
              lastMessage: '',
              lastTime: new Date().toISOString(),
              unreadCount: 0,
            };
            this.conversations.unshift(newConv);
            this.selectConversation(newConv);
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        if (autoSelectPartnerId) {
          const partnerNameFromRoute =
            this.route.snapshot.queryParamMap.get('partnerName') || 'Người dùng';
          const partnerAvatarFromRoute =
            this.route.snapshot.queryParamMap.get('partnerAvatar') || '';
          const newConv: Conversation = {
            partnerId: autoSelectPartnerId,
            partnerName: partnerNameFromRoute,
            partnerAvatar: partnerAvatarFromRoute,
            lastMessage: '',
            lastTime: new Date().toISOString(),
            unreadCount: 0,
          };
          this.conversations = [newConv];
          this.selectConversation(newConv);
        }
      },
    });
  }

  // ── Select conversation ───────────────────────────────────────────

  selectConversation(conv: Conversation): void {
    this.selectedConv = conv;
    this.messages = [];
    this.loading = true;
    conv.unreadCount = 0; // reset badge ngay

    this.chatService.getHistory(this.userId, conv.partnerId).subscribe({
      next: (msgs: any[]) => {
        this.messages = msgs || [];
        this.loading = false;
        this.shouldScrollBottom = true;
        // Đánh dấu đã đọc
        this.chatService.markRead(conv.partnerId, this.userId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.messages = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Send message ──────────────────────────────────────────────────

  send(): void {
    const text = this.messageText.trim();
    if (!text || !this.selectedConv) return;

    // Optimistic UI: hiện tin ngay, chưa có messageId
    const optimistic: any = {
      senderId: this.userId,
      receiverId: this.selectedConv.partnerId,
      message: text,
      createdAt: new Date().toISOString(),
      type: 'MESSAGE',
    };
    this.messages.push(optimistic);
    this.messageText = '';
    this.shouldScrollBottom = true;

    // Gửi qua WebSocket
    this.chatService.sendMessage({
      roomId: this.roomId || 1,
      senderId: this.userId,
      receiverId: this.selectedConv.partnerId,
      message: text,
    });

    // Cập nhật sidebar
    this.selectedConv.lastMessage = text;
    this.selectedConv.lastTime = new Date().toISOString();
    this.sortConversations();
    this.cdr.detectChanges();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private scrollToBottom(): void {
    try {
      const el = this.chatboxRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private sortConversations(): void {
    this.conversations.sort(
      (a, b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime(),
    );
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  /** Mobile: quay lại danh sách từ chat window */
  backToList(): void {
    this.selectedConv = null;
    this.messages = [];
  }

  /** Tổng unread để hiện badge trên sidebar header */
  getTotalUnread(): number {
    return this.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  getAvatar(conv: Conversation): string {
    if (conv.partnerAvatar) return conv.partnerAvatar;
    const name = encodeURIComponent(conv.partnerName || 'U');
    return `https://ui-avatars.com/api/?name=${name}&background=00C897&color=fff&size=80&bold=true`;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} ph`;
    if (diffH < 24) return `${diffH} giờ`;
    if (diffD === 1) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  trackByMsg(_: number, msg: any): any {
    return msg.messageId ?? msg.createdAt ?? Math.random();
  }

  trackByConv(_: number, conv: Conversation): string {
    return conv.partnerId;
  }
}
