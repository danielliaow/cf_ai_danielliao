// import { MCPTool, MCPToolResponse } from '../../types';

// interface SearchWebParams {
//   query: string;
//   max_results?: number; // Default: 10, Max: 20
//   region?: string; // Default: 'us'
// }

// interface SearchResult {
//   title: string;
//   url: string;
//   snippet: string;
//   position: number;
//   date?: string;
// }

// export const searchWebToolDefinition: MCPTool = {
//   name: 'searchWeb',
//   description: 'Search the web for current information using a natural language query',
  
//   async execute(userId: string, params: SearchWebParams): Promise<MCPToolResponse> {
//     try {
//       console.log('🔍 Searching web:', params);

//       if (!params.query || params.query.trim().length === 0) {
//         return {
//           success: false,
//           error: 'Query parameter is required',
//           timestamp: new Date().toISOString(),
//         };
//       }

//       const maxResults = Math.min(params.max_results || 10, 20);
//       const region = params.region || 'us';

//       // Use SerpAPI for web search (you'll need to sign up for an API key)
//       // Alternative: Use Google Custom Search API or Bing Search API
//       const SERP_API_KEY = 'e6e03d116eb33a6cc989b615130d7f5d749cf2304082cba0ae6b603d9bcd53dd'
      
//       if (!SERP_API_KEY) {
//         // Fallback: Use a mock search for demonstration
//         console.log('⚠️ No SERP_API_KEY found, using mock search results');
//         return await mockWebSearch(params.query, maxResults);
//       }

//       // Real web search using SerpAPI
//       const searchUrl = new URL('https://serpapi.com/search.json');
//       searchUrl.searchParams.set('q', params.query);
//       searchUrl.searchParams.set('engine', 'google');
//       searchUrl.searchParams.set('api_key', SERP_API_KEY);
//       searchUrl.searchParams.set('num', maxResults.toString());
//       searchUrl.searchParams.set('gl', region);
//       searchUrl.searchParams.set('hl', 'en');

//       console.log('🌐 Making search request:', searchUrl.toString().replace(SERP_API_KEY, 'HIDDEN'));

//       const response = await fetch(searchUrl.toString());
      
//       if (!response.ok) {
//         throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json() as any;

//       // Parse results
//       const results: SearchResult[] = [];
      
//       if (data.organic_results) {
//         data.organic_results.forEach((result: any, index: number) => {
//           if (index < maxResults) {
//             results.push({
//               title: result.title || 'Untitled',
//               url: result.link || '',
//               snippet: result.snippet || 'No description available',
//               position: result.position || index + 1,
//               date: result.date || undefined,
//             });
//           }
//         });
//       }

//       console.log(`✅ Found ${results.length} search results`);

//       return {
//         success: true,
//         data: {
//           query: params.query,
//           results,
//           total_results: results.length,
//           search_time: new Date().toISOString(),
//           region,
//         },
//         timestamp: new Date().toISOString(),
//       };

//     } catch (error) {
//       console.error('❌ Error in web search:', error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Web search failed',
//         timestamp: new Date().toISOString(),
//       };
//     }
//   },
// };

// // Mock search function for demonstration when API key is not available
// async function mockWebSearch(query: string, maxResults: number): Promise<MCPToolResponse> {
//   const mockResults: SearchResult[] = [
//     {
//       title: `${query} - Latest News and Updates`,
//       url: `https://example-news.com/search?q=${encodeURIComponent(query)}`,
//       snippet: `Recent developments and news about ${query}. Stay updated with the latest information and trends.`,
//       position: 1,
//       date: new Date().toISOString().split('T')[0],
//     },
//     {
//       title: `Complete Guide to ${query}`,
//       url: `https://example-guide.com/${query.replace(/\s+/g, '-').toLowerCase()}`,
//       snippet: `Comprehensive guide covering everything you need to know about ${query}. Expert insights and practical tips.`,
//       position: 2,
//     },
//     {
//       title: `${query} - Wikipedia`,
//       url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
//       snippet: `Wikipedia article about ${query}. Free encyclopedia with detailed information and references.`,
//       position: 3,
//     },
//   ].slice(0, maxResults);

//   return {
//     success: true,
//     data: {
//       query,
//       results: mockResults,
//       total_results: mockResults.length,
//       search_time: new Date().toISOString(),
//       region: 'us',
//       note: 'Mock results - Configure SERP_API_KEY for real web search',
//     },
//     timestamp: new Date().toISOString(),
//   };
// }

import { MCPTool, MCPToolResponse } from '../../types';

interface SearchWebParams {
  query: string;
  max_results?: number; // Default: 10, Max: 20
  region?: string; // Optional: affects hl param
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export const searchWebToolDefinition: MCPTool = {
  name: 'searchWeb',
  description: 'Search the web for current information using Google Custom Search API',
  
  async execute(userId: string, params: SearchWebParams): Promise<MCPToolResponse> {
    try {
      console.log('🔍 Searching web (Google Custom Search):', params);

      if (!params.query || params.query.trim().length === 0) {
        return {
          success: false,
          error: 'Query parameter is required',
          timestamp: new Date().toISOString(),
        };
      }

      const maxResults = Math.min(params.max_results || 10, 20);

      // Google Custom Search requires API key + CSE ID
      const GOOGLE_API_KEY = 'AIzaSyBzehKaus3K8QKOQtGGoNRRnAhnKjY0bik';
      const GOOGLE_CX = '36552f64b032446fb';

      if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        console.warn('⚠️ Missing Google API Key or CX, falling back to mock search');
        return await mockWebSearch(params.query, maxResults);
      }

      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.set('key', GOOGLE_API_KEY);
      searchUrl.searchParams.set('cx', GOOGLE_CX);
      searchUrl.searchParams.set('q', params.query);
      searchUrl.searchParams.set('num', maxResults.toString());
      searchUrl.searchParams.set('hl', params.region || 'en');

      console.log('🌐 Making Google Custom Search request:', searchUrl.toString().replace(GOOGLE_API_KEY, 'HIDDEN'));

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        throw new Error(`Google Search API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;

      const results: SearchResult[] = [];
      if (data.items) {
        data.items.forEach((item: any, index: number) => {
          results.push({
            title: item.title || 'Untitled',
            url: item.link || '',
            snippet: item.snippet || 'No description available',
            position: index + 1,
          });
        });
      }

      console.log(`✅ Found ${results.length} search results`);

      return {
        success: true,
        data: {
          query: params.query,
          results,
          total_results: results.length,
          search_time: new Date().toISOString(),
          region: params.region || 'en',
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error in Google Custom Search:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google search failed',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// Mock search function for fallback
async function mockWebSearch(query: string, maxResults: number): Promise<MCPToolResponse> {
  const mockResults: SearchResult[] = [
    {
      title: `${query} - Latest News and Updates`,
      url: `https://example-news.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Recent developments and news about ${query}.`,
      position: 1,
    },
    {
      title: `Complete Guide to ${query}`,
      url: `https://example-guide.com/${query.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `Comprehensive guide about ${query}.`,
      position: 2,
    },
    {
      title: `${query} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
      snippet: `Wikipedia article about ${query}.`,
      position: 3,
    },
  ].slice(0, maxResults);

  return {
    success: true,
    data: {
      query,
      results: mockResults,
      total_results: mockResults.length,
      search_time: new Date().toISOString(),
      region: 'us',
      note: 'Mock results - Configure GOOGLE_API_KEY + GOOGLE_CX for real search',
    },
    timestamp: new Date().toISOString(),
  };
}