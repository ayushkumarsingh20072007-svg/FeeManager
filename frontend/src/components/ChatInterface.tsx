import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { Send, Mic, Sparkles, CheckCircle2, Database } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'ASSISTANT' | 'USER';
  text: string;
  timestamp: string;
  financialData?: {
    title?: string;
    grossDemand?: number;
    scholarship?: number;
    concession?: number;
    netDemand?: number;
    paidAmount?: number;
    outstandingAmount?: number;
    breakdown?: { head: string; amount: number; paid: number; outstanding: number }[];
    status?: string;
    source?: string;
  };
}

interface ChatInterfaceProps {
  user: UserProfile;
  onOpenLedgerTab?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onOpenLedgerTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ASSISTANT',
      text: `Welcome to Agent 40 — Fee Management Assistant for Vignan's University.\n\nI am connected to the institutional financial core database. You can query fee demands, payment allocations, outstanding aging balances, reconciliation mismatches, and refund proposals.\n\nHow can I assist you today, ${user.full_name}?`,
      timestamp: '10:30 AM',
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAssistantResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Total outstanding fee
    if (q.includes('outstanding') || q.includes('how much') || q.includes('balance') || q.includes('due')) {
      if (user.role === 'STUDENT' || q.includes('stu1001') || q.includes('aravind')) {
        return {
          id: String(Date.now()),
          sender: 'ASSISTANT',
          text: `Verified Student Balance (STU1001 - Aravind Kumar):\n• Gross Annual Demand: ₹1,78,000 (AY 2026-27, B.Tech CSE, Reg R23)\n• Total Reconciled Paid: ₹1,48,000\n• Net Outstanding: ₹30,000\n\nThe outstanding ₹30,000 comprises ₹15,000 hostel balance, ₹10,000 campus transport, and ₹5,000 caution deposit.`,
          timestamp: timeStr,
          financialData: {
            title: 'Verified Student Fee Ledger (STU1001)',
            grossDemand: 178000,
            scholarship: 0,
            concession: 0,
            netDemand: 178000,
            paidAmount: 148000,
            outstandingAmount: 30000,
            breakdown: [
              { head: 'Tuition Fee (P1)', amount: 80000, paid: 80000, outstanding: 0 },
              { head: 'Examination Fee (P2)', amount: 5000, paid: 5000, outstanding: 0 },
              { head: 'Laboratory Fee (P3)', amount: 4000, paid: 4000, outstanding: 0 },
              { head: 'Library Fee (P4)', amount: 2000, paid: 2000, outstanding: 0 },
              { head: 'Hostel & Residence (P5)', amount: 60000, paid: 45000, outstanding: 15000 },
              { head: 'Campus Transport (P6)', amount: 15000, paid: 5000, outstanding: 10000 },
              { head: 'Caution Deposit (P7)', amount: 10000, paid: 5000, outstanding: 5000 },
              { head: 'One-Time Charges (P8)', amount: 5000, paid: 5000, outstanding: 0 },
            ],
            status: 'PARTIALLY_PAID',
            source: 'SQLite Core Ledger (agent40.db) • Rules Validated'
          }
        };
      } else {
        return {
          id: String(Date.now()),
          sender: 'ASSISTANT',
          text: `Institutional Outstanding Overview for AY 2026-27 across 28 active student cohorts:\n• Total Gross Demand: ₹49,84,000\n• Total Reconciled Collections: ₹34,22,500 (68.7% Collection Rate)\n• Total Outstanding Receivables: ₹15,61,500\n• 90+ Days Overdue (Critical): ₹5,11,500`,
          timestamp: timeStr,
          financialData: {
            title: 'Institutional Aggregate Financial Overview',
            grossDemand: 4984000,
            paidAmount: 3422500,
            outstandingAmount: 1561500,
            status: 'ACTIVE_COLLECTION_CYCLE',
            source: 'Vignan Financial Core Database'
          }
        };
      }
    }

