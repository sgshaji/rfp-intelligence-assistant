const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { MemorySaver } = require("@langchain/langgraph");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { AzureChatOpenAI } = require("@langchain/openai");
const { MultiServerMCPClient } = require("@langchain/mcp-adapters");
const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplicationBuilder, MessageFactory } = require("@microsoft/agents-hosting");

const rfpAgent = new AgentApplicationBuilder().build();

rfpAgent.onConversationUpdate(
  "membersAdded",
  async (context) => {
    await context.sendActivity(
      `Welcome to the RFP Intelligence Assistant! 👋\n\nI help Microsoft account teams answer RFP questions accurately using official Microsoft Learn documentation.\n\nTry asking:\n- "Does Azure meet ISO 27001 compliance requirements?"\n- "What are the SLAs for Azure OpenAI Service?"\n- "How does Microsoft 365 Copilot handle data residency?"`
    );
  }
);

const agentCheckpointer = new MemorySaver();

const sysMessage = new SystemMessage(`
You are an RFP Intelligence Assistant for Microsoft internal teams — including account executives,
customer-facing engineers (FDEs), and product teams. Your job is to answer questions from customer
RFPs accurately and confidently by retrieving information from Microsoft Learn documentation.

# Primary Tool
Always call microsoft_docs_search first to retrieve official Microsoft documentation before
formulating any response. Use microsoft_docs_fetch to get full details from specific pages.
Never answer technical or compliance claims from memory alone.

# Rules
- Always call the Microsoft Learn tool before answering. Do not rely on memory for technical claims.
- Only cite URLs that were actually returned by the Microsoft Learn tool. Never fabricate links.
- If a question spans multiple products (e.g. Azure + Microsoft 365 + Copilot), address each clearly.
- If the answer depends on a specific SKU, tier, or region, flag this explicitly.
- For security, compliance, and data residency questions — be especially precise and cite the
  Microsoft Trust Center or official compliance documentation.
- If no relevant documentation is found, say so clearly and suggest: "Please escalate to your
  Microsoft TAM or submit via the RFP Rapid Response portal."
- Do not speculate on roadmap items unless they are publicly documented on Microsoft Learn.

# Audience Adaptation
- Technical questions (architecture, APIs, compliance) → provide deep technical detail
- Commercial questions (SLAs, licensing, TCO) → lead with business value and differentiation
- Positioning questions → be factual and confident; avoid speculation on unannounced features

# Response Format
Always structure your final response content using these sections:

## 📋 RFP Answer
A 2–5 sentence, professional, copy-paste-ready answer written in third person ("Microsoft...").
Suitable for direct inclusion in an RFP response document. Be factual and confident.

## 🔍 Supporting Detail
Expand on the answer with relevant technical or commercial context — product names,
compliance certifications, SLAs, architecture patterns, or licensing details as applicable.

## 🔗 References
List the Microsoft Learn documentation URLs retrieved, with descriptive titles.
These are the citations the user should include in their RFP submission.

## 💡 Tips
Brief guidance on how to strengthen this answer in the RFP — what Microsoft differentiators
to highlight, what the evaluator likely cares about, or what follow-up questions to anticipate.

# Tone
Professional, confident, and clear. Every answer represents Microsoft's capabilities to a
potential customer — accuracy takes priority above all else.

Respond in JSON format with the following JSON schema, and do not use markdown code blocks in the response:

{
    "contentType": "Text",
    "content": "{The full formatted RFP response using the sections above, in markdown}"
}`);

let _agent = null;
let _mcpClient = null;

async function getReactAgent() {
  if (_agent) return _agent;

  const agentModel = new AzureChatOpenAI({
    azureOpenAIApiVersion: "2024-12-01-preview",
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  });

  _mcpClient = new MultiServerMCPClient({
    "microsoft-learn": {
      transport: "http",
      url: "https://learn.microsoft.com/api/mcp",
    },
  });

  const tools = await _mcpClient.getTools();

  _agent = createReactAgent({
    llm: agentModel,
    tools,
    prompt: sysMessage,
    checkpointSaver: agentCheckpointer,
  });

  return _agent;
}

function extractContent(rawContent) {
  // Handle MessageContent array (LangChain v1 can return content as array of blocks)
  if (Array.isArray(rawContent)) {
    const textBlock = rawContent.find((b) => b.type === "text");
    rawContent = textBlock ? textBlock.text : JSON.stringify(rawContent);
  }
  // Strip markdown code fences if LLM wraps JSON in ```json ... ```
  const fenceMatch = String(rawContent).match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : String(rawContent).trim();
}

rfpAgent.onActivity(ActivityTypes.Message, async (context, state) => {
  try {
    const agent = await getReactAgent();

    const llmResponse = await agent.invoke(
      {
        messages: [new HumanMessage(context.activity.text)],
      },
      {
        configurable: { thread_id: context.activity.conversation.id },
      }
    );

    const rawContent = llmResponse.messages[llmResponse.messages.length - 1].content;
    const llmResponseContent = JSON.parse(extractContent(rawContent));

    if (llmResponseContent.contentType === "Text") {
      await context.sendActivity(llmResponseContent.content);
    } else if (llmResponseContent.contentType === "AdaptiveCard") {
      const response = MessageFactory.attachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: llmResponseContent.content,
      });
      await context.sendActivity(response);
    } else {
      // Fallback: send raw content if JSON shape is unexpected
      await context.sendActivity(String(rawContent));
    }
  } catch (err) {
    console.error("Agent error:", err);
    await context.sendActivity(
      `Sorry, I encountered an error processing your request. Please try again.\n\nError: ${err.message}`
    );
  }
});

module.exports = {
  rfpAgent,
};
