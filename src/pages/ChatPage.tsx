import React, { useState } from 'react';
import { MessageSquare, Plus, Send, Users } from 'lucide-react';
import {
  ChatMessage,
  Conversation,
  Member,
  UserRole,
} from '../types/app';
import { getRoleLabel } from '../utils/formatters';

interface ChatPageProps {
  conversations: Conversation[];
  messagesByConv: Record<string, ChatMessage[]>;
  members: Member[];
  currentUid: string;
  currentUserName: string;
  currentRole: UserRole;
  onCreateConversation: (conv: Conversation) => void;
  onSendMessage: (conversationId: string, msg: ChatMessage) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  conversations,
  messagesByConv,
  members,
  currentUid,
  currentUserName,
  currentRole,
  onCreateConversation,
  onSendMessage,
}) => {
  const [activeConvId, setActiveConvId] = useState<string | null>(
    conversations[0]?.id ?? null
  );
  const [draft, setDraft] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'groupe' | 'direct'>('groupe');
  const [selectedTargetUid, setSelectedTargetUid] = useState('');

  const activeConv =
    conversations.find((c) => c.id === activeConvId) ??
    conversations[0] ??
    null;

  const activeMessages = activeConv ? messagesByConv[activeConv.id] ?? [] : [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;

    const participantUids = Array.from(
      new Set([...activeConv.participantUids, currentUid])
    ).slice(0, 30);

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderUid: currentUid,
      senderName: currentUserName,
      senderRole: currentRole,
      text: draft.trim(),
      participantUids,
      createdAt: new Date().toISOString(),
    };

    onSendMessage(activeConv.id, msg);
    setDraft('');
  };

  const handleCreateConv = (e: React.FormEvent) => {
    e.preventDefault();
    const staffUids = members
      .map((m) => m.uid || m.id)
      .filter((x) => Boolean(x));

    const targetMember = members.find(
      (m) => (m.uid || m.id) === selectedTargetUid
    );

    const participantUids =
      newType === 'direct' && selectedTargetUid
        ? Array.from(new Set([currentUid, selectedTargetUid]))
        : Array.from(new Set([currentUid, ...staffUids])).slice(0, 30);

    const title =
      newType === 'direct' && targetMember
        ? `Direct · ${targetMember.fullName} (${getRoleLabel(targetMember.role)})`
        : newTitle.trim() || 'Discussion Équipe GIS';

    const conv: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      type: newType,
      isTeamChannel: newType === 'groupe',
      participantUids,
      lastMessageText: '',
      lastSenderName: '',
      createdByUid: currentUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateConversation(conv);
    setActiveConvId(conv.id);
    setNewTitle('');
    setIsNewModalOpen(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Coordination interne Patron, Caisse, Gérants, Chargeurs & Chauffeurs
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Conversations entre utilisateurs
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nouvelle conversation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[540px]">
        {/* Channels & Direct Chats List */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Canaux & Discussions ({conversations.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {conversations.length === 0 ? (
              <p className="p-6 text-xs text-slate-500 text-center">
                Aucune conversation. Cliquez sur « Nouvelle conversation » pour démarrer.
              </p>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {conv.title}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {conv.type === 'groupe' ? 'Groupe' : 'Direct'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                      {conv.lastMessageText
                        ? `${conv.lastSenderName}: ${conv.lastMessageText}`
                        : 'Aucun message pour l’instant'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Active Conversation Thread */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p className="font-display font-semibold text-base">
                Sélectionnez une discussion
              </p>
            </div>
          ) : (
            <>
              <header className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {activeConv.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connecté en tant que {currentUserName} (
                    {getRoleLabel(currentRole)})
                  </p>
                </div>
                <Users className="w-4 h-4 text-slate-400" />
              </header>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[400px]">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-12">
                    Démarrez la conversation pour coordonner les stocks, chargements ou livraisons.
                  </p>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderUid === currentUid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {msg.senderName}
                          </span>
                          <span>·</span>
                          <span>{getRoleLabel(msg.senderRole)}</span>
                          <span>·</span>
                          <span className="font-mono-tabular">
                            {new Date(msg.createdAt).toLocaleTimeString(
                              'fr-FR',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </div>
                        <div
                          className={`max-w-lg px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                            isMine
                              ? 'bg-[#0F2342] text-white dark:bg-[#D9531E]'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrire un message à l'équipe ou au collègue..."
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Envoyer
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* New Conversation Modal */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateConv}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h2 className="font-display font-bold text-lg">
              Créer une nouvelle conversation
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType('groupe')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                  newType === 'groupe'
                    ? 'bg-[#0F2342] text-white border-[#0F2342]'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Canal de groupe
              </button>
              <button
                type="button"
                onClick={() => setNewType('direct')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                  newType === 'direct'
                    ? 'bg-[#0F2342] text-white border-[#0F2342]'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                Message direct
              </button>
            </div>

            {newType === 'groupe' ? (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Nom du canal
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex. Livraisons chantier Gare TSR"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Destinataire
                </label>
                <select
                  required
                  value={selectedTargetUid}
                  onChange={(e) => setSelectedTargetUid(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Choisir un membre...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.uid || m.id}>
                      {m.fullName} — {getRoleLabel(m.role)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-[#D9531E] text-white rounded-lg cursor-pointer"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
