# AI Loan Eligibility Checker

An AI-powered BFSI (Banking, Financial Services & Insurance) web platform that simplifies personal financial decision-making. Four tools in one interface:

- **Loan Eligibility Checker**: EMI-to-income (50% limit) and credit score checks, estimated maximum loan, plus AI analysis
- **Credit Score Analyzer**: factor-by-factor breakdown with an AI improvement plan
- **EMI Calculator**: monthly EMI, total interest and total payable
- **AI Financial Tips**: ask Claude any personal-finance question

**Stack:** HTML, CSS, vanilla JavaScript, dark glassmorphism UI, Claude API, Google Sheets (via Apps Script) for persistence.

## Project structure

```
├── index.html
├── style.css
├── script.js
├── config.example.js        # copy to config.js
├── google-apps-script/
│   └── Code.gs              # Sheets backend
├── .gitignore
└── README.md
```

## Setup

1. `cp config.example.js config.js`
2. Add your Claude settings in `config.js`.
3. Set up Google Sheets storage:
   - Create a Google Sheet, open **Extensions → Apps Script**, paste `google-apps-script/Code.gs`.
   - **Deploy → New deployment → Web app** (Execute as *Me*, access *Anyone*).
   - Paste the URL into `SHEETS_WEBAPP_URL`.
4. Open `index.html` in a browser, or serve it with `npx serve .`.

## Security note

Anything in browser JavaScript is visible to visitors. Do **not** deploy a real Anthropic API key in a public site. For production, set `CLAUDE_PROXY_URL` to a small server or serverless function (Cloudflare Worker, Vercel, etc.) that adds your key server-side. `config.js` is git-ignored so keys stay out of the repo.

## Deploy on GitHub Pages

Push the repo, then **Settings → Pages → Deploy from branch → main**. Because `config.js` is git-ignored, use the proxy setup above and commit a `config.js` containing only the proxy and Sheets URLs.

## Disclaimer

Results are indicative guidance only, not financial advice or a loan approval.

## License

MIT
