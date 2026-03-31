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
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  ChatService,
  ChatMessagePayload,
  AttachmentDto,
  UploadMediaResponse,
} from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatCrypto } from '../../utils/chat-crypto.util';
import { environment } from '../../../environments/environment';

// ── Room Card (encode vào message text, không cần thay đổi backend) ──────────
export const ROOM_CARD_PREFIX = '[ROOM_CARD]:';

export interface RoomCardData {
  roomId: number;
  title: string;
  pricePerMonth: number;
  areaSize: number;
  imageUrl: string; // ảnh đại diện (primary)
  address: string; // chuỗi địa chỉ rút gọn
}

export function encodeRoomCard(data: RoomCardData): string {
  return ROOM_CARD_PREFIX + JSON.stringify(data);
}

export function parseRoomCard(text: string): {
  card: RoomCardData | null;
  extraText: string;
} {
  if (!text) return { card: null, extraText: '' };

  const idx = text.indexOf(ROOM_CARD_PREFIX);
  if (idx === -1) return { card: null, extraText: text };

  try {
    const afterPrefix = text.substring(idx + ROOM_CARD_PREFIX.length).trim();

    const endIdx = afterPrefix.indexOf('}') + 1;
    const jsonStr = afterPrefix.substring(0, endIdx);
    const extra = afterPrefix.substring(endIdx).trim();

    return {
      card: JSON.parse(jsonStr),
      extraText: extra,
    };
  } catch {
    return { card: null, extraText: text };
  }
}

// ── Interfaces ────────────────────────────────────────────────────────────────

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

  // Room card (parsed từ message text, dùng khi render)
  _roomCard?: RoomCardData | null;
}

export interface ContextMenu {
  open: boolean;
  x: number;
  y: number;
  message: DisplayMessage | null;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

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

  // ── Room card preview (hiện phía trên input khi navigate từ trang phòng) ──
  pendingRoomCard: RoomCardData | null = null;
  roomCardLoading = false;

  lightbox: {
    open: boolean;
    items: { url: string; fileType: 'IMAGE' | 'VIDEO' }[];
    index: number;
  } = { open: false, items: [], index: 0 };

  contextMenu: ContextMenu = { open: false, x: 0, y: 0, message: null };

  readonly reactionEmojis = REACTION_EMOJIS;

  private subs = new Subscription();
  private shouldScroll = false;
  private localCounter = 0;

