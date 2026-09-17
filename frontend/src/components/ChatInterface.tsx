import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, AIChatResponse } from '../types';
import { ApiClient } from '../services/api';
import {
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Building2,
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'ASSISTANT' | 'USER';
  text: string;
  timestamp: string;
  intent?: string;
  toolsUsed?: string[];
  reasoningTrace?: string[];
  financialData?: Record<string, any>;
  status?: string;
}

interface ChatInterfaceProps {
  user: UserProfile;
  onOpenLedgerTab?: () => void;
}

const ROLE_PROMPTS: Record<string, string[]> = {
  STUDENT: [
    'What is my outstanding fee?',
    'Show my fee breakup',
    'How much have I paid?',
    'Show my receipt details',
    'What is my current demand?'
  ],
  PARENT: [
    "What is my ward's outstanding fee?",
    'Show fee breakup for my ward',
    'How much has been paid so far?',
    'Show receipt details'
  ],
  ACCOUNTS_OFFICER: [
    'Which OBC students in CSE are overdue and have exam clearance blocked?',
    'Show overdue students',
    'Show payment reconciliation exceptions',
    'Show unmatched bank transactions',
    'Show fee collection by program',
    'Give me a financial summary'
  ],
  FINANCE_APPROVER: [
    'Which OBC students in CSE are overdue and have exam clearance blocked?',
    'Show overdue students',
    'Explain this reconciliation mismatch',
    'Show unmatched bank transactions',
    'Give me a financial summary'
  ],
  MANAGEMENT: [
    'Which OBC students in CSE are overdue and have exam clearance blocked?',
    'Give me a financial summary',
    'Show fee collection by program',
    'Show overdue students',
    'Show reconciliation status'
  ],
  ADMIN: [
    'Which OBC students in CSE are overdue and have exam clearance blocked?',
    'Give me a financial summary',
    'Show overdue students',
    'Show reconciliation status',
    'Show unmatched bank transactions'
  ]
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onOpenLedgerTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ASSISTANT',
      text: `Hello ${user.full_name}! I am your **AI Fee & Finance Intelligence Assistant** for Vignan's University.\n\nI am connected directly to the deterministic financial core database with strict role-based access control. How can I assist you with financial inquiries today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePrompts, setActivePrompts] = useState<string[]>(
    ROLE_PROMPTS[user.role] || ROLE_PROMPTS['STUDENT']
  );
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleTrace = (msgId: string) => {
    setExpandedTraceIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const res = await ApiClient.post<AIChatResponse>('/ai/chat', { message: query });
      
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'ASSISTANT',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: res.intent,
        toolsUsed: res.tools_used,
        reasoningTrace: res.reasoning_trace,
        financialData: res.financial_data,
        status: res.status
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggested_prompts && res.suggested_prompts.length > 0) {
        setActivePrompts(res.suggested_prompts);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ASSISTANT',
        text: `⚠️ **Financial Query Notice:** ${err.message || 'Unable to complete AI financial query at this moment. Please check your network or try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'ERROR'
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFinancialDataWidget = (data?: Record<string, any>, toolsUsed?: string[]) => {
    if (!data) return null;
    const tool = (toolsUsed && toolsUsed[0]) || data.tool;

    // Student Fee Summary or Outstanding Card
    if (tool === 'get_outstanding_amount' || tool === 'get_student_fee_summary') {
      const gross = data.gross_demand || 0;
      const net = data.net_demand || 0;
      const paid = data.paid_amount || 0;
      const out = data.outstanding_amount || 0;
      const isOverdue = data.is_overdue || data.status === 'OVERDUE';

      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Ledger: {data.roll_no} ({data.name})
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isOverdue
                  ? 'bg-rose-900/80 text-rose-300 border border-rose-700'
                  : out === 0
                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-900/80 text-amber-300 border border-amber-700'
              }`}
            >
              {data.status || (isOverdue ? 'OVERDUE' : out === 0 ? 'PAID' : 'PARTIALLY_PAID')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Gross Demand</div>
              <div className="text-xs font-mono font-bold text-slate-200">₹{gross.toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Net Payable</div>
              <div className="text-xs font-mono font-bold text-blue-300">₹{net.toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Total Paid</div>
              <div className="text-xs font-mono font-bold text-emerald-300">₹{paid.toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Outstanding</div>
              <div className="text-xs font-mono font-bold text-amber-300">₹{out.toLocaleString()}</div>
            </div>
          </div>
        </div>
      );
    }

    // Itemized Fee Breakdown
    if (tool === 'get_fee_breakdown' && data.items) {
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-2.5 shadow-md">
          <div className="text-xs font-semibold text-brand-400 flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Itemized Fee Head Breakdown ({data.roll_no})</span>
            <span className="text-[10px] font-mono text-slate-400">Net: ₹{(data.net_demand || 0).toLocaleString()}</span>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {data.items.map((it: any, idx: number) => (
              <div key={idx} className="py-1.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200">{it.head_name}</span>
                  <span className="ml-1 text-[10px] text-slate-500 font-mono">(P{it.priority})</span>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <span className="text-slate-400">₹{it.gross_amount.toLocaleString()}</span>
                  <span className="mx-1 text-slate-600">|</span>
                  <span className={it.outstanding_amount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    Due: ₹{it.outstanding_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Overdue Students Summary
    if (tool === 'get_overdue_students' && data.students) {
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Overdue Students ({data.total_overdue_count} total)
            </span>
            <span className="text-xs font-mono font-bold text-rose-300">
              Total Due: ₹{(data.total_overdue_amount || 0).toLocaleString()}
            </span>
          </div>
          <div className="space-y-1.5">
            {data.students.slice(0, 4).map((s: any, idx: number) => (
              <div key={idx} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{s.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-brand-400">[{s.roll_no}]</span>
                  <span className="ml-1 text-[10px] text-slate-400">({s.program})</span>
                </div>
                <div className="font-mono font-bold text-rose-300 text-xs">
                  ₹{s.outstanding_amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Reconciliation Status Widget
    if (tool === 'get_reconciliation_status') {
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              Bank Reconciliation Health
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data.reconciliation_health === 'RECONCILED' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'}`}>
              {data.reconciliation_health}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Feed Transactions</div>
              <div className="font-mono font-bold text-slate-200">{data.total_bank_transactions}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Unmatched</div>
              <div className="font-mono font-bold text-amber-300">{data.unmatched_transactions}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="text-[10px] text-slate-400">Exceptions</div>
              <div className="font-mono font-bold text-rose-300">{data.open_mismatches_count}</div>
            </div>
          </div>
        </div>
      );
    }

    // Institutional Financial Overview
    if (tool === 'get_financial_summary' && data.scope === 'INSTITUTIONAL_CORE') {
      return (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand-400" />
              Institutional Core Financials ({data.total_students} Students)
            </span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {data.collection_rate_percentage}% Collected
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400">Gross Demand</div>
              <div className="text-xs font-mono font-bold text-slate-200">₹{(data.total_gross_demand || 0).toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400">Net Demand</div>
              <div className="text-xs font-mono font-bold text-blue-300">₹{(data.total_net_demand || 0).toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400">Total Collected</div>
              <div className="text-xs font-mono font-bold text-emerald-300">₹{(data.total_collected || 0).toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-[10px] text-slate-400">Total Due</div>
              <div className="text-xs font-mono font-bold text-amber-300">₹{(data.total_outstanding || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      );
    }

    // Multi-Filter Planner Results Widget
    if (tool === 'multi_filter_planner' || (data && data.tool === 'multi_filter_planner')) {
      const sample = data.sample || [];
      const count = data.matched_count !== undefined ? data.matched_count : sample.length;
      return (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-brand-400" />
              Multi-Filter Matched Cohort
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {count} Matched
            </span>
          </div>
          {sample.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {sample.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span>{s.name}</span>
                      <span className="text-[10px] font-mono text-brand-300 px-1 rounded bg-brand-950/80 border border-brand-800">{s.roll_no}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {s.program} • {s.category} {s.clearance_status ? `• ${s.clearance_status}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-300">₹{(s.outstanding || 0).toLocaleString()}</div>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      s.status === 'OVERDUE' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      s.status === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">No individual student records in this filtered set.</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)] bg-[#0B0F17] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Fee & Finance Intelligence Agent</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Deterministic Core
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Role: <span className="font-semibold text-brand-400">{user.role}</span> • Scoped Financial Database
            </p>
          </div>
        </div>

        {onOpenLedgerTab && (
          <button
            onClick={onOpenLedgerTab}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
            <span>Open Database Ledger</span>
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'USER'
                  ? 'bg-brand-600 text-white shadow-md rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg rounded-tl-none'
              }`}
            >
              {/* Header inside assistant bubble */}
              {m.sender === 'ASSISTANT' && (
                <div className="flex items-center justify-between mb-2 text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1 font-semibold text-brand-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Agent 40 Financial Core
                  </span>
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <span className="font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      {m.toolsUsed.length > 1 ? `${m.toolsUsed.length} Tools Chained` : `Tool: ${m.toolsUsed[0]}`}
                    </span>
                  )}
                </div>
              )}

              {/* Message Content with simple Markdown bolding & linebreaks */}
              <div className="whitespace-pre-line space-y-1">
                {m.text}
              </div>

              {/* Collapsible Reasoning Trace Panel */}
              {m.reasoningTrace && m.reasoningTrace.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-indigo-900/60 bg-indigo-950/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleTrace(m.id)}
                    className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      How I found this ({m.reasoningTrace.length} reasoning steps)
                    </span>
                    {expandedTraceIds[m.id] ? (
                      <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>

                  {expandedTraceIds[m.id] && (
                    <div className="p-3 pt-1 border-t border-indigo-900/40 space-y-2 text-[11px] bg-slate-950/60">
                      <div className="space-y-1.5">
                        {m.reasoningTrace.map((stepText, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2 text-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-200 font-mono text-[9px] font-bold shrink-0 mt-0.5">
                              Step {sIdx + 1}
                            </span>
                            <span className="font-mono text-[10.5px] leading-relaxed text-slate-200">
                              {stepText}
                            </span>
                          </div>
                        ))}
                      </div>
                      {m.toolsUsed && m.toolsUsed.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Tools Chained:</span>
                          {m.toolsUsed.map((tName, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-full bg-slate-800 text-[9px] font-mono text-indigo-300 border border-indigo-800/50">
                              {tName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Structured Financial Card Widget if available */}
              {renderFinancialDataWidget(m.financialData, m.toolsUsed)}

              {/* Timestamp */}
              <div className={`mt-2 text-[10px] text-right ${m.sender === 'USER' ? 'text-brand-200' : 'text-slate-500'}`}>
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {/* Loading / Thinking Indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-800 text-slate-300 text-xs shadow-lg space-y-2">
              <div className="flex items-center space-x-2 text-brand-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Consulting Authoritative Financial Tools & Scoped Database...</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-5 py-2.5 bg-slate-900/40 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-brand-400" />
          Suggested:
        </span>
        {activePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-brand-900/60 hover:border-brand-500 text-slate-300 hover:text-white text-[11px] border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask financial questions (e.g., "${activePrompts[0] || 'What is my outstanding fee?'}")`}
            disabled={isProcessing}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Read-only assistant. Financial actions (refunds, reversals, waivers) require authorized staff approval.</span>
        </div>
      </div>
    </div>
  );
};
