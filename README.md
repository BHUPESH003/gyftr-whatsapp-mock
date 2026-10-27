# Gyftr WhatsApp voucher journey (mock)

A clickable React mock of the Gyftr voucher bot on WhatsApp. It shows the hybrid approach:
browse in chat, check out in a WhatsApp Flow, pay on a web page.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. Use the panel on the left to switch between:

- **User starts chat** and **Marketing banner** (the banner skips browsing and opens Brand A with offer `WELCOME10`)
- **Buttons + Flow** and **Menu fallback** (plain numbered replies, for when Flows are not available)
- Points balance: 2,500 (covers the order), 150 (shows Points + online), 0 (online only)

Demo values: points OTP is `123456`. Any `name@bank` works as a UPI ID.

## The journey

1. Entry: user says hi, or taps a marketing template banner.
2. Main menu: Buy a voucher, Track order, Check balance (three buttons, the WhatsApp maximum).
3. Browse: brand carousel plus a category list. "View" sends a quick reply, then a message with a "Buy voucher" button that opens the Flow.
4. Flow (3 screens): denomination, quantity and gift details, then payment mode, then summary.
5. Payment mode:
   - **Points**: OTP typed in the chat, voucher issued straight away.
   - **Pay online**: "View offers and pay" button opens the web view.
   - **Points + online**: OTP for the points part, then the web view for the rest.
6. Web view: lists the offer per method.
   - **UPI**: closes and a UPI payment request message lands in the chat.
   - **Card or netbanking**: goes straight to the bank or gateway page, then back to the chat.
7. Voucher message with copyable codes. Track order and balance work at any time.

## Where things live

| File | What it does |
| --- | --- |
| `src/useBot.js` | All conversation logic for both modes, payment sequencing |
| `src/data.js` | Brands, offers, pricing rules, seed orders. Swap for real Gyftr APIs here |
| `src/components/Chat.jsx` | Renders every WhatsApp message type |
| `src/components/FlowSheet.jsx` | The Flow screens |
| `src/components/WebView.jsx` | Offers page, UPI path, bank or gateway redirect |

## Assumptions to confirm with Gyftr

- The UPI "request message" is modelled as a collect-style request sent to the customer's UPI ID. The approve and decline buttons in the chat are demo-only stand-ins for the customer's UPI app.
- The Flow's payment choices are **Points / Pay online / Points + online**. UPI, card and netbanking are picked on the offers page, because that is where the offers are shown.
- 1 point = Rs 1.
- Offers are mock values. UPI is a cashback, card and netbanking are instant discounts.
- Card details are never entered in the Flow (Meta says Flows are not meant for PCI data). Card entry only happens on the gateway page.

## Mock versus real WhatsApp

- A Flow can only be opened from a button in an interactive message, so the carousel "View" button sends a quick reply first.
- The web view is what a CTA URL button opens in WhatsApp's in-app browser. Real WhatsApp cannot open it automatically.
- Marketing banners are template messages, so the real version needs an approved template.
- In production the Flow needs a Flow endpoint for live catalog and stock, and a payment webhook to confirm payment before issuing codes.
