import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HtmlPreview } from '@/components/HtmlPreview';
import { cn } from '@/lib/utils';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const GREETINGS = [
  "Hello! I'm TaxLexis AI Assistant. How can I help you with tax and legal questions today?",
];

const QUICK_REPLIES = [
  'What is income tax rate in Nepal?',
  'How to register a company?',
  'VAT filing deadline?',
];

const mockReply = (q: string): string => {
  const lower = q.toLowerCase();
  if (lower.includes('income tax') || lower.includes('tax rate'))
    return "Nepal's income tax rates for individuals range from 1% (up to NPR 5,00,000) to 36% (above NPR 25,00,000). For companies, the standard rate is 25%. Would you like detailed slab information?";
  if (lower.includes('register') || lower.includes('company'))
    return "To register a company in Nepal, you need to: 1) Reserve a company name at OCR, 2) Prepare MOA & AOA, 3) File incorporation documents, 4) Get PAN/VAT registration from IRD. The process typically takes 7-15 days. Want me to explain any step in detail?";
  if (lower.includes('vat') || lower.includes('filing'))
    return "VAT returns in Nepal must be filed monthly by the 25th of the following month. Late filing attracts a penalty of NPR 5,000 or 0.05% per day. Need help with VAT calculation?";
  if (lower.includes('pricing') || lower.includes('plan') || lower.includes('subscribe'))
    return "We offer Basic (NPR 499/mo), Premium (NPR 1,999/mo), and Enterprise (NPR 4,999/mo) plans. Visit our pricing page for details. Would you like me to help you choose?";
  return "Thank you for your question. Our team specializes in Nepalese tax and legal advisory. For detailed guidance, please explore our Laws, Summaries, or Tools sections — or contact us directly. Is there anything specific I can help with?";
};

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'g1', role: 'assistant', content: GREETINGS[0] },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: `u${Date.now()}`, role: 'user', content: text.trim() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply: Msg = { id: `a${Date.now()}`, role: 'assistant', content: mockReply(text) };
      setMessages((p) => [...p, reply]);
      setTyping(false);
    }, 800 + Math.random() * 700);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110',
          open ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ height: 520 }}>
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">TaxLexis AI Assistant</div>
              <div className="text-[11px] text-primary-foreground/70">Online · Typically replies instantly</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', m.role === 'assistant' ? 'bg-primary/10 text-primary-onBg' : 'bg-accent text-accent-foreground')}>
                  {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', m.role === 'assistant' ? 'bg-muted text-foreground rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm')}>
                  <HtmlPreview
                    content={m.content}
                    className={cn(
                      'max-w-none [&_p]:my-1',
                      m.role === 'assistant'
                        ? 'prose prose-sm dark:prose-invert text-foreground'
                        : 'prose prose-sm text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-a:text-primary-foreground',
                    )}
                  />
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary-onBg flex items-center justify-center shrink-0"><Bot className="h-4 w-4" /></div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                  <span className="inline-flex gap-1"><span className="animate-bounce">â—</span><span className="animate-bounce" style={{ animationDelay: '0.15s' }}>â—</span><span className="animate-bounce" style={{ animationDelay: '0.3s' }}>â—</span></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => send(q)} className="text-xs border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors">{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            className="border-t p-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || typing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
