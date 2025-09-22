# 🛠️ Embr AI Assistant - Complete Tools Reference

## Overview

The Embr AI Assistant now includes **15 powerful MCP tools** organized into 6 categories. These tools can be chained together to create sophisticated workflows for productivity, document management, and automation.

## 🔧 Tool Categories & Complete List

### 📅 **Calendar Management Tools**
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `getTodaysEvents` | Fetch today's calendar events | None required |
| `createCalendarEvent` | Create new calendar events | `summary`, `startDateTime`, `endDateTime` |

### 📧 **Email Integration Tools** 
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `getEmails` | Access Gmail messages with filtering | `query`, `maxResults` |
| `getLastTenMails` | Get recent email messages | `query` (optional) |

### 🌐 **Web Research Tools**
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `crawlPage` | Extract content from web pages | `url` |
| `searchWeb` | Search the internet for information | `query`, `numResults` |

### 📁 **Local File System Tools** (New!)
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `readFile` | Read files from Documents/Desktop/Downloads | `filePath`, `encoding` |
| `writeFile` | Create/write files securely | `filePath`, `content`, `encoding` |
| `listDirectory` | Browse directory contents with filtering | `dirPath`, `includeDetails`, `fileExtensions` |

### ☁️ **Google Drive Integration Tools** (New!)
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `searchGoogleDrive` | Search files across Google Drive | `query`, `mimeType`, `maxResults`, `includeContent` |
| `getGoogleDriveFile` | Download/process Drive files by ID | `fileId`, `exportFormat`, `includeMetadata` |
| `createGoogleDriveFile` | Upload new files to Drive | `name`, `content`, `mimeType`, `parentFolderId` |

### 📄 **Document Processing & Creation Tools** (New!)
| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `processDocument` | AI-powered document analysis | `input`, `operations`, `options` |
| `createDocument` | AI-assisted document generation | `type`, `title`, `aiGeneration`, `destination` |
| `generateContentWithAI` | Pure AI content creation | `prompt`, `contentType`, `style`, `length` |

## 🚀 Advanced Tool Chaining Examples

### **Example 1: Research & Report Workflow**
```
User: "Research sustainable energy trends and create a comprehensive report"

Tool Chain:
1. searchWeb("sustainable energy trends 2024") 
2. crawlPage(top_results_urls)
3. processDocument(extracted_content, operations=["summarize", "extract_keywords"])
4. generateContentWithAI(research_summary, contentType="report", style="formal")
5. createDocument(type="markdown", title="Sustainable Energy Report 2024")
6. createGoogleDriveFile(final_report, "Reports/Energy Research")
```

### **Example 2: Email Analysis & Response**
```
User: "Analyze my recent emails about the project and create a status summary"

Tool Chain:
1. getLastTenMails(query="project status")
2. processDocument(email_content, operations=["extract_keywords", "analyze_sentiment"])
3. generateContentWithAI(analysis_results, contentType="summary", style="professional")
4. writeFile("Documents/project-status-summary.md", summary_content)
```

### **Example 3: Document Processing Pipeline**
```
User: "Take all PDFs in my Documents, analyze them, and create a knowledge base"

Tool Chain:
1. listDirectory("Documents", fileExtensions=[".pdf"])
2. For each PDF: processDocument(file_path, operations=["extract_text", "summarize", "extract_keywords"])
3. generateContentWithAI(combined_summaries, contentType="knowledge_base", style="technical")
4. createDocument(type="html", title="Knowledge Base", destination="google_drive")
```

## 📊 **Tool Operation Details**

### processDocument Operations
| Operation | Description | Output |
|-----------|-------------|---------|
| `extract_text` | Get plain text content | Raw text content |
| `summarize` | AI-generated summary | Condensed summary |
| `analyze_structure` | Document structure analysis | Headings, paragraphs, formatting |
| `extract_metadata` | File metadata and statistics | Word count, reading time, etc. |
| `count_words` | Word and character counts | Numerical statistics |
| `detect_language` | Language detection | Detected language |
| `extract_keywords` | Key terms and phrases | Top keywords array |
| `analyze_sentiment` | Sentiment analysis | Positive/negative/neutral + confidence |

### Document Creation Formats
| Format | Extension | Best For |
|--------|-----------|----------|
| `text` | .txt | Simple documents, notes |
| `markdown` | .md | Technical docs, README files |
| `html` | .html | Web content, rich formatting |
| `json` | .json | Structured data, APIs |
| `csv` | .csv | Data exports, spreadsheets |

