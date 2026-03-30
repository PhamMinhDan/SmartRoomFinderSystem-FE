import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ChatService,
  ChatMessagePayload,
  AttachmentDto,
  UploadMediaResponse,
} from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatCrypto } from '../../utils/chat-crypto.util';

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

export interface PendingFile {
  file: File;
  previewUrl: string;
  fileType: 'IMAGE' | 'VIDEO';
  uploaded: boolean;
  uploading: boolean;
  failed: boolean;
  uploadedUrl?: string;
  uploadedFileType?: 'IMAGE' | 'VIDEO';
}

export interface DisplayMessage {
  messageId?: number;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  created_at?: string;
  type?: string;
  attachments?: AttachmentDto[];

  // Reactions
  reactions?: Record<string, number>;
  myReaction?: string | null;

  // Thu hồi
  recalledForAll?: boolean;
  recalledForSender?: boolean;

  // Optimistic
  _localId?: string;
  _uploading?: boolean;
  _failed?: boolean;
  _localAttachments?: { previewUrl: string; fileType: 'IMAGE' | 'VIDEO' }[];
}

/** Context menu state */
export interface ContextMenu {
  open: boolean;
  x: number;
  y: number;
  message: DisplayMessage | null;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

// Danh sách emoji reaction
export const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatboxRef') chatboxRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  conversations: Conversation[] = [];
  messages: DisplayMessage[] = [];
  selectedConv: Conversation | null = null;
  messageText = '';
  loading = false;

  userId = '';
  roomId = 0;
  receiverIdFromRoute = '';

  pendingFiles: PendingFile[] = [];

  lightbox: {
    open: boolean;
    items: { url: string; fileType: 'IMAGE' | 'VIDEO' }[];
    index: number;
  } = { open: false, items: [], index: 0 };

  contextMenu: ContextMenu = { open: false, x: 0, y: 0, message: null };

  /** Danh sách emoji */
  readonly reactionEmojis = REACTION_EMOJIS;

  private subs = new Subscription();
  private shouldScroll = false;
  private localCounter = 0;

