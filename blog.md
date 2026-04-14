# Revolutionizing Global Procurement: Building ‘Procure AI’ at the AIForBharat Hackathon

Procurement on a global scale is traditionally a tedious, paper-heavy process. From manually drafting Request for Proposals (RFPs) to overcoming language barriers with cross-border or regional vendors, procurement officers spend countless hours on administrative tasks instead of strategic decision-making. 

During the **AIForBharat Hackathon**, our team set out to solve this exact problem. We built **Procure AI**, an AI-powered global procurement management dashboard that transforms how organizations source, negotiate, and finalize vendor contracts across the world. 

Here is a deep dive into our journey, the architecture, and the code that brought Procure AI to life!

---

## 🎯 The Problem Statement

**What real-world issue does this solve?**
In the rapidly growing global B2B sector, sourcing materials requires reaching out to diverse, international, and hyper-local vendors. These workflows suffer from:
1. **Time-consuming RFP Creation:** Sourcing specs, timelines, and legal clauses takes days, especially when adjusting for different global standards.
2. **Language Barriers:** Capable suppliers around the world operate in regional languages, while RFPs are typically drafted in a single primary language (like English).
3. **Complex Quote Comparisons:** Comparing different proposals across borders, currencies, and formats manually often leads to suboptimal financial decisions.

**Why is it important?**
To truly empower the global economy, digital tools must act as an aggressive enabler, bridging the gap between multinational enterprises and local supply chains smoothly and intelligently.

---

## 💡 Our Solution: Procure AI

**Procure AI** is an intelligent, unified dashboard that handles the entire procurement lifecycle. From the moment a procurement need arises to the final vendor handshake, AI acts as a co-pilot, regardless of where the vendor is located.

### Key Features:
- **Conversational AI RFP Creator:** Chat with an AI assistant to auto-generate structured, comprehensive RFPs.
- **Intelligent Vendor Search:** Natural language search to find the perfect external vendors globally.
- **Automated Translation:** Instantly break international and regional language barriers by translating RFPs precisely for local vendors.
- **Quote Intelligence & Negotiation Hub:** AI analyzes vendor quotes and assists in counter-offers.
- **One-Click Publishing:** Auto-generates professional A4 PDFs of the RFP and securely stores them in the cloud.

---

## 🛠 Tech Stack

To ensure Procure AI was blazing fast, strongly typed, and globally scalable, we opted for a modern stack:

*   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
*   **Backend:** FastAPI, Python 3.10+, PostgreSQL (via Alembic & SQLAlchemy)
*   **AI & Cloud:** AWS Bedrock (Anthropic Claude/Nova), Google Gemini, AWS Translate, AWS S3
*   **Orchestration:** LangChain (Structured Outputs)

---

## 🏗 Architecture / How It Works

Our architecture is heavily decoupled. The frontend is an incredibly fast, state-driven (non-routed) Single Page Application (SPA), while the FastAPI backend serves as the brain, integrating with various LLMs and cloud services. 

### The Flow:
1. **Requirement Gathering:** The user opens the **AI RFP Creator** and chats with our Procurement AI.
2. **Structured AI Extraction:** The backend uses LangChain + AWS Bedrock to parse the conversation and extract exactly 5 critical fields (Product, Quantity, Timeline, Budget, Deadline).
3. **Document Generation:** Once the data is structured, Python's `reportlab` dynamically generates a professional PDF and pushes it to an AWS S3 bucket.
4. **Vendor Discovery:** The user queries the Vendor Market. Our backend leverages the **Gemini API** to comprehend the search intent and structure external vendor results worldwide.
5. **Localization:** Before sending the RFP to vendors across the globe, the user can trigger the **AWS Translate** integration to convert the payload into the vendor's native language.

---

## 💻 Key Code Highlights

We didn’t just want to wrap an API; we wanted to enforce strict, reliable AI outputs for enterprise-grade use.

### 1. Conversational AI with Structured Outputs (LangChain + AWS Bedrock)
Instead of relying on fragile prompt engineering to parse JSON using regex, we utilized LangChain’s `with_structured_output`. This forces the LLM (AWS Bedrock) to return data matching our Pydantic schema.

