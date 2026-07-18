# AI Financial Advisor & Leverage Volatility Simulator Dashboard

A professional-grade portfolio application designed to simulate derivatives risk, leverage survival boundaries, and scrape real-time market sentiments. Built with a decoupled client-server architecture using Node.js, Express, Vanilla ES5 JavaScript, and HTML5 Canvas (Chart.js).

---

## 🏗️ System Architecture & Data Engineering

The platform uses a modular, decoupled approach to keep state management, mathematical computations, and UI rendering cleanly isolated.

```
                  +------------------+
                  |   DATA SOURCES   |
                  |  - YouTube API   |
                  |  - Yahoo Finance |
                  |  - Tickertape    |
                  +--------+---------+
                           |
                           v
                  +--------+---------+
                  |  NODE.JS SERVER  |
                  |  - Cache Manager |
                  |  - API Proxies   |
                  |  - Scrapers      |
                  +--------+---------+
                           |
                           v
                  +--------+---------+
                  |   CLIENT SUITE   |
                  |  - Volatility    |
                  |  - Speech APIs   |
                  |  - Heuristics    |
                  +------------------+
```

* **Data Sources**: Official YouTube search APIs, real-time Yahoo Finance ticker feeds, and Tickertape sentiment indices.
* **Node.js Server**: Acts as a proxy to circumvent CORS limitations and implements a 5-minute memory caching layer to optimize API performance and prevent rate limiting.
* **Client Suite**: Handcrafted responsive UI utilizing ES5 namespace isolation for state management, dynamic Chart.js instances, and local speech engines.

---

## 🔌 REST API Endpoints Registry

| Endpoint | Method | Payload / Arguments | Description | Rationale & Usage |
| :--- | :--- | :--- | :--- | :--- |
| `/api/videos` | `GET` | `q` (string), `hours` (int), `key` (string) | YouTube Aggregator Fetcher | Queries latest Nifty market reports; handles YouTube API calls or falls back to scraper. |
| `/api/ticker` | `GET` | None | Real-time Market Feeds | Pulls live index rates (Nifty 50, Gold, OMX 30) from Yahoo Finance. |
| `/api/mmi` | `GET` | None | Market Mood Index (MMI) | Fetches current institutional investment sentiment (Extreme Fear to Extreme Greed). |
| `/api/generate-insights` | `POST` | `prompt` (string) | AI Insight Prompt Engine | Connects with Gemini Pro to generate qualitative market summaries. |
| `/api/voice-assistant/query` | `POST` | `query` (string), `market` (string) | Voice Assistant Hub | Matches user speech commands to structured indicators. |

---

## 🤖 Agentic AI, AI, and Machine Learning Showcase

This portfolio showcases clean, production-ready integrations of advanced cognitive computing and math:

### 1. Agentic AI & State Memory
The client-side coordinator acts as an autonomous agentic system. It monitors form alterations, manages localized state updates, runs conditional state routes without backend orchestration, and feeds enriched context (such as sentiment weight and live ticker data) into prompt generations.

### 2. Artificial Intelligence & NLP
* **Speech Recognition**: Implements the native Web Speech API to capture speech-to-text commands hands-free.
* **Voice Synthesis (TTS)**: Orchestrates speech queues using the Google/browser SpeechSynthesis API, allowing clean audio responses that automatically cancel conflicts.
* **Intent Classification**: Uses backend system prompts to translate natural spoken queries (e.g. *"Should I buy ETH?"*) into executable dashboard configurations.

### 3. Machine Learning & Volatility Modeling
* **Monte Carlo Simulations**: Runs sequential random-walk path simulations modeled using statistical asset drift and diffusion constants (historical standard deviation of BTC, ETH, and Gold).
* **Capital Ruin Heuristics**: Compounds liquidation thresholds and projects probability curves of bankruptcy across consecutive losing trades.

### 4. Sentiment Classifier
Processes video descriptions and titles through a client-side keyword sentiment classifier. Using distance-based word weights and polarity tokens, it compiles a quantitative bullish/bearish outlook score.

---

## 📖 Run Book & Operator Guidelines

* **Step 1: API Configuration**: Open the settings modal (⚙️) to save your custom YouTube API key. This helps avoid shared server rate limits.
* **Step 2: Leverage Trading Simulation**: Enter your entry prices, asset size, and margin mode. Toggle between Isolated and Cross margin models to test leverage limits.
* **Step 3: Volatility Spikes Backtest**: Check the "Simulate Volatility Spikes" box and review the Worst-Case Matrix to inspect if high leverage triggers sudden liquidations.
* **Step 4: Voice Assistant Unlock**: Open the voice assistant (🎙️), enter your authorized access passkey (stored in `.env`), and speak commands like *"Explain support and resistance"* or *"What is the current ETH rate?"*.

---

## 🚀 Roadmap & Future Enhancements

* **Websocket Integration**: Migrate from REST polling to live ticker feeds.
* **Option Chain Calculations**: Add Put-Call Ratio (PCR) analytics and live IV calculators.
* **Alert Notifications**: Integrate SMS/Email alerts triggered by unexpected volatility spikes.
