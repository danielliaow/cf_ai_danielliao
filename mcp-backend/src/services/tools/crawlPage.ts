import { MCPTool, MCPToolResponse } from '../../types';
import { load } from 'cheerio';

interface CrawlPageParams {
  url: string;
  extract_content?: boolean; // Extract main content vs full HTML
  max_length?: number; // Max characters to return (default: 5000)
}

export const crawlPageToolDefinition: MCPTool = {
  name: 'crawlPage',
  description: 'Crawl a web page and extract its main content for analysis',
  
  async execute(userId: string, params: CrawlPageParams): Promise<MCPToolResponse> {
    try {
      console.log('🕷️ Crawling page:', params.url);

      if (!params.url) {
        return {
          success: false,
          error: 'URL parameter is required',
          timestamp: new Date().toISOString(),
        };
      }

      // Validate URL
      let url: URL;
      try {
        url = new URL(params.url);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid URL format',
          timestamp: new Date().toISOString(),
        };
      }

      // Security check - only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          success: false,
          error: 'Only HTTP and HTTPS URLs are allowed',
          timestamp: new Date().toISOString(),
        };
      }

      const extractContent = params.extract_content !== false; // Default: true
      const maxLength = params.max_length || 5000;

      console.log('🌐 Fetching page content...');

      // Fetch the page with proper headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(params.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Crawler/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch page: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString(),
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return {
          success: false,
          error: 'URL does not return HTML content',
          timestamp: new Date().toISOString(),
        };
      }

      const html = await response.text();
      console.log(`📄 Retrieved ${html.length} characters of HTML`);

      let extractedData: any = {
        url: params.url,
        fetched_at: new Date().toISOString(),
        content_length: html.length,
      };

      if (extractContent) {
        // Use Cheerio to parse and extract content
        const $ = load(html);
        
        // Remove script and style elements
        $('script, style, nav, footer, aside, .advertisement, .ads').remove();
        
        // Extract metadata
        extractedData.title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
        extractedData.meta_description = $('meta[name="description"]').attr('content') || 
                                        $('meta[property="og:description"]').attr('content') || '';
        
        // Extract main content
        let mainContent = '';
        
        // Try to find main content areas
        const contentSelectors = [
          'main',
          'article', 
          '.content',
          '.main-content',
          '.post-content',
          '.entry-content',
          '#content',
          'body'
        ];
        
        for (const selector of contentSelectors) {
          const element = $(selector).first();
          if (element.length > 0) {
            mainContent = element.text().trim();
            if (mainContent.length > 200) { // Use this if we found substantial content
              break;
            }
          }
        }
        
        // If no main content found, use body text
        if (!mainContent || mainContent.length < 200) {
          mainContent = $('body').text().trim();
        }
        
        // Clean up whitespace
        mainContent = mainContent.replace(/\s+/g, ' ').trim();
        
        // Truncate if too long
        if (mainContent.length > maxLength) {
          mainContent = mainContent.substring(0, maxLength - 3) + '...';
        }
        
        extractedData.content = mainContent;
        extractedData.content_length = mainContent.length;
        
        // Extract headings
        const headings: string[] = [];
        $('h1, h2, h3').each((_: number, element: any) => {
          const heading = $(element).text().trim();
          if (heading && headings.length < 10) {
            headings.push(heading);
          }
        });
        extractedData.headings = headings;
        
        // Extract links
        const links: Array<{text: string, url: string}> = [];
        $('a[href]').each((_: number, element: any) => {
          const linkText = $(element).text().trim();
          const linkUrl = $(element).attr('href');
          if (linkText && linkUrl && links.length < 20) {
            // Convert relative URLs to absolute
            try {
              const absoluteUrl = new URL(linkUrl, params.url).toString();
              links.push({ text: linkText, url: absoluteUrl });
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
        extractedData.links = links;
        
        console.log(`✅ Extracted ${mainContent.length} characters of content`);
        
      } else {
        // Return raw HTML (truncated)
        extractedData.html = html.length > maxLength 
          ? html.substring(0, maxLength - 3) + '...'
          : html;
      }

      return {
        success: true,
        data: extractedData,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error crawling page:', error);
      
      let errorMessage = 'Failed to crawl page';
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Could not reach the website';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout: The website took too long to respond';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  },
};