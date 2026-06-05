import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertCircle, Loader2, X, CreditCard, ChevronRight, Check, QrCode, Smartphone, Info } from 'lucide-react';
import { billingService, GOOGLE_PLAY_PRODUCT_IDS } from '../lib/revenuecat';

interface GooglePlayBillingSheetProps {
  userId: string;
  tier: 'plus' | 'pro' | 'ultra' | null;
  priceText: string;
  onSuccess: (updatedTier: 'plus' | 'pro' | 'ultra') => void;
  onCancel: (errorMsg?: string) => void;
}

export const GooglePlayBillingSheet: React.FC<GooglePlayBillingSheetProps> = ({
  userId,
  tier,
  priceText,
  onSuccess,
  onCancel,
}) => {
  const [purchaseState, setPurchaseState] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentTab, setPaymentTab] = useState<'card' | 'upi'>('card');
  const [outcomeMode, setOutcomeMode] = useState<'approve' | 'decline'>('approve');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states - Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Form states - UPI
  const [upiId, setUpiId] = useState('');

  if (!tier) return null;

  const currentPlayProductId = GOOGLE_PLAY_PRODUCT_IDS[tier];

  // Helper formatting for Card Input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    let formatted = value.substring(0, 4);
    if (formatted.length > 2) {
      formatted = `${formatted.substring(0, 2)}/${formatted.substring(2)}`;
    }
    setCardExpiry(formatted);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCvv(value.substring(0, 3));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseState('processing');
    setErrorMessage(null);

    // Form input validation checks to provide professional visual guardrails
    if (paymentTab === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setErrorMessage('Verification Error: Card number must be 16 digits.');
        setPurchaseState('failed');
        return;
      }
      if (!cardName.trim()) {
        setErrorMessage('Verification Error: Cardholder name cannot be blank.');
        setPurchaseState('failed');
        return;
      }
      if (cardExpiry.length < 5) {
        setErrorMessage('Verification Error: Expiry date must match format MM/YY.');
        setPurchaseState('failed');
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMessage('Verification Error: CVV code must be 3 digits.');
        setPurchaseState('failed');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMessage('Verification Error: Please input a valid UPI Address (e.g. name@upi).');
        setPurchaseState('failed');
        return;
      }
    }

    try {
      const outcomeSetting: 'success' | 'decline' = outcomeMode === 'approve' ? 'success' : 'decline';

      const result = await billingService.purchaseProduct(userId, tier, outcomeSetting);
      if (result.success && result.tier) {
        setPurchaseState('success');
        setTimeout(() => {
          onSuccess(result.tier as 'plus' | 'pro' | 'ultra');
        }, 1200);
      } else {
        setErrorMessage(result.error || 'Payment transaction was declined.');
        setPurchaseState('failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected transaction error occurred.');
      setPurchaseState('failed');
    }
  };

  const handleResetOrCancel = () => {
    if (purchaseState === 'processing') return;
    onCancel(errorMessage || "User exited the interactive payment portal.");
  };

  const getTierTitle = () => {
    switch (tier) {
      case 'plus':
        return 'V-Astra Plus Upgrade';
      case 'pro':
        return 'V-Astra Pro Upgrade';
      case 'ultra':
        return 'V-Astra Ultra Upgrade';
      default:
        return 'Sonic Plan Subscription';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <div className="absolute inset-0" onClick={handleResetOrCancel} />

      <motion.div
        initial={{ y: "80%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "80%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-lg bg-neutral-900 border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden z-20 flex flex-col max-h-[96vh] sm:max-h-none text-white font-sans text-left"
      >
        {/* Top Header Badge bar */}
        <div className="bg-orange-600 px-5 py-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">Google Play Billing Gateway</span>
          </div>
          <button 
            type="button"
            onClick={handleResetOrCancel}
            disabled={purchaseState === 'processing'}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outer content container */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[80vh] sm:max-h-[640px]">
          {purchaseState === 'idle' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Product Info Board */}
              <div className="space-y-4 border-b border-white/5 pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-[#00E5A3] uppercase bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                      Play Store Verified SKU
                    </span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1">{getTierTitle()}</h3>
                    <p className="text-[11px] text-orange-400/80 font-mono font-bold">SKU ID: {currentPlayProductId}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{priceText}</div>
                    <div className="text-[10px] text-white/40 font-mono">vastra_music_{tier}</div>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex gap-2 text-white/70">
                  <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>This layout operates on active Google Play environment specifications triggering <code className="text-orange-300 font-mono text-[10px] bg-black/30 px-1 py-0.5 rounded">{currentPlayProductId}</code> through RevenueCat validation.</p>
                </div>
              </div>

              {/* Simulation Configuration Pill Switch (Approve vs Decline) */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block font-mono">
                  Test Simulation Outcome Code
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutcomeMode('approve')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border ${
                      outcomeMode === 'approve'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm'
                        : 'bg-transparent border-white/5 text-white/30 hover:text-white/50'
                    }`}
                  >
                    ● SIMULATE SUCCESS
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeMode('decline')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border ${
                      outcomeMode === 'decline'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 shadow-sm'
                        : 'bg-transparent border-white/5 text-white/30 hover:text-white/50'
                    }`}
                  >
                    ● SIMULATE DECLINE
                  </button>
                </div>
              </div>

              {/* Tab selector for Card/UPI */}
              <div className="grid grid-cols-2 gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setPaymentTab('card')}
                  className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    paymentTab === 'card'
                      ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/10'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('upi')}
                  className={`py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    paymentTab === 'upi'
                      ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/10'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI Payment</span>
                </button>
              </div>

              {/* Tab 1: Credit & Debit Cards Layout */}
              {paymentTab === 'card' && (
                <div className="space-y-5">
                  {/* Real-time Physical Card Mock Layout */}
                  <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-neutral-800 to-black border border-white/10 rounded-2xl p-5 shadow-inner overflow-hidden select-none">
                    {/* Glossy background pattern */}
                    <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
                    
                    <div className="h-full flex flex-col justify-between relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-mono tracking-widest text-orange-400 uppercase font-black">
                            V-Astra Creative Card
                          </p>
                          <div className="w-7 h-5 bg-amber-500/30 border border-amber-500/30 rounded-md mt-1" />
                        </div>
                        <CreditCard className="w-7 h-7 text-white/30" />
                      </div>

                      {/* Display 16 digit code */}
                      <div>
                        <p className="text-xs font-mono text-white/40 mb-1 tracking-widest uppercase">Card Number</p>
                        <p className="text-lg md:text-xl font-mono tracking-[0.18em] text-white font-semibold">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </p>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-mono text-white/40 uppercase">Cardholder</p>
                          <p className="text-xs font-mono tracking-wide text-white font-bold max-w-[180px] truncate uppercase">
                            {cardName || 'YOUR FULL NAME'}
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div className="space-y-0.5 text-right">
                            <p className="text-[8px] font-mono text-white/40 uppercase">Expires</p>
                            <p className="text-xs font-mono text-white font-bold uppercase">{cardExpiry || 'MM/YY'}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[8px] font-mono text-white/40 uppercase">CVV</p>
                            <p className="text-xs font-mono text-white font-bold">{cardCvv ? '•••' : 'CVV'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Input Grid */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                        Card Number
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4111 2222 3333 4444"
                        className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-center font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                          CVV Code
                        </label>
                        <input
                          type="password"
                          required
                          value={cardCvv}
                          onChange={handleCvvChange}
                          placeholder="123"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-center font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: UPI Payment Layout */}
              {paymentTab === 'upi' && (
                <div className="space-y-5">
                  {/* UPI Virtual Mobile Screen Interface */}
                  <div className="bg-gradient-to-br from-indigo-950/20 to-neutral-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">Direct Unified Payment Interface</h4>
                      <p className="text-xs text-white/40 leading-relaxed max-w-sm mx-auto">
                        Accepting instant checkout requests from leading UPI aggregators (GPay, PhonePe, Paytm, BHIM).
                      </p>
                    </div>

                    <div className="w-full max-w-[240px] aspect-square bg-white p-3 rounded-2xl border border-white/10 flex items-center justify-center relative shadow-lg">
                      {/* Simulated QR Code illustration with subtle themeing */}
                      <div className="absolute inset-4 border border-dashed border-black/10 rounded-lg flex flex-col items-center justify-center text-black">
                        <QrCode className="w-24 h-24 stroke-[1.25] text-neutral-800" />
                        <span className="text-[8px] font-mono tracking-widest font-black uppercase text-orange-500 mt-2">VSTRA UPI QR SCANNER</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
                      Enter UPI ID / Virtual Address
                    </label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okaxis"
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-mono"
                    />
                    <div className="flex gap-2 flex-wrap pt-1">
                      {['@okaxis', '@paytm', '@ybl', '@okhdfcbank'].map((suffix) => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            const coreSegment = upiId.split('@')[0] || 'vastra';
                            setUpiId(`${coreSegment}${suffix}`);
                          }}
                          className="bg-white/5 text-[9px] font-bold font-mono text-white/50 border border-white/5 px-2 px-2.5 py-1 rounded-md hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                        >
                          {suffix}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Secure note */}
              <div className="flex gap-2.5 bg-neutral-950 border border-white/5 p-4 rounded-2xl text-xs text-white/55">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <p>
                  Secured by **V-Astra Sandbox Node**. Transaction references are securely committed back under active user entitlements automatically.
                </p>
              </div>

              {/* Checkout CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 group"
                >
                  <span>Authorize Secure Mock Payment</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <p className="text-[9px] text-center text-white/25 font-mono mt-3 uppercase tracking-wider">
                  Test Transaction Environment • Security Class v3
                </p>
              </div>
            </form>
          )}

          {purchaseState === 'processing' && (
            <div className="py-16 text-center space-y-6">
              <Loader2 className="w-14 h-14 text-orange-500 animate-spin mx-auto stroke-[2.5]" />
              <div className="space-y-2">
                <p className="text-lg font-bold text-white tracking-tight uppercase">Processing Transaction...</p>
                <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
                  Communicating with RevenueCat entitlement processors and updating active Google account limits.
                </p>
              </div>
            </div>
          )}

          {purchaseState === 'success' && (
            <div className="py-16 text-center space-y-6 animate-pulse">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-emerald-400 stroke-[3px]" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-white uppercase tracking-tight">Payment Approved!</p>
                <p className="text-xs text-emerald-400 font-bold font-mono uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1 rounded-full max-w-xs mx-auto border border-emerald-500/20">
                  Plan Entitlement Complete
                </p>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto pt-2">
                  Enjoy your newly upgraded capabilities and unlimited track configurations immediately!
                </p>
              </div>
            </div>
          )}

          {purchaseState === 'failed' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-black text-white uppercase tracking-tight">Transaction Declined</p>
                  <p className="text-xs text-red-400 font-medium leading-relaxed max-w-sm mx-auto">
                    {errorMessage || 'Your billing request was dismissed by the Sandbox agent.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setPurchaseState('idle')}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                  Retry with different config
                </button>
                <button
                  type="button"
                  onClick={handleResetOrCancel}
                  className="w-full bg-transparent hover:bg-white/5 text-white/40 hover:text-white/60 font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                  Cancel and return to studio
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
