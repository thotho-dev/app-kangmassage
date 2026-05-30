import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'chat_sessions_v1';

export interface ChatMessage {
  id: string;
  sender_type: 'therapist' | 'ai';
  message: string;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  sidebarVisible: boolean;
  loaded: boolean;
  createSession: () => string;
  deleteSession: (id: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  setActiveSession: (id: string) => void;
  setSidebarVisible: (visible: boolean) => void;
}

const store = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  sidebarVisible: false,
  loaded: false,

  createSession: () => {
    const id = `session-${Date.now()}`;
    const now = new Date();
    const title = `Chat ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    const session: ChatSession = {
      id,
      title,
      messages: [],
      created_at: now.toISOString(),
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));
    persistSessions(get().sessions);
    return id;
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));
    persistSessions(get().sessions);
  },

  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
      ),
    }));
    persistSessions(get().sessions);
  },

  setMessages: (sessionId, messages) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages } : s
      ),
    }));
    persistSessions(get().sessions);
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  setSidebarVisible: (visible) => {
    set({ sidebarVisible: visible });
  },
}));

async function persistSessions(sessions: ChatSession[]) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('[ChatStore] Failed to persist sessions:', e);
  }
}

async function loadSessions(): Promise<ChatSession[]> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Load persisted data on init
loadSessions().then((sessions) => {
  store.setState({ sessions, loaded: true });
});

export { store as useChatStore };
