# Calling CRM & Operations Monitoring Hub 🚀

A high-performance, real-time Telecalling & Lead Management CRM monitoring dashboard built with Next.js 14 App Router, Tailwind CSS, Lucide Icons, and MongoDB.

Designed for high-velocity sales and telecalling teams to capture, monitor, auto-distribute, and track leads and calls seamlessly without clutter.

---

## 🌟 Key Features

- **Multi-Action Operations Hub**: Quick one-click action buttons for immediate telecalling workflows (`[+ Add New Lead]`, `[📞 Open Quick Dialer]`, `[⚡ Sync Meta Ads]`, `[📅 Callbacks Due]`, `[🔄 Auto-Distribute]`, `[📊 Export Excel]`).
- **One-Click Direct Actions**: In-line quick call (`tel:`) and instant WhatsApp chat (`wa.me`) integration directly from the lead table.
- **Real-Time Telecalling Analytics**: Live metrics for Total Calls, Connected Rates, Callbacks Scheduled, Average Duration, and Agent Performance.
- **Meta Lead Ads Integration**: Native sync capabilities with Meta Graph API for automated lead capture from Facebook and Instagram lead forms.
- **Intelligent Lead Assignment**: Round-robin and load-balanced auto-distribution across active agents.
- **Audio Call Recording Playback**: Built-in call recording audit log with inline player and download controls.
- **Fully Responsive & Clean UI**: Accessible, uncluttered UI adhering to 8pt spacing grids, semantic color tokens, and SVG icons.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **API**: Next.js Serverless Route Handlers

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/saifAnsari732/caller-website-monitoring.git
cd caller-website-monitoring
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local` and populate your credentials:
```bash
cp .env.example .env.local
```

Configure:
- `MONGODB_URI`: Your MongoDB connection string.
- `META_*`: Meta App credentials for Lead Ads webhook and Graph API synchronization.

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
├── app/
│   ├── api/             # API routes (leads, calls, dashboard, meta ads sync)
│   ├── analytics/       # Call performance & metrics reporting
│   ├── calls/           # Call logs & recording player
│   ├── dialer/          # Web-based soft dialer
│   ├── leads/           # Advanced lead list & management
│   ├── settings/        # Meta ads integration & system preferences
│   ├── layout.jsx       # Root layout & navigation sidebar
│   └── page.jsx         # Operations Command Center Dashboard
├── components/          # Reusable UI components & Header
├── lib/                 # Database connection & Mongoose models
├── public/              # Static assets
└── tailwind.config.js   # Custom design system configuration
```

---

## 📄 License
MIT License.
