import { MCPTool } from '../../types';
import { AIToolMetadata } from '../../types/aiTools';
import { searchWebToolDefinition } from '../tools/searchWeb';
import { crawlPageToolDefinition } from '../tools/crawlPage';

export async function createWebSearchServer() {
  const tools: MCPTool[] = [
    searchWebToolDefinition,
    crawlPageToolDefinition,
  ];

  const metadata: Record<string, AIToolMetadata> = {
    searchWeb: {
      name: 'searchWeb',
      description: 'Search the web for current information, news, and answers using natural language queries',
      category: 'search',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'Natural language search query',
          required: true,
          examples: ['latest AI news', 'GPT-5 release date', 'how to cook pasta', 'weather in New York']
        },
        {
          name: 'max_results',
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 20)',
          required: false,
          examples: ['5', '10', '20']
        },
        {
          name: 'region',
          type: 'string',
          description: 'Search region/country code (default: us)',
          required: false,
          examples: ['us', 'uk', 'ca', 'au']
        }
      ],
      examples: [
        {
          query: "What's happening in AI news today?",
          expectedParams: { query: "AI news today", max_results: 10 },
          description: "Search for current AI news"
        },
        {
          query: "Find me articles about GPT-5",
          expectedParams: { query: "GPT-5 articles", max_results: 10 },
          description: "Search for specific technology articles"
        },
        {
          query: "What are the latest developments in quantum computing?",
          expectedParams: { query: "latest quantum computing developments 2024", max_results: 10 },
          description: "Search for recent developments in a field"
        },
        {
          query: "How to learn React in 2024",
          expectedParams: { query: "learn React 2024 tutorial guide", max_results: 10 },
          description: "Search for educational content"
        },
        {
          query: "Best restaurants in San Francisco",
          expectedParams: { query: "best restaurants San Francisco 2024", max_results: 10 },
          description: "Search for local recommendations"
        }
      ],
      timeContext: 'current',
      dataAccess: 'read'
    },

    crawlPage: {
      name: 'crawlPage',
      description: 'Extract and analyze content from any web page URL, including text, headings, and links',
      category: 'search',
      parameters: [
        {
          name: 'url',
          type: 'string',
          description: 'Full URL of the page to crawl',
          required: true,
          examples: [
            'https://example.com/article',
            'https://blog.openai.com/recent-post',
            'https://news.ycombinator.com'
          ]
        },
        {
          name: 'extract_content',
          type: 'boolean',
          description: 'Whether to extract main content vs return raw HTML (default: true)',
          required: false,
          examples: ['true', 'false']
        },
        {
          name: 'max_length',
          type: 'number',
          description: 'Maximum characters to return (default: 5000)',
          required: false,
          examples: ['1000', '5000', '10000']
        }
      ],
      examples: [
        {
          query: "Summarize this article: https://example.com/article",
          expectedParams: { url: "https://example.com/article", extract_content: true },
          description: "Extract and summarize content from a URL"
        },
        {
          query: "What does this page say about AI?",
          expectedParams: { url: "https://example.com/ai-article", extract_content: true },
          description: "Extract content from a specific page"
        },
        {
          query: "Analyze the content of this blog post",
          expectedParams: { url: "https://blog.example.com/post", extract_content: true },
          description: "Extract and analyze blog content"
        },
        {
          query: "Get the main text from this news article",
          expectedParams: { url: "https://news.example.com/story", extract_content: true, max_length: 3000 },
          description: "Extract news article content with length limit"
        }
      ],
      timeContext: 'any',
      dataAccess: 'read'
    }
  };

  return { tools, metadata };
}