### AI Content Styles
| Style | Description | Use Cases |
|-------|-------------|-----------|
| `formal` | Professional, structured | Business reports, proposals |
| `casual` | Conversational, relaxed | Blog posts, social media |
| `technical` | Precise, detailed | Documentation, manuals |
| `creative` | Engaging, imaginative | Marketing content, stories |
| `academic` | Research-oriented | Papers, analysis |
| `persuasive` | Compelling, convincing | Sales copy, presentations |

## 🔒 **Security & Access Control**

### File System Security
- **Sandboxed Access**: Only Documents, Desktop, Downloads folders
- **Path Validation**: All file paths validated and sanitized
- **Extension Filtering**: Support for safe file types
- **Directory Traversal Protection**: Prevents unauthorized access

### Google Drive Security
- **OAuth 2.0 Integration**: Secure authentication via Google
- **Scoped Permissions**: Only necessary Drive permissions
- **User Consent**: All actions require user authorization
- **Session Management**: Secure token handling

### AI Processing Security  
- **Content Filtering**: Safe content generation
- **Input Validation**: All prompts validated
- **Rate Limiting**: API usage limits enforced
- **Error Handling**: Graceful failure with safe defaults

## 💡 **Best Practices for Tool Usage**

### 1. **Be Specific in Requests**
✅ **Good**: "Read Documents/quarterly-report.pdf and extract key financial metrics"
❌ **Avoid**: "Read some document"

### 2. **Chain Tools Logically**
✅ **Good**: "Search Drive → Get file → Process content → Generate summary → Save result"
❌ **Avoid**: Disconnected single tool calls

### 3. **Use Appropriate Formats**
✅ **Good**: "Create markdown for technical docs, HTML for presentations"
❌ **Avoid**: Using wrong format for purpose

### 4. **Leverage AI Operations**
✅ **Good**: Combine multiple operations: `["extract_text", "summarize", "extract_keywords"]`
❌ **Avoid**: Single operation when multiple would be helpful

### 5. **Organize Output Destinations**
✅ **Good**: Specify folders: "Save to Drive/Projects/Reports/"
❌ **Avoid**: Cluttering root directories

## 🎯 **Common Workflows Supported**

### **Content Creation Workflows**
- Blog post generation from research
- Technical documentation from notes  
- Marketing content with brand guidelines
- Social media content planning
- Email template creation

### **Document Management Workflows**  
- PDF analysis and summarization
- File organization and tagging
- Content migration between platforms
- Archive search and retrieval
- Batch document processing

### **Research & Analysis Workflows**
- Web research compilation
- Competitive analysis reports
- Market research summaries
- Academic paper analysis
- News monitoring and alerts

### **Productivity Workflows**
- Meeting notes processing
- Action item extraction
- Project status reporting
- Calendar optimization
- Email management automation

## 🔄 **Tool Integration Matrix**

| Start Tool | Chain With | Result |
|------------|------------|---------|
| `searchWeb` | `processDocument` → `createDocument` | Research Reports |
| `getEmails` | `processDocument` → `generateContentWithAI` | Email Summaries |
| `listDirectory` | `readFile` → `processDocument` | File Analysis |
| `searchGoogleDrive` | `getGoogleDriveFile` → `processDocument` | Drive Content Analysis |
| `generateContentWithAI` | `createDocument` → `createGoogleDriveFile` | Content Publishing |

## 🚀 **Performance & Scalability**

### **Optimizations Implemented**
- **Streaming Responses**: Real-time output for long operations
- **Parallel Processing**: Multiple tools can run concurrently  
- **Caching**: Frequently accessed content cached
- **Rate Limiting**: Prevents API abuse
- **Error Recovery**: Graceful handling of failures

### **Resource Management**
- **Memory Efficient**: Large files processed in chunks
- **Network Optimized**: Minimal API calls
- **Storage Smart**: Temporary files auto-cleaned
- **Token Aware**: AI usage optimized

## 📈 **Usage Analytics & Monitoring**

The system tracks:
- **Tool Usage**: Most/least used tools
- **Success Rates**: Tool execution success/failure
- **Performance Metrics**: Response times, throughput
- **Error Patterns**: Common failure points
- **User Patterns**: Workflow preferences

---

**🎉 Your Embr AI Assistant is now equipped with 15 powerful, chainable tools that can handle complex document workflows, research tasks, content creation, and productivity automation!**

For detailed usage examples, see: `FILE_DOCUMENT_TOOLS_USAGE.md`