  private longPressTimer: any = null;
  private longPressDuration = 500;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.router.navigate(['/']);
      return;
    }
    this.userId = user.user_id;
    this.chatService.connect(this.userId);
    this.subs.add(this.chatService.message$.subscribe((msg) => this.handleIncoming(msg)));

    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      this.roomId = Number(params.get('roomId')) || 0;
      this.receiverIdFromRoute = params.get('receiverId') || '';
      this.loadConversations(this.receiverIdFromRoute || undefined);

      // Nếu có roomId → fetch chi tiết phòng để tạo room card preview
      if (this.roomId) {
        this.fetchRoomCardPreview(this.roomId);
      }
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

  // ── Fetch room card preview ────────────────────────────────────────────────

  private fetchRoomCardPreview(roomId: number): void {
    this.roomCardLoading = true;
    this.http.get<any>(`${environment.apiUrl}/rooms/${roomId}`).subscribe({
      next: (res) => {
        const room = res?.data ?? res;
        const primaryImage =
          room.images?.find((img: any) => img.isPrimary)?.imageUrl ||
          room.images?.[0]?.imageUrl ||
          '';
        const addr = room.address;
        const addressStr = addr
          ? [addr.street_address, addr.ward_name, addr.district_name, addr.city_name]
              .filter(Boolean)
              .join(', ')
          : '';

        this.pendingRoomCard = {
          roomId: room.roomId,
          title: room.title,
          pricePerMonth: room.pricePerMonth,
          areaSize: room.areaSize,
          imageUrl: primaryImage,
          address: addressStr,
        };
        this.roomCardLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.roomCardLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  dismissRoomCard(): void {
    this.pendingRoomCard = null;
  }

  // ── Incoming socket ───────────────────────────────────────────────────────

  private handleIncoming(msg: ChatMessagePayload): void {
    if (msg.type === 'RECALL') {
      const found = this.messages.find((m) => m.messageId === msg.messageId);
      if (found) {
        found.recalledForAll = msg.recalledForAll;
        found.recalledForSender = msg.recalledForSender;
        this.cdr.detectChanges();
      }
      return;
    }

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
          this.sidebarPreviewAsync(msg).then((preview) => {
            conv.lastMessage = preview;
            conv.lastTime = msg.createdAt ?? '';
            this.sortConvs();
            this.cdr.detectChanges();
          });
          return;
        } else {
          this.loadConversations();
          return;
        }
      } else {
        const conv = this.conversations.find((c) => c.partnerId === receiverId);
        if (conv) {
          this.sidebarPreviewAsync(msg).then((preview) => {
            conv.lastMessage = preview;
            conv.lastTime = msg.createdAt ?? '';
            this.sortConvs();
            this.cdr.detectChanges();
          });
        }
      }
      this.sortConvs();
    }
    this.cdr.detectChanges();
  }

  private async sidebarPreviewAsync(msg: ChatMessagePayload): Promise<string> {
    if (msg.attachments?.length) {
      const hasVideo = msg.attachments.some((a) => a.fileType === 'VIDEO');
      return hasVideo ? '[Video]' : '[Hình ảnh]';
    }

    const raw = msg.message ?? '';
    const plain = raw ? await ChatCrypto.safeDecrypt(raw) : '';

    if (plain?.startsWith(ROOM_CARD_PREFIX)) {
      try {
        const data = JSON.parse(plain.replace(ROOM_CARD_PREFIX, ''));
        return `🏠 ${data.title}`;
      } catch {
        return '🏠 Thông tin phòng';
      }
    }

    return plain;
  }

  private async decryptAndPush(msg: ChatMessagePayload): Promise<void> {
    const raw = msg.message ?? '';
    const plain = raw ? await ChatCrypto.safeDecrypt(raw) : '';
    const parsed = parseRoomCard(plain);

    this.messages.push({
      ...msg,
      message: parsed.extraText,
      _roomCard: parsed.card,
    });
    this.cdr.detectChanges();
  }

  // ── Load conversations ────────────────────────────────────────────────────

  loadConversations(autoSelectId?: string): void {
    this.chatService.getMyChats(this.userId).subscribe({
      next: async (list: any[]) => {
        const convs = await Promise.all(
          list.map(async (c) => {
            const raw = c.lastMessage ?? c.last_message ?? '';

            const plain = raw ? await ChatCrypto.safeDecrypt(raw) : '';

            let lastMsg = plain;

            if (plain?.startsWith(ROOM_CARD_PREFIX)) {
              try {
                const data = JSON.parse(plain.replace(ROOM_CARD_PREFIX, ''));
                lastMsg = `🏠 ${data.title}`;
              } catch {
                lastMsg = '🏠 Thông tin phòng';
              }
            }

            return {
              partnerId: c.partnerId ?? c.partner_id ?? '',
              partnerName: c.partnerName ?? c.partner_name ?? 'Người dùng',
              partnerAvatar: c.partnerAvatar ?? c.partner_avatar ?? '',
              lastMessage: lastMsg,
              lastTime: c.lastTime ?? c.last_time ?? '',
              unreadCount: c.unreadCount ?? c.unread_count ?? 0,
            };
          }),
        );

        // Dedup: giữ lại 1 conv mới nhất cho mỗi partnerId (backend có thể trả về trùng)
        const dedupMap = new Map<string, (typeof convs)[0]>();
        for (const c of convs) {
          const key = c.partnerId.toLowerCase();
          const prev = dedupMap.get(key);
          if (!prev || new Date(c.lastTime).getTime() > new Date(prev.lastTime).getTime()) {
            dedupMap.set(key, c);
          }
        }
        this.conversations = Array.from(dedupMap.values());
        this.sortConvs();

        if (autoSelectId) {
          // So sánh case-insensitive để tránh mismatch UUID uppercase/lowercase
          const normalId = autoSelectId.toLowerCase();
          const existing = this.conversations.find((c) => c.partnerId.toLowerCase() === normalId);
          if (existing) {
            // Cập nhật lại tên/avatar từ route params (phòng trường hợp conv cũ thiếu info)
            const nameFromRoute = this.route.snapshot.queryParamMap.get('partnerName');
            const avatarFromRoute = this.route.snapshot.queryParamMap.get('partnerAvatar');
            if (nameFromRoute) existing.partnerName = nameFromRoute;
            if (avatarFromRoute) existing.partnerAvatar = avatarFromRoute;
            this.selectConversation(existing);
          } else {
            // Chỉ tạo conv tạm khi thực sự không tồn tại trong list từ API
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

  // ── Select conversation ───────────────────────────────────────────────────

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
            const parsed = parseRoomCard(plain);
            return {
              ...m,
              message: parsed.extraText,
              _roomCard: parsed.card,
            };
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

  // ── File picker ───────────────────────────────────────────────────────────

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

  // ── Send ──────────────────────────────────────────────────────────────────

  send(): void {
    const text = this.messageText.trim();
    const pending = [...this.pendingFiles];
    const roomCard = this.pendingRoomCard;

    // Phải có ít nhất một trong: text, file, room card
    if (!text && !pending.length && !roomCard) return;
    if (!this.selectedConv) return;

    this.messageText = '';
    this.pendingFiles = [];
    // Xóa room card preview sau khi gửi
    if (roomCard) this.pendingRoomCard = null;

    const localId = `local_${++this.localCounter}_${Date.now()}`;

    if (roomCard && !pending.length) {
      const cardText = encodeRoomCard(roomCard);

      const optimisticCard: DisplayMessage = {
        _localId: localId,
        senderId: this.userId,
        receiverId: this.selectedConv!.partnerId,
        message: '',
        _roomCard: roomCard,
        createdAt: new Date().toISOString(),
        type: 'MESSAGE',
      };

      this.messages.push(optimisticCard);

      if (text) {
        const optimisticText: DisplayMessage = {
          _localId: `${localId}_text`,
          senderId: this.userId,
          receiverId: this.selectedConv!.partnerId,
          message: text,
          createdAt: new Date().toISOString(),
          type: 'MESSAGE',
        };

        this.messages.push(optimisticText);
      }

      this.shouldScroll = true;
      this.cdr.detectChanges();

      this.chatService.sendMessage({
        roomId: this.roomId || roomCard.roomId,
        senderId: this.userId,
        receiverId: this.selectedConv!.partnerId,
        message: cardText,
      });

      if (text) {
        this.chatService.sendMessage({
          roomId: this.roomId || roomCard.roomId,
          senderId: this.userId,
          receiverId: this.selectedConv!.partnerId,
          message: text,
        });
      }

      this.selectedConv.lastMessage = text || '🏠 Thông tin phòng';
      this.selectedConv.lastTime = new Date().toISOString();
      this.sortConvs();
      this.cdr.detectChanges();
      return;
    }

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

  // ── Helpers: room card ────────────────────────────────────────────────────

  isRoomCard(m: DisplayMessage): boolean {
    return !!m._roomCard;
  }

  viewRoom(roomId: number): void {
    this.router.navigate(['/room-detail', roomId]);
  }

  formatPrice(price: number): string {
    if (!price) return 'Liên hệ';
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return (m % 1 === 0 ? `${m}` : `${m.toFixed(1)}`) + ' triệu/tháng';
    }
    return `${(price / 1000).toFixed(0)}k/tháng`;
  }

  // ── Context Menu ──────────────────────────────────────────────────────────

  onMessageContextMenu(event: MouseEvent, message: DisplayMessage): void {
    event.preventDefault();
    if (!message.messageId) return;
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

  // ── React ─────────────────────────────────────────────────────────────────

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
        next: () => {},
        error: (e) => console.error('React error', e),
      });
  }

  // ── Thu hồi ───────────────────────────────────────────────────────────────

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
      .subscribe({ error: (e) => console.error('Recall error', e) });
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
      .subscribe({ error: (e) => console.error('Recall error', e) });
  }

  // ── Kiểm tra trạng thái ───────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  // ── Lightbox ──────────────────────────────────────────────────────────────

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
