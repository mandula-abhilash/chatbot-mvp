/**
 * JSON schemas for OpenAI function calling
 * This file contains all the schemas used for structured data extraction
 */

export const intentDetectionSchema = {
  name: "detect_intent",
  description:
    "Detects the intent of a user message and categorizes it appropriately",
  parameters: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        enum: [
          "build_sql",
          "generate_embeddings",
          "suggest_whatsapp_flow",
          "fetch_faq",
          "irrelevant_query",
          "unclear_query",
          "potential_security_threat",
        ],
        description: "The detected intent category",
      },
      relevant_tables: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "businesses",
            "business_hours",
            "business_services",
            "business_faqs",
          ],
        },
        description:
          "The database tables most relevant to this query (only for build_sql and fetch_faq intents)",
      },
      confidence: {
        type: "number",
        description: "Confidence score between 0 and 1",
        minimum: 0,
        maximum: 1,
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of why this intent was selected",
      },
    },
    required: ["intent"],
  },
};

export const businessQuerySchema = {
  name: "business_query",
  description: "Extracts structured information from business-related queries",
  parameters: {
    type: "object",
    properties: {
      entity_type: {
        type: "string",
        enum: [
          "business",
          "service",
          "product",
          "hours",
          "location",
          "contact",
          "pricing",
          "staff",
        ],
        description: "The type of business entity being queried",
      },
      query_type: {
        type: "string",
        enum: [
          "information",
          "availability",
          "booking",
          "comparison",
          "recommendation",
        ],
        description: "The type of query being made",
      },
      specific_attributes: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Specific attributes being requested (e.g., 'price', 'location', 'hours')",
      },
      time_reference: {
        type: "string",
        description:
          "Any time reference mentioned in the query (e.g., 'tomorrow', 'weekend')",
      },
    },
    required: ["entity_type", "query_type"],
  },
};

export const faqMatchingSchema = {
  name: "faq_matching",
  description: "Extracts key information to match with FAQ database",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [
          "product",
          "service",
          "policy",
          "troubleshooting",
          "account",
          "payment",
          "shipping",
          "returns",
        ],
        description: "The category of the FAQ",
      },
      keywords: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Key terms to match against FAQ database",
      },
      question_type: {
        type: "string",
        enum: ["how_to", "what_is", "when", "where", "why", "yes_no"],
        description: "The type of question being asked",
      },
    },
    required: ["category", "keywords"],
  },
};

// Export all schemas as a collection for easy access
export const schemas = {
  intentDetectionSchema,
  businessQuerySchema,
  faqMatchingSchema,
};

export default schemas;
