# 💼 PayPulse — Compensation Intelligence Platform

**PayPulse** is a premium, full-stack compensation intelligence system built around a core engineering principle: **levels matter far more than job titles**. In modern tech, job titles are highly subjective. By normalizing industry data into standardized leveling buckets (Entry, Mid, Senior, Staff, Principal), PayPulse empowers developers to map, compare, and negotiate compensation with mathematical precision.

PayPulse features a premium glassmorphic dark-mode interface with zero external CSS or UI framework dependencies, delivering microsecond transitions and an extremely lightweight footprint.

---

## 🌟 Key Features

### 1. 📊 Interactive Leveling Matrix
- Cross-tabulates company-specific leveling tiers (e.g., L5 at Google vs. E5 at Meta vs. 63 at Microsoft) side-by-side.
- Styled with a dynamic **salary density heatmap** (purple glows for entry levels, transitioning to green/teal gradients for principal ranks).
- Clicking any active cell dynamically loads the base, stock, and bonus splits with real-time proportional charts.

### 2. 🎯 Job Offer Evaluator & Tax Impact Calculator
- Evaluates pending offers against company and global level medians, calculating the candidate's exact **percentile rank**.
- **Post-Tax Take-Home Calculator**: Computes federal brackets and progressive state taxes for key tech hubs:
  - **California (CA)**: Full bracket structure + 1% Mental Health Services tax over $1M.
  - **New York (NY)**: State income brackets + NYC local tax (3.8% flat average).
  - **Washington (WA)**: 0% state income tax.
  - **Remote/Other**: 4% flat state tax average.
- **Washington Tax Advantage Promo**: Dynamically highlights how much a user would save in state income taxes if they worked from Seattle/Redmond (WA) vs. CA/NY.

### 3. ✉️ Live Negotiation Script & Email Builder
- Automatically identifies deficiencies in the base salary and equity components relative to market medians.
- Generates high-impact counter-offer templates across three distinct situations:
  - **🤝 Collaborative**: Emphasizes excitement and mutual alignment.
  - **⚡ Competitive**: Designed for candidates with multiple competing offers/pipelines in play.
  - **🙏 Polite Inquiry**: A gentle inquiry asking for budget flexibility.
- Features a **"Copy Script"** clipboard utility.

### 4. 📈 Career Progression Pay Curves
- Models technical promotional trajectories for a given company.
- Dynamically visualizes how pay shifts from cash-heavy (base salary) to equity-heavy (RSU grants) as engineers rise in seniority.

### 5. 🔍 Salary Explorer
- Searchable and paginated records console.
- Features debounced text filter fields, drop-down filters, and multi-column sorting (TC, base salary, experience).

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, SQLite (`sqlite3`)
- **Database Engine**: Promise-wrapped SQLite engine with automated DB schema bootstrapping and pre-seeded FAANG baseline records.
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), Vanilla JavaScript (No React, Tailwind, or Webpack dependencies—fully compiled-free).
- **Data Integrity & Security**:
  - **SHA-256 Duplicate Protection**: Hashes submission fields on ingestion to block duplicate entries.
  - **Regex Company Normalization**: Cleans and normalizes messy corporate suffixes (e.g., `google llc` ➔ `Google`) to maintain database integrity.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

### Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/paypulse.git
   cd paypulse
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server in watch mode:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to **`http://localhost:8000`**.

---

## ☁️ Deployment

### 1. Render (Web Service)
Render is ideal for persistent Express/SQLite servers:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Persistent Volume**: Mount a volume at `/src/data` to persist SQLite files across deployments.

### 2. Vercel (Serverless)
The codebase contains a pre-configured `vercel.json` file.
- Deploy instantly using:
  ```bash
  vercel --prod
  ```
- *Note: Vercel serverless functions are stateless, meaning database writes will not persist between container recycles. Pre-seeded database records remain fully readable.*
