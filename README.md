# RFP Intelligence Assistant

A **Custom Engine Agent** for Microsoft Teams and Microsoft 365 Copilot that helps account executives, customer-facing engineers (FDEs), and product teams answer RFP questions accurately — backed by real-time official Microsoft Learn documentation.

Built with the [Microsoft 365 Agents SDK](https://github.com/Microsoft/Agents), [LangChain / LangGraph](https://js.langchain.com/), and the [Microsoft Learn MCP Server](https://github.com/MicrosoftDocs/mcp).

---

## How it works

```
User question (Teams / Copilot)
        │
        ▼
  LangGraph ReAct Agent  (gpt-5.3-chat via Azure OpenAI)
        │
        ├──► microsoft_docs_search  ──► Microsoft Learn MCP (https://learn.microsoft.com/api/mcp)
        ├──► microsoft_docs_fetch
        └──► microsoft_code_sample_search
        │
        ▼
  Structured RFP response (📋 Answer · 🔍 Detail · 🔗 References · 💡 Tips)
```

Every response is grounded in **live, official Microsoft documentation** — no hallucinations, no stale training data.

---

## Response format

Each answer follows a consistent RFP-ready structure:

| Section | Purpose |
|---|---|
| 📋 **RFP Answer** | 2–5 sentence, copy-paste-ready answer written in third person |
| 🔍 **Supporting Detail** | Technical/commercial context — SLAs, certifications, architecture |
| 🔗 **References** | Actual Microsoft Learn URLs retrieved (never fabricated) |
| 💡 **Tips** | How to strengthen the answer in your RFP submission |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18, 20, or 22
- [Microsoft 365 Agents Toolkit VS Code Extension](https://aka.ms/teams-toolkit)
- An **Azure AI Foundry** resource with a GPT chat model deployed (e.g. `gpt-4o`, `gpt-5.3-chat`)
  > ⚠️ The model must be a **chat completion** deployment, not an Azure AI Service endpoint (Speech, Vision, etc.)

---

## Setup

1. Open `env/.env.playground.user` and set your Azure OpenAI credentials:

   ```env
   SECRET_AZURE_OPENAI_API_KEY=<your-api-key>
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
   AZURE_OPENAI_DEPLOYMENT_NAME=<your-deployment-name>
   ```

   Find these in **Azure AI Foundry → Models + endpoints → your deployment → Details**.

2. In VS Code, select the **Microsoft 365 Agents Toolkit** icon in the sidebar.

3. Press **F5** and select **"Start App in Microsoft 365 Agents Playground"**.

4. The playground opens in your browser. Ask a question like:
   - *"Does Azure meet ISO 27001 compliance requirements?"*
   - *"What is the SLA for Azure OpenAI Service?"*
   - *"How does Microsoft 365 Copilot handle data residency?"*

---

## Project structure

| Path | Description |
|---|---|
| `src/index.js` | Entry point — starts the Express bot server on port 3978 |
| `src/agent.js` | Core agent logic — LangGraph ReAct agent, MCP client, Teams activity handler |
| `appPackage/manifest.json` | Teams app manifest — registers as a Custom Engine Agent in Copilot |
| `env/.env.playground.user` | Local secrets (gitignored) — Azure OpenAI credentials |
| `m365agents.playground.yml` | Toolkit config for playground dev/test loop |
| `m365agents.yml` | Toolkit config for production Azure deployment |
| `infra/` | Bicep templates for Azure Bot Service + App Service provisioning |

---

## Key dependencies

| Package | Purpose |
|---|---|
| `@microsoft/agents-hosting-express` | Teams bot hosting & activity routing |
| `@langchain/langgraph` | ReAct agent orchestration loop |
| `@langchain/mcp-adapters` | Connects to Microsoft Learn MCP server |
| `@langchain/openai` | Azure OpenAI LLM integration |

---

## Additional resources

- [Microsoft 365 Agents SDK](https://github.com/Microsoft/Agents)
- [Microsoft Learn MCP Server](https://github.com/MicrosoftDocs/mcp)
- [LangGraph ReAct agents](https://langchain-ai.github.io/langgraphjs/)
- [Microsoft 365 Agents Toolkit docs](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Azure AI Foundry](https://ai.azure.com)