  private longPressTimer: any = null;
  private longPressDuration = 500;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.router.navigate(['/']);
      return;
    }
    this.userId = user.user_id;
    this.chatService.connect(this.userId);
    this.subs.add(this.chatService.message$.subscribe((msg) => this.handleIncoming(msg)));

    this.route.queryParamMap.subscribe((params) => {
      this.roomId = Number(params.get('roomId')) || 0;
      this.receiverIdFromRoute = params.get('receiverId') || '';
      this.loadConversations(this.receiverIdFromRoute || undefined);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    this.messages.forEach((m) =>
      m._localAttachments?.forEach((a) => URL.revokeObjectURL(a.previewUrl)),
    );
    this.clearLongPress();
  }

  // ── Incoming socket ──────────────────────────────────────────────

  private handleIncoming(msg: ChatMessagePayload): void {
    // ── Thu hồi ──────────────────────────────────────────────────
    if (msg.type === 'RECALL') {
      const found = this.messages.find((m) => m.messageId === msg.messageId);
      if (found) {
        found.recalledForAll = msg.recalledForAll;
        found.recalledForSender = msg.recalledForSender;
        this.cdr.detectChanges();
      }
      return;
    }

    // ── Reaction update ────────────────────────────────────────
    if (msg.type === 'REACTION_UPDATE') {
      const found = this.messages.find((m) => m.messageId === msg.messageId);
      if (found) {
        found.reactions = msg.reactions as any;
        found.myReaction = msg.myReaction;
        this.cdr.detectChanges();
      }
      return;
    }

    const senderId = msg.senderId ?? '';
    const receiverId = msg.receiverId ?? '';
    const isEcho = msg.type === 'ECHO';
    const partnerId = isEcho ? receiverId : senderId;

    if (this.selectedConv?.partnerId === partnerId) {
      if (!isEcho) {
        this.decryptAndPush(msg);
        this.chatService.markRead(senderId, this.userId);
      } else {
        const last = this.messages[this.messages.length - 1];
        if (last && !last.messageId && last._localId) {
          last.messageId = msg.messageId;
          last.createdAt = msg.createdAt;
          last._uploading = false;
          last._localAttachments = undefined;
          if (msg.attachments?.length) last.attachments = msg.attachments;
        }
      }
      this.shouldScroll = true;
    } else {
      if (!isEcho) {
        const conv = this.conversations.find((c) => c.partnerId === senderId);
        if (conv) {
          conv.unreadCount++;
          conv.lastMessage = this.sidebarPreview(msg);
          conv.lastTime = msg.createdAt ?? '';
          this.sortConvs();
          this.cdr.detectChanges();
          return;
        } else {
          this.loadConversations();
          return;
        }
      } else {
        const conv = this.conversations.find((c) => c.partnerId === receiverId);
        if (conv) {
          conv.lastMessage = this.sidebarPreview(msg);
          conv.lastTime = msg.createdAt ?? '';
        }
      }
      this.sortConvs();
    }
    this.cdr.detectChanges();
  }

  private sidebarPreview(msg: ChatMessagePayload): string {
    if (msg.attachments?.length) {
      const hasVideo = msg.attachments.some((a) => a.fileType === 'VIDEO');
      return hasVideo ? '[Video]' : '[Hình ảnh]';
    }
    return msg.message ?? '';
  }

  private async decryptAndPush(msg: ChatMessagePayload): Promise<void> {
    const raw = msg.message ?? '';
    const plain = raw ? await ChatCrypto.safeDecrypt(raw) : '';
    this.messages.push({ ...msg, message: plain } as DisplayMessage);
    this.cdr.detectChanges();
  }

  // ── Load conversations ───────────────────────────────────────────

  loadConversations(autoSelectId?: string): void {
    this.chatService.getMyChats(this.userId).subscribe({
      next: (list: any[]) => {
        this.conversations = list.map((c) => ({
          partnerId: c.partnerId ?? c.partner_id ?? '',
          partnerName: c.partnerName ?? c.partner_name ?? 'Người dùng',
          partnerAvatar: c.partnerAvatar ?? c.partner_avatar ?? '',
          lastMessage: c.lastMessage ?? c.last_message ?? '',
          lastTime: c.lastTime ?? c.last_time ?? '',
          unreadCount: c.unreadCount ?? c.unread_count ?? 0,
        }));
        this.sortConvs();

        if (autoSelectId) {
          const existing = this.conversations.find((c) => c.partnerId === autoSelectId);
          if (existing) {
            this.selectConversation(existing);
          } else {
            const nc = this.buildNewConv(autoSelectId);
            this.conversations.unshift(nc);
            this.selectConversation(nc);
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        if (autoSelectId) {
          const nc = this.buildNewConv(autoSelectId);
          this.conversations = [nc];
          this.selectConversation(nc);
        }
      },
    });
  }

  private buildNewConv(partnerId: string): Conversation {
    return {
      partnerId,
      partnerName: this.route.snapshot.queryParamMap.get('partnerName') || 'Người dùng',
      partnerAvatar: this.route.snapshot.queryParamMap.get('partnerAvatar') || '',
      lastMessage: '',
      lastTime: new Date().toISOString(),
      unreadCount: 0,
    };
  }

  // ── Select conversation ──────────────────────────────────────────

  selectConversation(conv: Conversation): void {
    this.selectedConv = conv;
    this.messages = [];
    this.loading = true;
    conv.unreadCount = 0;
    this.clearPending();

    this.chatService.getHistory(this.userId, conv.partnerId).subscribe({
      next: async (msgs: any[]) => {
        const decrypted = await Promise.all(
          (msgs || []).map(async (m) => {
            const raw = m.message ?? m.messageContent ?? '';
            const plain = raw ? await ChatCrypto.safeDecrypt(raw) : '';
            return { ...m, message: plain } as DisplayMessage;
          }),
        );
        this.messages = decrypted;
        this.loading = false;
        this.shouldScroll = true;
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

  // ── File picker ──────────────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    const remaining = MAX_FILES - this.pendingFiles.length;
    if (remaining <= 0) {
      alert(`Tối đa ${MAX_FILES} file mỗi lần gửi.`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    const errors: string[] = [];

    for (const file of toAdd) {
      if (file.size > MAX_SIZE) {
        errors.push(`"${file.name}" vượt quá 10 MB`);
        continue;
      }
      const mime = file.type;
      const isImage = mime.startsWith('image/');
      const isVideo = mime.startsWith('video/');
      if (!isImage && !isVideo) {
        errors.push(`"${file.name}" không phải ảnh/video`);
        continue;
      }
      this.pendingFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        fileType: isVideo ? 'VIDEO' : 'IMAGE',
        uploaded: false,
        uploading: false,
        failed: false,
      });
    }

    if (errors.length) alert(errors.join('\n'));
    this.cdr.detectChanges();
    this.shouldScroll = true;
  }

  removePendingFile(index: number): void {
    const pf = this.pendingFiles[index];
    if (pf) URL.revokeObjectURL(pf.previewUrl);
    this.pendingFiles.splice(index, 1);
    this.cdr.detectChanges();
  }

  clearPending(): void {
    this.pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    this.pendingFiles = [];
  }

  // ── Send ─────────────────────────────────────────────────────────

  send(): void {
    const text = this.messageText.trim();
    const pending = [...this.pendingFiles];
    if (!text && !pending.length) return;
    if (!this.selectedConv) return;

    this.messageText = '';
    this.pendingFiles = [];

    const localId = `local_${++this.localCounter}_${Date.now()}`;

    if (pending.length) {
      const optimistic: DisplayMessage = {
        _localId: localId,
        senderId: this.userId,
        receiverId: this.selectedConv.partnerId,
        message: text || '',
        createdAt: new Date().toISOString(),
        type: 'MESSAGE',
        _uploading: true,
        _failed: false,
        _localAttachments: pending.map((p) => ({ previewUrl: p.previewUrl, fileType: p.fileType })),
      };
      this.messages.push(optimistic);
      this.shouldScroll = true;
      this.cdr.detectChanges();

      this.uploadSequentially(pending).then((uploaded) => {
        if (uploaded === null) {
          const idx = this.messages.findIndex((m) => m._localId === localId);
          if (idx !== -1) {
            this.messages[idx]._uploading = false;
            this.messages[idx]._failed = true;
          }
          this.cdr.detectChanges();
          return;
        }

        const attachments: AttachmentDto[] = uploaded.map((u, i) => ({
          fileUrl: u.url,
          fileType: u.fileType,
          sortOrder: i,
        }));

        const idx = this.messages.findIndex((m) => m._localId === localId);
        if (idx !== -1) {
          this.messages[idx]._uploading = false;
          this.messages[idx].attachments = attachments.map((a, i) => ({
            fileUrl: a.fileUrl,
            fileType: a.fileType,
            sortOrder: i,
          }));
        }

        this.chatService.sendMessage({
          roomId: this.roomId || 1,
          senderId: this.userId,
          receiverId: this.selectedConv!.partnerId,
          message: text || undefined,
          attachments,
        });

        const hasVideo = pending.some((p) => p.fileType === 'VIDEO');
        this.selectedConv!.lastMessage = hasVideo ? '[Video]' : '[Hình ảnh]';
        this.selectedConv!.lastTime = new Date().toISOString();
        this.sortConvs();
        this.cdr.detectChanges();
      });
    } else {
      const optimistic: DisplayMessage = {
        _localId: localId,
        senderId: this.userId,
        receiverId: this.selectedConv.partnerId,
        message: text,
        createdAt: new Date().toISOString(),
        type: 'MESSAGE',
      };
      this.messages.push(optimistic);
      this.shouldScroll = true;

      this.chatService.sendMessage({
        roomId: this.roomId || 1,
        senderId: this.userId,
        receiverId: this.selectedConv.partnerId,
        message: text,
      });

      this.selectedConv.lastMessage = text;
      this.selectedConv.lastTime = new Date().toISOString();
      this.sortConvs();
      this.cdr.detectChanges();
    }
  }

  private async uploadSequentially(
    pending: PendingFile[],
  ): Promise<{ url: string; fileType: 'IMAGE' | 'VIDEO' }[] | null> {
    const results: { url: string; fileType: 'IMAGE' | 'VIDEO' }[] = [];
    for (const pf of pending) {
      try {
        const res = (await this.chatService
          .uploadChatMedia(pf.file)
          .toPromise()) as UploadMediaResponse;
        results.push({ url: res.url, fileType: res.fileType });
      } catch {
        return null;
      }
    }
    return results;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ── Context Menu (chuột phải / long press) ──────────────────────

  onMessageContextMenu(event: MouseEvent, message: DisplayMessage): void {
    event.preventDefault();
    if (!message.messageId) return; // chưa save
    this.openContextMenu(event.clientX, event.clientY, message);
  }

  onTouchStart(event: TouchEvent, message: DisplayMessage): void {
    if (!message.messageId) return;
    const touch = event.touches[0];
    this.longPressTimer = setTimeout(() => {
      this.openContextMenu(touch.clientX, touch.clientY, message);
      this.cdr.detectChanges();
    }, this.longPressDuration);
  }

  onTouchEnd(): void {
    this.clearLongPress();
  }
  onTouchMove(): void {
    this.clearLongPress();
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private openContextMenu(x: number, y: number, message: DisplayMessage): void {
    // Điều chỉnh vị trí để menu không ra ngoài màn hình
    const menuW = 220,
      menuH = 200;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const finalX = x + menuW > vw ? x - menuW : x;
    const finalY = y + menuH > vh ? y - menuH : y;

    this.contextMenu = { open: true, x: finalX, y: finalY, message };
  }

  closeContextMenu(): void {
    this.contextMenu = { open: false, x: 0, y: 0, message: null };
  }

  // ── React ────────────────────────────────────────────────────────

  sendReaction(emoji: string): void {
    const msg = this.contextMenu.message;
    if (!msg?.messageId) return;
    this.closeContextMenu();

    this.chatService
      .reactToMessage({
        messageId: msg.messageId,
        userId: this.userId,
        emoji,
      })
      .subscribe({
        next: () => {}, // WebSocket sẽ update
        error: (e) => console.error('React error', e),
      });
  }

  // ── Thu hồi ──────────────────────────────────────────────────────

  recallForMe(): void {
    const msg = this.contextMenu.message;
    if (!msg?.messageId) return;
    this.closeContextMenu();

    this.chatService
      .recallMessage({
        messageId: msg.messageId,
        senderId: this.userId,
        recallForAll: false,
      })
      .subscribe({
        error: (e) => console.error('Recall error', e),
      });
  }

  recallForAll(): void {
    const msg = this.contextMenu.message;
    if (!msg?.messageId) return;
    this.closeContextMenu();

    this.chatService
      .recallMessage({
        messageId: msg.messageId,
        senderId: this.userId,
        recallForAll: true,
      })
      .subscribe({
        error: (e) => console.error('Recall error', e),
      });
  }

  // ── Kiểm tra trạng thái hiển thị ─────────────────────────────────

  isRecalledForMe(m: DisplayMessage): boolean {
    if (m.recalledForAll) return true;
    if (m.recalledForSender && this.isMe(m)) return true;
    return false;
  }

  canRecall(m: DisplayMessage): boolean {
    return !!m.messageId && this.isMe(m) && !m.recalledForAll && !m._uploading;
  }

  getReactionEntries(m: DisplayMessage): { emoji: string; count: number }[] {
    if (!m.reactions) return [];
    return Object.entries(m.reactions)
      .filter(([, count]) => count > 0)
      .map(([emoji, count]) => ({ emoji, count }));
  }

  // ── Helpers ──────────────────────────────────────────────────────

  isMe(m: DisplayMessage): boolean {
    return (m.senderId ?? '') === this.userId;
  }

  getMessageText(m: DisplayMessage): string {
    return m?.message ?? (m as any)?.messageContent ?? '';
  }

  getDisplayAttachments(
    m: DisplayMessage,
  ): { url: string; fileType: 'IMAGE' | 'VIDEO'; isLocal: boolean }[] {
    if (m.attachments?.length)
      return m.attachments.map((a) => ({ url: a.fileUrl, fileType: a.fileType, isLocal: false }));
    if (m._localAttachments?.length)
      return m._localAttachments.map((a) => ({
        url: a.previewUrl,
        fileType: a.fileType,
        isLocal: true,
      }));
    return [];
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatboxRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private sortConvs(): void {
    this.conversations.sort(
      (a, b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime(),
    );
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
  backToList(): void {
    this.selectedConv = null;
    this.messages = [];
    this.clearPending();
  }
  getTotalUnread(): number {
    return this.conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  }
  getAvatar(conv: Conversation): string {
    if (conv.partnerAvatar) return conv.partnerAvatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.partnerName || 'U')}&background=00C897&color=fff&size=80&bold=true`;
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

  formatMessageTime(dateStr = ''): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  trackByMsg(_: number, m: DisplayMessage): any {
    return m.messageId ?? m._localId ?? m.createdAt;
  }
  trackByConv(_: number, c: Conversation): string {
    return c.partnerId;
  }
  trackByIdx(i: number): number {
    return i;
  }

  // ── Lightbox ─────────────────────────────────────────────────────

  openLightbox(
    items: { url: string; fileType: 'IMAGE' | 'VIDEO'; isLocal: boolean }[],
    startIndex: number,
  ): void {
    const imageItems = items.filter((a) => a.fileType === 'IMAGE');
    const clickedUrl = items[startIndex]?.url;
    const idxInImages = imageItems.findIndex((a) => a.url === clickedUrl);
    if (imageItems.length === 0) return;
    this.lightbox = { open: true, items: imageItems, index: idxInImages >= 0 ? idxInImages : 0 };
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightbox.open = false;
    document.body.style.overflow = '';
  }

  lbPrev(e: Event): void {
    e.stopPropagation();
    this.lightbox.index =
      (this.lightbox.index - 1 + this.lightbox.items.length) % this.lightbox.items.length;
  }

  lbNext(e: Event): void {
    e.stopPropagation();
    this.lightbox.index = (this.lightbox.index + 1) % this.lightbox.items.length;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydownLightbox(e: KeyboardEvent): void {
    if (!this.lightbox.open) return;
    if (e.key === 'Escape') this.closeLightbox();
    if (e.key === 'ArrowRight')
      this.lightbox.index = (this.lightbox.index + 1) % this.lightbox.items.length;
    if (e.key === 'ArrowLeft')
      this.lightbox.index =
        (this.lightbox.index - 1 + this.lightbox.items.length) % this.lightbox.items.length;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.contextMenu.open) {
      const target = e.target as HTMLElement;
      if (!target.closest('.msg-context-menu')) this.closeContextMenu();
    }
  }
}
