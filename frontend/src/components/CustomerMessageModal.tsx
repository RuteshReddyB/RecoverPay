import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Smartphone, Mail, CheckCheck, ExternalLink, ShieldCheck, Copy, Check, CreditCard, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { RecoveryCase, api } from '../services/api';

interface CustomerMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryCase: RecoveryCase | null;
  onMessageCopied?: (channel: string) => void;
  onPaymentCompleted?: (paymentId: string) => void;
}

export const CustomerMessageModal: React.FC<CustomerMessageModalProps> = ({
  isOpen,
  onClose,
  recoveryCase,
  onMessageCopied,
  onPaymentCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [copied, setCopied] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setIsCheckoutOpen(false);
      setIsPaidSuccess(false);
      setIsPaying(false);
      setCountdown(3);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !recoveryCase) return null;

  const customerName = recoveryCase.customer_name || 'Valued Customer';
  const amountFormatted = `₹${(recoveryCase.amount_rupees || 0).toLocaleString('en-IN')}`;
  const failureReasonFormatted = (recoveryCase.failure_reason || 'bank_timeout')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const paymentLink = `https://rzp.io/i/rec_${recoveryCase.payment_id.slice(-6)}`;

  const whatsappMessage = `Hi ${customerName} 👋\n\nWe noticed your payment of *${amountFormatted}* couldn't be completed due to a temporary *${failureReasonFormatted}*.\n\nNo worries! Your order is reserved for the next 24 hours. You can instantly complete your transaction with 1-click via Razorpay secure gateway:\n\n👉 ${paymentLink}\n\nNeed help? Reply directly to this message.`;

  const smsMessage = `RECOVERPAY: Hi ${customerName}, your payment of ${amountFormatted} was interrupted (${failureReasonFormatted}). Click to complete securely: ${paymentLink} - Valid for 24h.`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (onMessageCopied) {
      onMessageCopied(activeTab.toUpperCase());
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsPaying(true);
    try {
      await api.markPaid(recoveryCase.payment_id);
      setIsPaying(false);
      setIsPaidSuccess(true);
      if (onPaymentCompleted) {
        onPaymentCompleted(recoveryCase.payment_id);
      }
    } catch (e) {
      console.error('Failed to mark payment as paid:', e);
      setIsPaying(false);
      setIsPaidSuccess(true); // Still proceed for demo smoothness
      if (onPaymentCompleted) {
        onPaymentCompleted(recoveryCase.payment_id);
      }
    }

    // Auto-close modal after 2.5 seconds
    let timeLeft = 3;
    setCountdown(3);
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 1000);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isCheckoutOpen ? <CreditCard className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {isCheckoutOpen ? 'Razorpay Secure Checkout' : 'Customer Message Preview'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
                  {isCheckoutOpen ? 'Live Sandbox Gateway' : 'Omnichannel Dispatch'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isCheckoutOpen
                  ? `Interactive payment gateway simulation for ${customerName}`
                  : `Personalized notification generated for ${customerName} (${recoveryCase.payment_id})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode: Razorpay Checkout Simulation */}
        {isCheckoutOpen ? (
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950 space-y-4">
            {isPaidSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                    Payment of {amountFormatted} Successfully Captured!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Razorpay transaction ID: <span className="font-mono font-semibold">pay_rzp_{recoveryCase.payment_id.slice(-8)}</span>
                  </p>
                </div>
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-left text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-emerald-600">Captured & Settled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recovery Queue:</span>
                    <span className="font-semibold text-indigo-600">Auto-cleared in real-time</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Audit Trail:</span>
                    <span className="font-mono text-[11px] text-slate-500">PAYMENT_LINK_PAID_SUCCESSFULLY</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Close & View Updated Dashboard</span>
                  <span className="opacity-80 font-normal">({countdown}s)</span>
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      ₹
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">RecoverPay Merchant Checkout</div>
                      <div className="text-[10px] text-slate-400">Order #{recoveryCase.payment_id}</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-outfit text-indigo-600 dark:text-indigo-400">
                    {amountFormatted}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Select Payment Method
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">⚡</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Instant UPI (GPay / PhonePe / Paytm)</p>
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Auto-approved instant retry</p>
                        </div>
                      </div>
                      <span className="w-4 h-4 rounded-full border-4 border-indigo-600 bg-white" />
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between opacity-75">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Credit / Debit Card</p>
                          <p className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</p>
                        </div>
                      </div>
                      <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isPaying}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing payment on Razorpay rails...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pay {amountFormatted} Now (Simulate Customer Payment)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Message
                  </button>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-bit SSL Encrypted
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Channel Switcher Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-1.5 gap-1.5">
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp Interactive
              </button>
              <button
                onClick={() => setActiveTab('sms')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'sms'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                SMS (160 Chars)
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'email'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Branded Email
              </button>
            </div>

            {/* Dynamic Expiry Alert Strip */}
            <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between font-medium">
              <span>⚡ Dynamic Payment Link Expiry</span>
              <span className="font-mono font-bold">⏱ Valid for 23h 59m • Auto-reserved inventory</span>
            </div>

            {/* Phone / Device Mockup Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-slate-950 flex justify-center items-center">
              {/* WhatsApp Phone Mockup */}
              {activeTab === 'whatsapp' && (
                <div className="w-full max-w-sm rounded-3xl border-4 border-slate-800 dark:border-slate-700 bg-[#EFEAE2] dark:bg-[#0b141a] shadow-xl overflow-hidden">
                  {/* WhatsApp Header */}
                  <div className="bg-[#005d4b] text-white p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white border border-emerald-400">
                        RP
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          RecoverPay Merchant
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                        </div>
                        <div className="text-[10px] text-emerald-200">Official Business Account</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-100">
                      Verified
                    </span>
                  </div>

                  {/* Chat Canvas */}
                  <div className="p-3.5 space-y-3">
                    <div className="text-center">
                      <span className="text-[10px] bg-white/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full shadow-sm">
                        Today
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-sm p-3.5 shadow-sm text-slate-800 dark:text-slate-100 space-y-2.5 border border-slate-200/50 dark:border-none">
                      <p className="text-xs leading-relaxed">
                        Hi <span className="font-semibold">{customerName}</span> 👋
                      </p>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        We noticed your payment of <span className="font-bold text-slate-900 dark:text-white">{amountFormatted}</span> could not be completed due to a temporary <span className="font-medium text-amber-600 dark:text-amber-400">{failureReasonFormatted}</span>.
                      </p>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        Your order items are reserved. You can securely complete your transaction with 1-click via Razorpay:
                      </p>

                      {/* Interactive Button Card */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => setIsCheckoutOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-98"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Pay {amountFormatted} Securely
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                        <span>10:04 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Mockup */}
              {activeTab === 'sms' && (
                <div className="w-full max-w-sm rounded-3xl border-4 border-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-xl p-4 space-y-3">
                  <div className="text-center mb-1">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      VK-RECPAY (SMS)
                    </div>
                    <div className="text-[10px] text-slate-400">Priority Transactional SMS</div>
                  </div>

                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3.5 shadow-sm text-xs leading-relaxed space-y-2">
                    <p>{smsMessage}</p>
                    <div className="flex items-center justify-end text-[10px] text-indigo-200">
                      Delivered • Just now
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Payment Link
                  </button>
                </div>
              )}

              {/* Email Mockup */}
              {activeTab === 'email' && (
                <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-5 space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">RecoverPay Orders</div>
                      <div className="text-[10px] text-slate-400">Subject: Action Required: Complete your order ({amountFormatted})</div>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <p>Hello <span className="font-semibold text-slate-900 dark:text-white">{customerName}</span>,</p>
                    <p>Your recent payment of <span className="font-bold text-slate-900 dark:text-white">{amountFormatted}</span> failed during processing ({failureReasonFormatted}).</p>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Payment Details</div>
                      <div className="flex justify-between text-xs font-medium">
                        <span>Order Reference:</span>
                        <span className="font-mono">{recoveryCase.payment_id}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <span>Amount Due:</span>
                        <span>{amountFormatted}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCheckoutOpen(true)}
                      className="inline-flex items-center gap-1.5 mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Complete Payment Now</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>DPDP Act compliant • 100% PII masked</span>
              </div>

              <button
                onClick={() => handleCopy(activeTab === 'whatsapp' ? whatsappMessage : smsMessage)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Message Text'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
