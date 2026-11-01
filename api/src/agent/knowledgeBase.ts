/**
 * ZOQQ Card Program Knowledge Base
 * Injected into the AI agent's system prompt for accurate, program-specific responses.
 */

export const KNOWLEDGE_BASE = `
## ZOQQ Card Program — Complete Reference

### About ZOQQ
ZOQQ is a digital banking platform that provides USD-denominated prepaid cards (virtual and physical) to businesses and individuals. Cards are issued under the ZOQQ card program and can be used globally for online and in-store purchases wherever the card scheme (Visa/Mastercard) is accepted.

---

### Card Types

**Virtual Card**
- Digital-only card, no physical component
- Created instantly upon request
- Used for online transactions
- Creation fee: $1.00 (of which $0.50 is the card issuance cost)
- Default per-transaction limit: $10,000
- Supports multiple transactions

**Physical Card**
- Traditional plastic card with chip
- Must be assigned to cardholder by admin/ops team
- Requires activation with activation code + PIN setup
- Can be used for in-store (POS) and online transactions
- Assignment fee applies

---

### Fees

| Fee | Code | Amount | Type |
|-----|------|--------|------|
| Account activation | ACTCRC | $25.00 | One-time |
| Virtual card creation | ADVCARD | $1.00 | Per card |
| Physical card assignment | ADPCARD | Varies | Per card |
| Card top-up / recharge | VACTCR | $1.00 (of which $0.80 is processing) | Per load |
| Monthly maintenance | MOMTC | $3.00 | Monthly |
| Monthly transaction monitoring | MOMTV | $0.20 | Per transaction |
| Card-to-card transfer | C2C | ~1% | Percentage |
| Foreign exchange | FX | Varies | Percentage |
| Crypto deposit | CRYPTOLOAD | ~1% + $10 protocol fee | Per deposit |
| Local outbound transfer | LOCALOUT | Varies | Per transfer |

Note: Fees may vary. The user should check their portal fee schedule for exact current rates.

---

### Card Lifecycle

1. **Creation** — Virtual cards are created instantly. Physical cards are assigned by the admin team.
2. **Activation** — Virtual cards are active immediately. Physical cards require activation code + PIN.
3. **Active** — Card can be used for transactions. Funds can be loaded.
4. **Frozen/Blocked (Inactive)** — User or system can temporarily block the card. No transactions allowed. Can be unblocked.
5. **Closed** — Permanently closed. Cannot be reactivated. Remaining balance must be withdrawn first.

Users can:
- Block/unblock their card anytime
- Close a card permanently
- Update transaction limits
- Reset their PIN (physical cards)

---

### Onboarding Process

To get a ZOQQ card, a user must complete these steps:

1. **Sign Up** — Create account with email and password
2. **Cardholder Registration** — Provide:
   - Full legal name (first, middle, last)
   - Name on card (can differ from legal name)
   - Date of birth
   - Mobile number with country code
   - Full postal address (line1, city, state, postcode, country)
   - Employer details (optional)
3. **KYC Verification** — Complete identity verification:
   - eKYC via document upload (passport, national ID, or driving license)
   - Selfie verification
   - Address proof may be required
   - KYC status: PENDING → APPROVED or REJECTED
   - If rejected, user receives RFI (Request for Information) with reason
4. **Account Activation** — $25.00 activation fee charged
5. **Create Card** — Once KYC is approved, user can create virtual cards or get physical cards assigned

---

### Funding / Loading Cards

There are several ways to add funds:

**1. Crypto Deposit (Deposit Lite)**
- Supported networks: TRON (USDT), Ethereum (USDT, USDC)
- Minimum deposit: $50
- Fees: $10 protocol fee + ~1% loading fee
- Process: Generate deposit address → Send crypto → Funds credited after confirmation
- Status flow: WAITING → PROCESSING → SPLIT → FUNDED

**2. Wallet Load (PAUSE Protocol)**
- User signs a blockchain transaction (EIP-712 signature)
- Amount deposited to ZOQQ wallet
- Fee: $5 PAUSE fee deducted upfront
- Minimum: $25

**3. Card Recharge (From Wallet)**
- Transfer funds from ZOQQ wallet directly to card
- Instant credit
- Must have sufficient wallet balance
- Top-up fee: $1.00 per recharge

---

### Card-to-Card Transfer (P2P)

- Transfer funds between ZOQQ cards
- Both cards must be ACTIVE
- Source card must have sufficient balance
- Fee: ~1% of transfer amount
- Full audit trail maintained

---

### Card Transactions

When a card is used for a purchase:
- Transaction amount in merchant's currency
- Billing amount converted to card currency (USD)
- FX fee applied for non-USD transactions
- Each transaction includes: merchant name, category, city, country
- Transaction statuses: approved, pending, declined
- Balance updated in real-time after each transaction

---

### Wallet

- Each cardholder has one USD wallet
- Wallet holds funds that can be loaded onto any of their cards
- Wallet operations: deposit, withdraw, recharge card, view balance, view history
- Wallet has daily, weekly, monthly, and yearly limits

---

### Card Limits

Cards have configurable spending limits:
- **Per-transaction limit**: Maximum amount per single transaction (default: $10,000)
- **Daily limit**: Maximum total spending in 24 hours
- **Weekly limit**: Maximum total spending in 7 days
- **Monthly limit**: Maximum total spending in 30 days
- Users can request limit changes through their portal

---

### Security Features

- **Card PAN/CVV access**: Requires 3-layer verification:
  1. Email OTP (6-digit code)
  2. App PIN verification
  3. Short-lived access token (60 seconds)
- Card details displayed via secure iframe (never in plaintext)
- PIN never stored or transmitted in plaintext
- All API calls authenticated with Bearer tokens
- Session-based access with device binding
- SCA (Strong Customer Authentication) for sensitive operations

---

### Card Manager (AI Assistant — $5/month)

Card Manager is a premium subscription service ($5/month) that provides:
- **Card Health Reports** — Overview of all cards, statuses, balances, and alerts
- **Anomaly Detection** — Flags unusual transactions (3x above average or over $500)
- **Monthly Statements** — Detailed spending summaries with per-card breakdowns
- **AI Assistant** — Natural language chat via Telegram for card queries

Subscription is per-user and persists independently of portal sessions.

---

### Supported Currencies

- **Card currency**: USD (primary)
- **Wallet currency**: USD
- **Deposit tokens**: USDT (TRON, Ethereum), USDC (Ethereum)
- **Transaction currencies**: Any currency where the card scheme is accepted (auto-converted to USD with FX fee)

---

### Common Questions & Answers

**Q: How do I check my card balance?**
A: Ask me "what's my balance?" or "how are my cards?" and I'll fetch your real-time balances.

**Q: How long does a crypto deposit take?**
A: Typically 5-15 minutes depending on network congestion. TRON is usually faster than Ethereum.

**Q: Can I have multiple cards?**
A: Yes, you can have multiple virtual and physical cards under one account.

**Q: What happens if my card is declined?**
A: Common reasons: insufficient balance, card is frozen/blocked, transaction exceeds card limits, merchant category restricted, or card expired. Check your balance and card status first.

**Q: How do I freeze my card?**
A: Currently, card freeze/unfreeze must be done through the ZOQQ web portal. This feature will be available via the AI assistant in a future update.

**Q: Can I get a refund for a transaction?**
A: Refunds depend on the merchant. If a merchant processes a refund, it will appear as a credit on your card. Contact the merchant directly for refund requests.

**Q: What's the minimum amount I can load?**
A: Crypto deposits: $50 minimum. Wallet loads: $25 minimum.

**Q: Is there a monthly fee?**
A: Yes, there's a $3.00 monthly card maintenance fee per card.

**Q: Can I use my card internationally?**
A: Yes, ZOQQ cards work globally wherever the card scheme is accepted. An FX conversion fee applies for non-USD transactions.

**Q: How do I close my card?**
A: Card closure is permanent and must be done through the web portal. Make sure to spend or transfer your remaining balance first.

**Q: What is Card Manager?**
A: Card Manager is your personal AI card assistant ($5/month). It monitors your cards, detects suspicious activity, generates statements, and answers your questions via Telegram. You're using it right now!
`;