```python
# backend/app/services/rfp.py
from langchain_aws import ChatBedrockConverse

def get_llm(model_id: str):
    return ChatBedrockConverse(
        model=model_id,
        region_name=settings.AWS_REGION,
        temperature=0.7,
        max_tokens=1024,
    )

async def generate_rfp_draft(project_name: str, requirements: str, language: str = "English") -> dict:
    llm = get_llm(settings.BEDROCK_MODEL_ID)
    
    # 🪄 The magic: Forcing the LLM to reply perfectly as the Pydantic schema
    structured_llm = llm.with_structured_output(RFPGenerateResponse)
    
    prompt = f"Generate an RFP... Project: {project_name}... "
    
    response: RFPGenerateResponse = await asyncio.to_thread(
        structured_llm.invoke, prompt
    )
    return response.model_dump()
```
*Logic explained:* By defining an `RFPGenerateResponse` schema, the AI mathematically guarantees the structure of the keys returned. If it fails, our code can gracefully fall back. 

### 2. Intelligent Vendor Matching (Google Gemini)
To find external vendors based on loose user intents, we tapped into Google Gemini's reasoning capabilities.

```python
# backend/app/services/search.py
from langchain_google_genai import ChatGoogleGenerativeAI

async def search_gemini_vendors(query: str, num_results: int = 5) -> list[dict]:
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        temperature=0.3,
    )
    # Another usage of structured schemas for clean UI rendering!
    structured_llm = llm.with_structured_output(schema=GeminiVendorList)
    
    response = await structured_llm.ainvoke(
        f"Find {num_results} real or highly realistic vendors for: {query}. Return ONLY valid JSON."
    )
    return [v.model_dump() for v in response.vendors]
```
*Logic explained:* The user types "I need 500 tons of structural steel." Gemini deduces the industry context, generates realistic vendor profiles from around the world, and hands the backend an easy-to-iterate JSON list.

### 3. Localization for a Global Context
Reaching the world's grassroots and international economy means speaking their language. 

```python
# backend/app/services/translation.py
async def translate_text(text: str, target_language_code: str, source_language_code: str = "auto") -> str:
    translate = get_translate_client() # boto3 AWS Translate client
    response = await asyncio.to_thread(
        translate.translate_text,
        Text=text,
        SourceLanguageCode=source_language_code,
        TargetLanguageCode=target_language_code,
    )
    return response.get("TranslatedText", text)
```
*Logic explained:* This highly reusable utility asynchronously delegates translations to AWS Translate. It allows users to quickly translate massive RFP tables without blocking the Fast API event loop (`asyncio.to_thread`).

---

## 🚧 Challenges & Learnings

1. **Hallucination in LLM Outputs:** Initially, our AI would return varying date formats (e.g., "In 2 weeks"). This broke our UI sorting logic. We fixed this by explicitly injecting the `Current Date: {today}` into the system prompt and enforcing a strict `DD-MM-YYYY` format rule.
2. **State Management in React without a Router:** Because we opted for a highly fluid UI without page reloads, lifting state into `App.tsx` became slightly complex. We overcame this by grouping related state payloads and passing context efficiently down to UI components via `onNavigate`.

---

## 🚀 Impact & Use Cases

- **Multinational Manufacturing Firms:** Rapidly source raw materials from international suppliers without spending weeks drafting legal requirements.
- **SMEs & Government Bodies:** Generate RFPs standardized to compliance rules automatically.
- **Regional & Global Suppliers:** Receive requirements intelligently translated into their native language, effectively breaking down cross-border B2B language barriers.

---

## 🔮 Future Improvements

While Procure AI is already a massive leap over manual entry, we want to add:
- **WhatsApp Integration:** Allowing local and international vendors to respond to quotes via a standard WhatsApp Chatbot rather than forcing them to navigate a new web portal.
- **Deeper OCR & Invoice Parsing:** Extracting data from global, scanned paper invoices out-of-the-box regardless of format.

---

## 🏁 Conclusion

Participating in the AIForBharat Hackathon was incredibly rewarding. We didn't just string together APIs; we built a tool that genuinely addresses the friction found in the global procurement ecosystem. By merging the conversational power of AWS Bedrock, the reasoning of Gemini, and the speed of FastAPI + React, **Procure AI** proves that AI is ready to automate global enterprise workflows, seamlessly connecting massive corporations with grassroots suppliers anywhere in the world.

*Have thoughts on AI in B2B? Reach out and let's discuss the future of procurement!*