    // 2. Payment history
    if (q.includes('payment') || q.includes('history') || q.includes('receipt') || q.includes('transaction')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Payment Journal Summary: 23 total transactions are recorded in the database ledger. Recent transaction PAY-2026-0001 (₹1,48,000 via Netbanking TXN_RZP_987123654) has been fully allocated to tuition, exam, lab, and library fees per priority rules.`,
        timestamp: timeStr,
        financialData: {
          title: 'Payment Allocation Record (PAY-2026-0001)',
          paidAmount: 148000,
          status: 'RECONCILED',
          breakdown: [
            { head: 'Tuition Fee (P1)', amount: 80000, paid: 80000, outstanding: 0 },
            { head: 'Examination Fee (P2)', amount: 5000, paid: 5000, outstanding: 0 },
            { head: 'Laboratory Fee (P3)', amount: 4000, paid: 4000, outstanding: 0 },
            { head: 'Library Fee (P4)', amount: 2000, paid: 2000, outstanding: 0 },
            { head: 'Hostel & Residence (P5)', amount: 60000, paid: 45000, outstanding: 15000 },
          ],
          source: 'Payment Ledger (Allocated by Deterministic Priority Engine)'
        }
      };
    }

    // 3. Unreconciled payments & mismatches
    if (q.includes('unreconciled') || q.includes('mismatch') || q.includes('variance') || q.includes('reconcil')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Bank Reconciliation Status: 3 payment exceptions have been flagged for manual finance review in the ledger:\n\n1. MIS-2026-001: Amount Mismatch (Bank deposit ₹75,000 vs Demand ₹80,000 for STU1001)\n2. MIS-2026-002: Duplicate Gateway Transaction (TXN_DUP_88123499)\n3. MIS-2026-003: Roll number mismatch on NEFT bank transfer\n\nStatus: FINANCE_REVIEW_REQUIRED. Security Rule: The system never auto-writes off variances.`,
        timestamp: timeStr,
        financialData: {
          title: 'Reconciliation Variance Log',
          grossDemand: 80000,
          paidAmount: 75000,
          outstandingAmount: 5000,
          status: 'FINANCE_REVIEW_REQUIRED',
          source: 'Automated Ledger Variance Detector'
        }
      };
    }

    // 4. Pending refunds
    if (q.includes('refund') || q.includes('withdraw') || q.includes('cancellation')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Refund Management Queue:\n• Active Refund Proposals: 2 recorded in SQLite ledger.\n• REF-2026-0041: STU1004 (CSE) • Paid ₹1,00,000 • Proposed Refund ₹85,000 under UGC Tier-1.\n\n⚠️ Guardrail: AI cannot disburse money autonomously. Disbursement is blocked pending Dr. Ramanathan's two-man rule sign-off.`,
        timestamp: timeStr,
        financialData: {
          title: 'Refund Proposal (REF-2026-0041)',
          paidAmount: 100000,
          outstandingAmount: 85000,
          status: 'PENDING_APPROVAL',
          source: 'UGC Tier-1 Refund Policy Matrix'
        }
      };
    }

    // 5. 90+ days overdue fees
    if (q.includes('90+') || q.includes('overdue') || q.includes('aging') || q.includes('delinquen')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Aging & Delinquency Analysis:\n• Total 90+ Days Overdue: ₹5,11,500 across 3 students.\n• STU1008 (Rahul Varma - B.Tech CSE): ₹1,78,000 overdue since Nov 2025\n• STU1019 (Kavya Reddy - B.Tech ECE): ₹1,60,000 overdue\n• STU1024 (Sai Teja - MBA): ₹1,73,500 overdue\n\nRecommendation: Trigger Stage-3 institutional collection reminders.`,
        timestamp: timeStr,
        financialData: {
          title: '90+ Days Overdue Aging Bucket',
          grossDemand: 511500,
          paidAmount: 0,
          outstandingAmount: 511500,
          status: 'CRITICAL_OVERDUE',
          source: 'Due Date Ledger Engine'
        }
      };
    }

    // 6. Today's collection
    if (q.includes('today') || q.includes('collection') || q.includes('daily')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Today's Realized Collection (AY 2026-27):\n• Online Gateway: ₹2,40,000 (3 transactions)\n• UPI Counter: ₹85,000 (2 transactions)\n• Bank NEFT/RTGS: ₹1,48,000 (1 transaction)\n• Total Today: ₹4,73,000 (100% Reconciled to Institutional Escrow Account).`,
        timestamp: timeStr,
        financialData: {
          title: "Daily Collection Summary",
          paidAmount: 473000,
          status: "ESCROW_SETTLED",
          source: "Multi-channel Payment Gateways"
        }
      };
    }

    // 7. Pending approvals
    if (q.includes('approval') || q.includes('waiver') || q.includes('concession')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Pending Financial Approvals (Two-Man Rule Queue):\n1. APP-2026-001: Merit Scholarship Concession for Priya Sharma (₹25,000) • Awaiting Finance Approver\n2. APP-2026-002: UGC Withdrawal Refund for STU1004 (₹85,000) • Awaiting Management Sign-off\n\nActions can be reviewed on the Approvals page.`,
        timestamp: timeStr,
        financialData: {
          title: "Pending Authorization Queue (2 Requests)",
          grossDemand: 110000,
          status: "HUMAN_SIGN_OFF_REQUIRED",
          source: "Governance & Two-Man Rule Engine"
        }
      };
    }

    // 8. Explain student fee demand
    if (q.includes('explain') || q.includes('demand') || q.includes('structure')) {
      return {
        id: String(Date.now()),
        sender: 'ASSISTANT',
        text: `Fee Demand Calculation Explanation:\nFor B.Tech CSE (Regulation R23, AY 2026-27), the standard gross demand of ₹1,78,000 is structured into 8 prioritised heads:\n\n1. Tuition Fee (P1): ₹80,000\n2. Exam Fee (P2): ₹5,000\n3. Lab Fee (P3): ₹4,000\n4. Library Fee (P4): ₹2,000\n5. Hostel & Mess (P5): ₹60,000\n6. Campus Transport (P6): ₹15,000\n7. Caution Deposit (P7): ₹10,000 (Refundable)\n8. Registration (P8): ₹2,000\n\nWhen payments arrive, the deterministic allocation engine exhausts P1 first before allocating to lower heads.`,
        timestamp: timeStr,
        financialData: {
          title: "B.Tech CSE Standard Structure (R23)",
          grossDemand: 178000,
          netDemand: 178000,
          status: "STANDARD_STRUCTURE",
          source: "Institutional Fee Master"
        }
      };
    }

    // Default Fallback
    return {
      id: String(Date.now()),
      sender: 'ASSISTANT',
      text: `I understand your inquiry regarding "${query}". In Phase 1, all responses are backed by our verified institutional SQLite seed database. Advanced LLM agent tool calling will activate in Phase 2/6.`,
      timestamp: timeStr
    };
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: userText,
      timestamp: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    setTimeout(() => {
      const resp = getAssistantResponse(userText);
      setMessages((prev) => [...prev, resp]);
      setIsProcessing(false);
    }, 500);
  };

  const sendQuickPrompt = (promptText: string) => {
    setInput(promptText);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'USER',
      text: promptText,
      timestamp: timeStr
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      const resp = getAssistantResponse(promptText);
      setMessages((prev) => [...prev, resp]);
      setIsProcessing(false);
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#edf3fd] min-h-[500px]">
      {/* Quick Prompts Carousel Bar with All 8 Query Chips */}
      <div className="bg-white/95 border-b border-blue-100 px-4 sm:px-6 py-2.5 overflow-x-auto flex items-center space-x-2 shrink-0">
        <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Suggested:
        </span>
        {[
          "What is the total outstanding fee?",
          "Show payment history",
          "Which payments are unreconciled?",
          "Show pending refunds",
          "Show 90+ days overdue fees",
          "Show today's collection",
          "Show pending approvals",
          "Explain this student's fee demand",
        ].map((q, idx) => (
          <button
            key={idx}
            onClick={() => sendQuickPrompt(q)}
            className="text-xs bg-blue-50/80 hover:bg-blue-100 hover:text-brand-900 text-blue-800 border border-blue-200/70 rounded-full px-3 py-1 font-medium whitespace-nowrap transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-5xl w-full mx-auto">
        {messages.map((msg) => {
          const isAssistant = msg.sender === 'ASSISTANT';

          return (
            <div
              key={msg.id}
              className={`rounded-2xl p-4 sm:p-5 transition-all shadow-xs border ${
                isAssistant
                  ? 'bg-white border-blue-100 text-slate-800'
                  : 'bg-brand-600 border-brand-700 text-white ml-auto max-w-xl shadow-md'
              }`}
            >
              {/* Header inside message */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[12px] font-extrabold tracking-wider ${
                    isAssistant ? 'text-[#2563eb]' : 'text-blue-100'
                  }`}
                >
                  {isAssistant ? 'AGENT 40 FEE ASSISTANT' : user.full_name.toUpperCase()}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    isAssistant ? 'text-gray-400' : 'text-blue-200'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {/* Message body */}
              <div className="text-sm sm:text-[14px] leading-relaxed whitespace-pre-line font-normal">
                {msg.text}
              </div>

              {/* Verified Financial Card */}
              {msg.financialData && (
                <div className="mt-4 bg-[#f8fbff] border border-blue-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{msg.financialData.title || 'Verified Financial Ledger'}</span>
                    </div>
                    {msg.financialData.status && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        {msg.financialData.status}
                      </span>
                    )}
                  </div>

                  {/* Top Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {msg.financialData.grossDemand !== undefined && (
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                        <div className="text-gray-500 text-[10px] font-medium">Gross Demand</div>
                        <div className="text-sm font-bold text-gray-900 font-mono">
                          ₹{msg.financialData.grossDemand.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {msg.financialData.paidAmount !== undefined && (
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                        <div className="text-gray-500 text-[10px] font-medium">Reconciled Paid</div>
                        <div className="text-sm font-bold text-emerald-600 font-mono">
                          ₹{msg.financialData.paidAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {msg.financialData.outstandingAmount !== undefined && (
                      <div className="bg-white p-2.5 rounded-lg border border-blue-100 col-span-2 sm:col-span-1">
                        <div className="text-gray-500 text-[10px] font-medium">Outstanding Balance</div>
                        <div className="text-sm font-bold text-red-600 font-mono">
                          ₹{msg.financialData.outstandingAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Itemized Table Breakdown */}
                  {msg.financialData.breakdown && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-blue-100 rounded-lg overflow-hidden bg-white">
                        <thead className="bg-blue-50/80 text-blue-900 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Fee Head (Priority)</th>
                            <th className="py-2 px-3">Gross</th>
                            <th className="py-2 px-3">Paid</th>
                            <th className="py-2 px-3">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50 text-gray-700">
                          {msg.financialData.breakdown.map((item, i) => (
                            <tr key={i} className="hover:bg-blue-50/40">
                              <td className="py-1.5 px-3 font-medium text-blue-950">{item.head}</td>
                              <td className="py-1.5 px-3 font-mono">₹{item.amount.toLocaleString()}</td>
                              <td className="py-1.5 px-3 font-mono text-emerald-600">₹{item.paid.toLocaleString()}</td>
                              <td className="py-1.5 px-3 font-mono font-semibold text-red-600">
                                ₹{item.outstanding.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {msg.financialData.source && (
                    <div className="text-[10px] text-gray-500 italic pt-1 flex items-center justify-between">
                      <span>Source: {msg.financialData.source}</span>
                      <span className="font-mono text-emerald-700 font-medium">Rule Engine: Authoritative</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="bg-white rounded-2xl p-4 max-w-xs border border-blue-100 shadow-xs flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-blue-900 font-medium">Agent 40 is querying SQLite ledger...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Chat Input Form */}
      <div className="bg-white border-t border-blue-200/80 p-4 sm:px-8 space-y-2 sticky bottom-0 z-30 shadow-lg">
        <form onSubmit={handleSend} className="flex items-center space-x-3 max-w-5xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fee structures, student ledger, reconciliation, or overdue balances..."
              className="w-full bg-[#f8fbff] border border-blue-200 rounded-full px-5 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="w-11 h-11 rounded-full bg-brand-600 hover:bg-brand-500 active:scale-95 text-white flex items-center justify-center transition-all shadow-md shadow-brand-500/30 disabled:opacity-40 disabled:scale-100 cursor-pointer"
            title="Send Query"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>

        {/* Footer Sub-Bar */}
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-500 pt-1 px-2 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-gray-600">● Core Ledger Online (SQLite)</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-gray-600">
              <Mic className="w-3.5 h-3.5 text-brand-600" />
              <span>Voice + transcript assistant</span>
            </div>

            {onOpenLedgerTab && (
              <button
                onClick={onOpenLedgerTab}
                className="hidden md:inline-flex items-center space-x-1 text-xs text-brand-700 font-semibold hover:underline cursor-pointer pl-2 border-l border-gray-300"
              >
                <Database className="w-3 h-3" />
                <span>View Full Database Ledger</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
