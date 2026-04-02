import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AttachmentDto {
  attachmentId?: number;
  fileUrl: string;
  fileType: 'IMAGE' | 'VIDEO';
  sortOrder: number;
}

export interface ChatMessagePayload {
  messageId?: number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  type?: 'MESSAGE' | 'ECHO' | 'READ_RECEIPT' | 'RECALL' | 'REACTION_UPDATE';
  attachments?: AttachmentDto[];

  recalledForAll?: boolean;
  recalledForSender?: boolean;

  reactions?: Record<string, number>;
  myReaction?: string;
}

export interface SendMessageRequest {
  roomId: number;
  senderId: string;
  receiverId: string;
  message?: string;
  attachments?: AttachmentDto[];
}

export interface UploadMediaResponse {
  url: string;
  fileType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private client!: Client;
  private _connected = false;
  private connectedUserId = '';

  readonly message$ = new Subject<ChatMessagePayload>();
  readonly notification$ = new Subject<any>();
  readonly readReceipt$ = new Subject<ChatMessagePayload>();

  constructor(private http: HttpClient) {}

  connect(userId: string): void {
    if (this._connected && this.connectedUserId === userId) return;
    if (this._connected) this.disconnect();
    this.connectedUserId = userId;

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws-chat`),
      reconnectDelay: 5000,
      onConnect: () => {
        this._connected = true;
        this.client.subscribe(`/topic/chat.${userId}`, (msg: IMessage) => {
          const data: ChatMessagePayload = JSON.parse(msg.body);
          if (data.type === 'READ_RECEIPT') this.readReceipt$.next(data);
          else this.message$.next(data);
        });
        this.client.subscribe(`/topic/notification.${userId}`, (msg: IMessage) => {
          this.notification$.next(JSON.parse(msg.body));
        });
      },
      onDisconnect: () => {
        this._connected = false;
      },
      onStompError: (frame) => {
        console.error('[ChatService] STOMP error:', frame.headers['message']);
      },
    });
    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this._connected = false;
      this.connectedUserId = '';
    }
  }

  sendMessage(payload: SendMessageRequest): void {
    if (!this.client?.connected) {
      console.error('[ChatService] WebSocket chưa kết nối');
      return;
    }
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }

  markRead(senderId: string, receiverId: string): void {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({ senderId, receiverId }),
    });
  }

  uploadChatMedia(file: File): Observable<UploadMediaResponse> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('secureId', `chat/${crypto.randomUUID()}`);
    return this.http.post<UploadMediaResponse>(`${environment.apiUrl}/upload/chat-media`, fd);
  }

  getHistory(user1: string, user2: string): Observable<ChatMessagePayload[]> {
    return this.http.get<ChatMessagePayload[]>(`${environment.apiUrl}/chat/history`, {
      params: { user1, user2 },
    });
  }

  getMyChats(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/chat/my`, { params: { userId } });
  }

  isConnected(): boolean {
    return this._connected;
  }

  reactToMessage(payload: { messageId: number; userId: string; emoji: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/chat/react`, payload);
  }

  recallMessage(payload: {
    messageId: number;
    senderId: string;
    recallForAll: boolean;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/chat/recall`, payload);
  }
}
