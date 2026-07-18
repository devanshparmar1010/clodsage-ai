import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageSquare, Loader2, HelpCircle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useChat } from '../hooks/useChat';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'system-intro',
    role: 'assistant',
    text: 'Ask me about your cloud spend, top savings opportunities, forecast, or FinOps score.',
  },
];

const SUGGESTED_QUESTIONS = [
  'How many EC2 instances do I have?',
  'How many S3 buckets do I have?',
  'What is my monthly spend?',
  'Show me recommendations',
  'What is my projected forecast?',
  'Are there any idle EC2 instances?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const chat = useChat();

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chat.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await chat.mutateAsync(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: response.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: 'Unable to answer right now. Please try again later.',
        },
      ]);
    }
  };

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat Assistant"
        description="Ask questions about your cloud cost analysis, recommendations, forecast, or score."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl p-4 max-w-[85%]',
                  message.role === 'user'
                    ? 'bg-blue-600/10 text-zinc-100 ml-auto border border-blue-500/20'
                    : 'bg-zinc-850 text-zinc-200 border border-zinc-800'
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <span>{message.role}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span>Ask anything about your cloud analysis</span>
            </div>

            {/* Suggested / Fixed Questions */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
                <span>Suggested Questions</span>
              </div>
              <div className="flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={chat.isPending}
                    className="w-full text-left text-xs bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg text-zinc-300 hover:text-zinc-100 transition-all font-medium disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-800 pt-6">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Type your question..."
              className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chat.isPending}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {chat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {chat.isPending ? 'Thinking...' : 'Send Message'}
            </button>
            {chat.error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {chat.error.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
