# Gyftr WhatsApp voucher journey (mock)

A clickable React mock of the Gyftr bot on WhatsApp. It shows the hybrid approach:
browse in chat, check out in a WhatsApp Flow, pay on a web page.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. There are two views, switched from the top bar (or with `?view=device` / `?view=full`):

- **3D phone**: a three.js phone with the live WhatsApp chat on its screen. Drag the frame to turn it, including to the back. The screen stays fully clickable.
- **Full screen**: the chat fills the viewport with no frame, for any phone or browser. Share this one with `?view=full`. It is the default on narrow screens.

Open **Settings** in the top bar to switch between:

- **User starts chat** and **Marketing banner** (the banner skips browsing and opens Brand A with offer `WELCOME10`)
- **Buttons + Flow** and **Menu fallback** (plain numbered replies, for when Flows are not available)
- Points balance: 2,500 (covers the order), 150 (shows Points + online), 0 (online only)

Demo values: points OTP is `123456`. Any `name@bank` works as a UPI ID.

## The journey

1. Entry: user says hi, or taps a marketing template banner.
2. Main menu: Buy a voucher, View previous orders, Check loyalty points balance (three buttons, the WhatsApp maximum).
3. Browse: brand carousel plus a category list. "View" sends a quick reply, then a message with a "Buy voucher" button that opens the Flow.
4. Flow (3 screens): denomination, quantity and gift details, then payment mode, then summary.
5. Payment mode:
   - **Points**: OTP typed in the chat, voucher issued straight away.
   - **Pay online**: "View offers and pay" button opens the web view.
   - **Points + online**: OTP for the points part, then the web view for the rest.
6. Web view: lists the offer per method.
   - **UPI**: closes and a UPI payment request message lands in the chat.
   - **Card or netbanking**: goes straight to the bank or gateway page, then back to the chat.
7. Voucher message with copyable codes. View previous orders and loyalty points balance work at any time.

## Promo codes and offers

On the partner (brand) screen of the Flow, below denomination and quantity:

- **Offers on this partner**: a radio list of applicable offers. Offers tied to another partner are hidden, and offers with a minimum order stay disabled until the order reaches it.
- **Promo code**: a text field, checked when the customer taps Continue. Errors say why: not valid, only works on another partner, or how much more to add.
- The total on the screen, the order message and the summary all show the discount.

In menu mode the same rules apply through a "Have a promo code?" step (reply a code, OFFERS or SKIP). The marketing banner journey arrives with `WELCOME10` already applied.

Codes live in `PROMOS` in `src/data.js`. Replace `validatePromo` with a call to Gyftr's real promo API.

## Where things live

| File | What it does |
| --- | --- |
| `src/useBot.js` | All conversation logic for both modes, payment sequencing |
| `src/data.js` | Brands, offers, pricing rules, seed orders. Swap for real Gyftr APIs here |
| `src/components/PhoneScreen.jsx` | The WhatsApp app: header, chat, composer, overlays |
| `src/components/Chat.jsx` | Renders every WhatsApp message type |
| `src/components/ListSheet.jsx` | The sheet a list message opens |
| `src/components/FlowSheet.jsx` | The Flow screens, built from real Flow components |
| `src/components/WebView.jsx` | In-app browser: offers page, UPI path, bank or gateway redirect |
| `src/components/UpiApp.jsx` | Demo stand-in for the customer's UPI app |
| `src/components/Device3D.jsx` | three.js phone, with the chat mounted on its screen through CSS3D |
| `src/styles/whatsapp.css` | All WhatsApp styling |

## Assumptions to confirm with Gyftr

- The UPI "request message" is modelled as a collect-style request sent to the customer's UPI ID. The approve and decline buttons in the chat are demo-only stand-ins for the customer's UPI app.
- The Flow's payment choices are **Points / Pay online / Points + online**. UPI, card and netbanking are picked on the offers page, because that is where the offers are shown.
- 1 point = Rs 1.
- Offers are mock values. UPI is a cashback, card and netbanking are instant discounts.
- Card details are never entered in the Flow (Meta says Flows are not meant for PCI data). Card entry only happens on the gateway page.

## How close to WhatsApp is it

The layout, colours, bubble shapes, button rows, list sheet, Flow components, in-app browser and iOS bars follow WhatsApp for iOS in light mode, built from memory and public references, not measured from Meta's assets. For a pixel match, put a real screenshot next to it and tune the values at the top of `whatsapp.css`. Fonts fall back to the system font off Apple devices, since SF Pro cannot be shipped.

The 3D phone's screen is the confirmed iPhone 18 Pro Max display (6.9 inch, 2868 x 1320 at 460 ppi, which is 956 x 440 points). The body, bezel and camera plateau are an approximation.

## Mock versus real WhatsApp

- A Flow can only be opened from a button in an interactive message, so the carousel "View" button sends a quick reply first.
- The web view is what a CTA URL button opens in WhatsApp's in-app browser. Real WhatsApp cannot open it automatically.
- Marketing banners are template messages, so the real version needs an approved template.
- In production the Flow needs a Flow endpoint for live catalog and stock, and a payment webhook to confirm payment before issuing codes.
