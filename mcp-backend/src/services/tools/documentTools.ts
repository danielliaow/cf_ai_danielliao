import { MCPTool, MCPToolResponse } from '../../types';
import { GoogleAuthService } from '../googleAuth';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';

export const processDocumentToolDefinition: MCPTool = {
  name: 'processDocument',
  description: 'Process and analyze document content with AI-powered analysis including summarization, keyword extraction, and sentiment analysis',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { 
        input, 
        operations = ["extract_text"], 
        options = {} 
      } = params || {};

      if (!input || !input.type || !input.value) {
        throw new Error('input parameter with type and value is required');
      }

      const { 
        summaryLength = "medium", 
        maxKeywords = 10, 
        includeStatistics = true 
      } = options;

      // Step 1: Get document content
      let content: string;
      let metadata: any = {};

      switch (input.type) {
        case "content":
          content = input.value;
          metadata.source = "direct_input";
          break;
          
        case "file_path":
          const result = await readFileFromPath(input.value);
          content = result.content;
          metadata = { ...metadata, ...result.metadata };
          break;
          
        case "google_drive_id":
          const auth = await GoogleAuthService.getAuthenticatedClient(userId);
          const driveResult = await readFileFromGoogleDrive(input.value, auth);
          content = driveResult.content;
          metadata = { ...metadata, ...driveResult.metadata };
          break;
          
        default:
          throw new Error('Invalid input type. Supported types: content, file_path, google_drive_id');
      }

      // Step 2: Process the content based on requested operations
      const results: any = {
        metadata,
        operations: {}
      };

      for (const operation of operations) {
        switch (operation) {
          case "extract_text":
            results.operations.text = content;
            break;
            
          case "extract_metadata":
            results.operations.metadata = await extractDocumentMetadata(content);
            break;
            
          case "count_words":
            results.operations.wordCount = countWords(content);
            break;
            
          case "analyze_structure":
            results.operations.structure = analyzeDocumentStructure(content);
            break;
            
          case "detect_language":
            results.operations.language = detectLanguage(content);
            break;
            
          case "extract_keywords":
            results.operations.keywords = extractKeywords(content, maxKeywords);
            break;
            
          case "summarize":
            if (!process.env.GEMINI_API_KEY) {
              results.operations.summary = "AI summarization requires Gemini API key";
            } else {
              results.operations.summary = await summarizeWithAI(
                content, 
                summaryLength, 
                process.env.GEMINI_API_KEY
              );
            }
            break;
            
          case "analyze_sentiment":
            if (!process.env.GEMINI_API_KEY) {
              results.operations.sentiment = "Sentiment analysis requires Gemini API key";
            } else {
              results.operations.sentiment = await analyzeSentimentWithAI(
                content, 
                process.env.GEMINI_API_KEY
              );
            }
            break;
        }
      }

      // Add statistics if requested
      if (includeStatistics) {
        results.statistics = {
          characterCount: content.length,
          wordCount: countWords(content),
          paragraphCount: content.split('\n\n').filter(p => p.trim().length > 0).length,
          lineCount: content.split('\n').length,
          estimatedReadingTime: Math.ceil(countWords(content) / 200) // 200 words per minute
        };
      }

      return {
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document processing failed',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const createDocumentToolDefinition: MCPTool = {
  name: 'createDocument',
  description: 'Create new documents with AI assistance, templates, and various output formats',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const {
        type = "text",
        title,
        content = "",
        aiGeneration,
        destination,
        template,
        formatting = {}
      } = params || {};

      if (!title || !destination) {
        throw new Error('title and destination parameters are required');
      }

      let documentContent = content;

      // Step 1: Generate content with AI if requested
      if (aiGeneration?.enabled && aiGeneration.prompt) {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('Gemini API key required for AI content generation');
        }
        
        documentContent = await generateContentWithAI(
          aiGeneration.prompt,
          aiGeneration.style || "formal",
          aiGeneration.length || "medium",
          process.env.GEMINI_API_KEY
        );
      }

      // Step 2: Apply template if specified
      if (template?.name && template.name !== "custom") {
        documentContent = applyTemplate(
          template.name,
          documentContent,
          title,
          template.variables || {}
        );
      }

      // Step 3: Format document based on type
      const formattedDocument = formatDocument(
        type,
        documentContent,
        title,
        formatting
      );

      // Step 4: Save document to specified destination
      let result;
      if (destination.type === "local_file") {
        result = await saveLocalFile(formattedDocument, destination, type);
      } else if (destination.type === "google_drive") {
        const auth = await GoogleAuthService.getAuthenticatedClient(userId);
        result = await saveToGoogleDrive(
          formattedDocument,
          destination,
          title,
          type,
          auth
        );
      } else {
        throw new Error('Invalid destination type. Supported: local_file, google_drive');
      }

      return {
        success: true,
        data: {
          title,
          type,
          contentLength: formattedDocument.length,
          wordCount: countWords(formattedDocument),
          destination: result,
          preview: formattedDocument.substring(0, 200) + (formattedDocument.length > 200 ? "..." : ""),
          statistics: {
            characterCount: formattedDocument.length,
            wordCount: countWords(formattedDocument),
            paragraphCount: formattedDocument.split('\n\n').filter(p => p.trim().length > 0).length,
            estimatedReadingTime: Math.ceil(countWords(formattedDocument) / 200)
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document creation failed',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const generateContentWithAIToolDefinition: MCPTool = {
  name: 'generateContentWithAI',
  description: 'Generate high-quality content using AI based on prompts, style preferences, and target audience',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const {
        prompt,
        contentType,
        style = "formal",
        length = "medium", 
        audience,
        additionalContext,
        includeOutline = false
      } = params || {};

      if (!prompt || !contentType) {
        throw new Error('prompt and contentType parameters are required');
      }

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key required for content generation');
      }

      const generatedContent = await generateContentWithAI(
        prompt,
        style,
        length,
        process.env.GEMINI_API_KEY,
        {
          contentType,
          audience,
          additionalContext,
          includeOutline
        }
      );

      // Analyze the generated content
      const wordCount = countWords(generatedContent);
      const characterCount = generatedContent.length;
      const estimatedReadingTime = Math.ceil(wordCount / 200);
      const keywords = extractKeywords(generatedContent, 10);

      return {
        success: true,
        data: {
          content: generatedContent,
          metadata: {
            contentType,
            style,
            length,
            audience,
            wordCount,
            characterCount,
            estimatedReadingTime: `${estimatedReadingTime} minute${estimatedReadingTime > 1 ? 's' : ''}`,
            keywords: keywords.slice(0, 5), // Top 5 keywords
            paragraphCount: generatedContent.split('\n\n').filter(p => p.trim().length > 0).length
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating content with AI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content generation failed',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// Helper functions
async function readFileFromPath(filePath: string) {
  const homeDir = require('os').homedir();
  const absolutePath = path.resolve(homeDir, filePath);
  
  // Security check
  const allowedPaths = [
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Downloads')
  ];
  
  const isAllowed = allowedPaths.some(allowedPath => 
    absolutePath.startsWith(allowedPath)
  );
  
  if (!isAllowed) {
    throw new Error('Access denied. File must be in Documents, Desktop, or Downloads folder.');
  }
  
  const content = await fs.readFile(absolutePath, 'utf8');
  const stats = await fs.stat(absolutePath);
  
  return {
    content,
    metadata: {
      source: "local_file",
      filePath: absolutePath,
      size: stats.size,
      modified: stats.mtime.toISOString()
    }
  };
}

async function readFileFromGoogleDrive(fileId: string, auth: any): Promise<{ content: string; metadata: any }> {
  const drive = google.drive({ version: 'v3', auth });

  const file = await drive.files.get({ fileId, fields: 'name,mimeType,size,modifiedTime' });
  let content: any;

  if (file.data.mimeType?.startsWith('application/vnd.google-apps.')) {
    const response = await drive.files.export({ fileId, mimeType: 'text/plain' });
    content = response.data;
  } else {
    const response = await drive.files.get({ fileId, alt: 'media' });
    content = response.data;
  }

  return {
    content: Buffer.isBuffer(content) ? content.toString('utf-8') : String(content || ''),
    metadata: {
      source: "google_drive",
      fileId,
      name: file.data.name,
      mimeType: file.data.mimeType,
      size: file.data.size,
      modified: file.data.modifiedTime
    }
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function analyzeDocumentStructure(text: string) {
  const lines = text.split('\n');
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  // Simple heading detection
  const headings = lines.filter((line, index) => {
    const nextLine = lines[index + 1];
    return line.length < 100 && line.length > 0 && nextLine && nextLine.length > 0;
  });

  return {
    totalLines: lines.length,
    totalParagraphs: paragraphs.length,
    potentialHeadings: headings.length,
    averageParagraphLength: paragraphs.length > 0 ? 
      Math.round(paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length) : 0
  };
}

function detectLanguage(text: string): string {
  const sample = text.toLowerCase().substring(0, 1000);
  
  if (sample.match(/\b(the|and|is|in|to|of|a|for|as|with|that)\b/g)) {
    return "English";
  }
  
  return "Unknown";
}

function extractKeywords(text: string, maxKeywords: number): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const frequency: { [key: string]: number } = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

async function extractDocumentMetadata(content: string) {
  return {
    wordCount: countWords(content),
    characterCount: content.length,
    paragraphCount: content.split('\n\n').filter(p => p.trim().length > 0).length,
    estimatedReadingTime: Math.ceil(countWords(content) / 200)
  };
}

async function summarizeWithAI(content: string, length: string, apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const lengthInstruction = {
      short: "in 2-3 sentences",
      medium: "in 1-2 paragraphs", 
      long: "in 3-4 paragraphs"
    }[length] || "in 1-2 paragraphs";

    const prompt = `Please summarize the following text ${lengthInstruction}:\n\n${content}`;
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  } catch (error) {
    return `AI summarization failed: ${error}`;
  }
}

async function generateContentWithAI(
  prompt: string, 
  style: string, 
  length: string, 
  apiKey: string,
  options?: any
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const lengthMap = {
    short: "200-400 words",
    medium: "500-800 words", 
    long: "800-1200 words",
    detailed: "1200+ words"
  };

  let fullPrompt = `Write a ${style} ${options?.contentType || 'document'} with approximately ${lengthMap[length as keyof typeof lengthMap] || '500-800 words'}.

${options?.audience ? `Target audience: ${options.audience}\n` : ''}
${options?.additionalContext ? `Additional context: ${options.additionalContext}\n` : ''}
${options?.includeOutline ? 'Please include an outline before the main content.\n' : ''}

Topic/Prompt: ${prompt}

Please provide well-structured, coherent content that matches the specified style and length.`;

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

async function analyzeSentimentWithAI(content: string, apiKey: string): Promise<any> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Analyze the sentiment of the following text and provide:
  1. Overall sentiment (positive, negative, neutral)
  2. Confidence score (0-1)
  3. Key emotional indicators
  4. Brief explanation
  
  Format your response as JSON.
  
  Text: ${content.substring(0, 2000)}`; // Limit for API
  
  const result = await model.generateContent(prompt);
  
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { analysis: result.response.text() };
  }
}

function applyTemplate(templateName: string, content: string, title: string, variables: any): string {
  const templates = {
    letter: `
{{date}}

{{recipient_name}}
{{recipient_address}}

Dear {{recipient_name}},

${content}

Sincerely,
{{sender_name}}
    `,
    report: `
# ${title}

**Date:** {{date}}
**Author:** {{author}}

## Executive Summary

${content}

## Conclusion

{{conclusion}}
    `,
    proposal: `
# ${title}

**Prepared for:** {{client_name}}
**Prepared by:** {{company_name}}
**Date:** {{date}}

## Project Overview

${content}

## Budget: {{budget}}
## Timeline: {{timeline}}
    `
  };

  let template = templates[templateName as keyof typeof templates] || content;
  
  // Apply variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(placeholder, String(value));
  }
  
  // Add current date if not provided
  if (!variables.date) {
    const currentDate = new Date().toLocaleDateString();
    template = template.replace(/\{\{date\}\}/g, currentDate);
  }

  return template;
}

function formatDocument(type: string, content: string, title: string, formatting: any): string {
  const { includeHeader = true, includeFooter = false } = formatting;

  let formattedContent = content;

  switch (type) {
    case "markdown":
      if (includeHeader) {
        formattedContent = `# ${title}\n\n*Generated on ${new Date().toLocaleDateString()}*\n\n${formattedContent}`;
      }
      break;

    case "html":
      formattedContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 2em; }
    h1 { color: #333; border-bottom: 2px solid #333; }
  </style>
</head>
<body>
  ${includeHeader ? `<h1>${title}</h1>\n  <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>` : ''}
  ${formattedContent.replace(/\n/g, '<br>\n')}
  ${includeFooter ? `<footer><hr><p>Generated by Embr AI Assistant</p></footer>` : ''}
</body>
</html>`;
      break;

    case "json":
      formattedContent = JSON.stringify({
        title,
        content,
        created: new Date().toISOString(),
        metadata: { type, formatting }
      }, null, 2);
      break;

    default: // text
      if (includeHeader) {
        formattedContent = `${title}\n${'='.repeat(title.length)}\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${formattedContent}`;
      }
  }

  return formattedContent;
}

async function saveLocalFile(content: string, destination: any, type: string): Promise<any> {
  const homeDir = require('os').homedir();
  const basePath = destination.path || 'Documents';
  const filename = destination.filename || `document_${Date.now()}.${getFileExtension(type)}`;
  
  const fullPath = path.resolve(homeDir, basePath, filename);
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  
  // Write file
  await fs.writeFile(fullPath, content, 'utf8');
  
  const stats = await fs.stat(fullPath);
  
  return {
    type: "local_file",
    path: fullPath,
    size: stats.size,
    created: stats.birthtime.toISOString()
  };
}

async function saveToGoogleDrive(
  content: string, 
  destination: any, 
  title: string, 
  type: string,
  auth: any
): Promise<any> {
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata: any = {
    name: destination.filename || `${title}.${getFileExtension(type)}`
  };

  if (destination.path) {
    fileMetadata.parents = [destination.path];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: getMimeType(type),
      body: content
    },
    fields: 'id,name,webViewLink'
  });

  return {
    type: "google_drive",
    id: response.data.id,
    name: response.data.name,
    webViewLink: response.data.webViewLink
  };
}

function getFileExtension(type: string): string {
  const extensions = {
    text: 'txt',
    markdown: 'md',
    html: 'html',
    json: 'json',
    csv: 'csv'
  };
  return extensions[type as keyof typeof extensions] || 'txt';
}

function getMimeType(type: string): string {
  const mimeTypes = {
    text: 'text/plain',
    markdown: 'text/markdown',
    html: 'text/html',
    json: 'application/json',
    csv: 'text/csv'
  };
  return mimeTypes[type as keyof typeof mimeTypes] || 'text/plain';
}