/**
 * ConversationPanel — replaces ChatbotPanel.tsx (14_decarbonito_overlay.md §6). Floating, anchored
 * to the avatar instead of a fixed 30-40%-wide column. Keeps the same `chatMessages` data model
 * and voice logic ChatbotPanel had — only the surface changes.
 *
 * Deviations from the source spec, documented rather than silently applied: no drag-handle mobile
 * bottom sheet (a plain full-width fixed sheet instead) and no `expanded` 720px reading mode —
 * both flagged in docs/DESIGN_DECISIONS_LOG.md as trimmed for this pass.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, size } from '@floating-ui/react';
import { ChatMessage } from '../../types';
import { useT } from '../../i18n';
import { useSpeech } from '../../hooks/useSpeech';
import { DecarboNitoAvatar } from './DecarboNitoAvatar';

interface ConversationPanelProps {
  messages: ChatMessage[];
  onUserSubmit: (userInput: string) => Promise<void>;
  isLoading: boolean;
  apiKeyAvailable: boolean;
  currentLevelName: string;
  suggestedQuestions: string[];
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const SpeakerIcon: React.FC<{ enabled: boolean }> = ({ enabled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
    {enabled ? (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16.2 8.8a5 5 0 010 6.4" />
        <path d="M18.8 6.2a8.5 8.5 0 010 11.6" />
      </g>
    ) : (
      <path d="M17 9l4.5 6M21.5 9L17 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages, onUserSubmit, isLoading, apiKeyAvailable, currentLevelName, suggestedQuestions, anchorEl, onClose,
}) => {
  const { t, locale } = useT();
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const speech = useSpeech(apiKeyAvailable);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: 'top-end',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(16), flip(), shift({ padding: 16 }),
      size({ apply: ({ availableHeight, elements }) => { elements.floating.style.maxHeight = `${Math.min(560, availableHeight - 16)}px`; } }),
    ],
  });

  useEffect(() => { if (!isMobile) refs.setReference(anchorEl); }, [refs, anchorEl, isMobile]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Same "narrate every new bot message" logic ChatbotPanel had.
  const lastSpokenIndexRef = useRef(-1);
  useEffect(() => {
    if (!speech.enabled) return;
    const lastIndex = messages.length - 1;
    if (lastIndex < 0 || lastIndex === lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    const lastMessage = messages[lastIndex];
    if (lastMessage.sender === 'bot') speech.speak(lastMessage.text, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, speech.enabled, locale]);

  // Esc closes; click-outside closes only while nothing is in flight (per §6).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      if (isLoading) return;
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && anchorEl && !anchorEl.contains(target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [onClose, isLoading, anchorEl]);

  // Minimal focus trap: Tab/Shift+Tab cycle within the panel instead of escaping to the page.
  const onTrapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>('button, textarea, [href], input, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const submit = async (text: string) => {
    if (!text.trim() || isLoading || !apiKeyAvailable) return;
    await onUserSubmit(text);
    setUserInput('');
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); void submit(userInput); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(userInput); }
  };

  const containerStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, height: '80vh' }
    : { ...floatingStyles, width: 400 };

  return (
    <div
      ref={(el) => { panelRef.current = el; if (!isMobile) refs.setFloating(el); }}
      style={{ ...containerStyle, pointerEvents: 'auto', zIndex: 85 }}
      className="flex flex-col rounded-xl border border-basalt-600 bg-basalt-900 shadow-2xl overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('conversation.title')}
      onKeyDown={onTrapKeyDown}
    >
      <div className="p-3 border-b border-basalt-700 flex items-center gap-3 shrink-0">
        <DecarboNitoAvatar state="idle" emotion={isLoading ? 'focused' : 'neutral'} size={40} />
        <div className="flex-grow min-w-0">
          <h3 className="text-[15px] font-semibold text-bone truncate">{t('conversation.title')}</h3>
          {currentLevelName && <p className="text-xs text-ash-dim truncate">{t('conversation.focus')} {currentLevelName}</p>}
          {speech.isSpeaking && <p className="text-xs text-hydro animate-pulse">{t('conversation.speaking')}</p>}
        </div>
        {speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            className={`p-2 rounded-full transition-colors shrink-0 ${speech.enabled ? 'bg-hydro text-basalt-950' : 'bg-basalt-700 text-ash hover:text-bone'}`}
            aria-pressed={speech.enabled}
            aria-label={speech.enabled ? t('conversation.voiceOn') : t('conversation.voiceOff')}
            title={speech.enabled ? t('conversation.voiceOn') : t('conversation.voiceOff')}
          >
            <SpeakerIcon enabled={speech.enabled} />
          </button>
        )}
        <button
          type="button" onClick={onClose}
          className="p-2 rounded-full text-ash-dim hover:text-bone hover:bg-basalt-700 transition-colors shrink-0"
          aria-label={t('conversation.close')}
        >
          &#10005;
        </button>
      </div>

      <div className="flex-grow p-3 space-y-2 overflow-y-auto min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-ash-dim italic p-2">{t('conversation.emptyState')}</p>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl shadow text-sm ${
              msg.sender === 'user' ? 'bg-hydro text-basalt-950'
              : msg.sender === 'bot'
                ? (msg.emphasisType === 'level_event' || msg.emphasisType === 'game_event' || msg.emphasisType === 'proactive_bot' ? 'bg-indigo-ink/30 text-bone border border-indigo-ink/50' : 'bg-basalt-700 text-bone')
                : (msg.emphasisType === 'system_error' ? 'bg-ember/20 text-bone border border-ember/50 italic' : 'bg-ochre/20 text-bone border border-ochre/50 italic')
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-basalt-700 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!apiKeyAvailable ? t('conversation.noKey') : isLoading ? t('conversation.thinking') : t('conversation.placeholder')}
            className="flex-grow p-2.5 bg-basalt-800 border border-basalt-600 rounded-lg focus:ring-2 focus:ring-hydro focus:border-transparent outline-none text-bone placeholder-ash-dim transition-colors resize-none max-h-28 min-h-[42px] text-sm"
            disabled={isLoading || !apiKeyAvailable}
            aria-label={t('conversation.inputLabel')}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || !apiKeyAvailable}
            className="px-4 py-2.5 bg-hydro text-basalt-950 font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
          >
            {t('conversation.send')}
          </button>
        </div>
        {!apiKeyAvailable && <p className="text-xs text-ember mt-1">{t('conversation.noKeyMsg')}</p>}
        {apiKeyAvailable && suggestedQuestions.length > 0 && !isLoading && (
          <div className="mt-2 pt-2 border-t border-basalt-700/50">
            <p className="text-xs text-ash-dim mb-1.5">{t('conversation.suggestions')}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void submit(q)}
                  className="px-2.5 py-1 bg-basalt-700 hover:bg-basalt-600 text-ash text-xs rounded-md transition-colors"
                  aria-label={t('conversation.askLabel', { q })}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ConversationPanel;
