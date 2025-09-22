# 📁 File & Document Tools Usage Guide

## Overview

The Embr AI Assistant now includes powerful file management, Google Drive integration, and document processing capabilities. These tools can be chained together to create sophisticated document workflows.

## 🗂️ Local File System Tools

### `readFile` - Read Local Files
Access files from your Documents, Desktop, or Downloads folders.

**Example Usage:**
```
"Read the contents of my resume.txt file from the Documents folder"
"Show me what's in Desktop/project-notes.md"
"Can you read Downloads/report.pdf and tell me what it's about?"
```

**Parameters:**
- `filePath`: Path relative to home directory (e.g., "Documents/resume.txt")
- `encoding`: File encoding (utf8, base64, binary)

### `writeFile` - Create Local Files
Create new files or update existing ones in safe directories.

**Example Usage:**
```
"Create a new file called meeting-notes.txt in Documents with today's meeting summary"
"Save this text as a markdown file in Desktop/projects/"
"Write a JSON file with the data we just processed"
```

**Parameters:**
- `filePath`: Destination path
- `content`: File content to write
- `encoding`: File encoding (default: utf8)
- `createDirectories`: Auto-create parent directories

### `listDirectory` - Browse Directories
List and filter files in directories.

**Example Usage:**
```
"Show me all PDF files in my Documents folder"
"List everything in Downloads with file details"
"What text files are in Desktop/projects?"
```

**Parameters:**
- `dirPath`: Directory to list (default: "Documents")
- `includeDetails`: Include file size, dates, etc.
- `fileExtensions`: Filter by extensions (e.g., ['.pdf', '.txt'])

## ☁️ Google Drive Integration

### `searchGoogleDrive` - Search Drive Files
Find files across your entire Google Drive using various criteria.

**Example Usage:**
```
"Search for all PDF presentations from this year"
"Find documents containing 'quarterly report'"
"Show me all spreadsheets modified in the last month"
```

**Parameters:**
- `query`: Search terms (filename, content, or advanced syntax)
- `mimeType`: Filter by file type
- `maxResults`: Number of results (default: 20)
- `orderBy`: Sort order (modifiedTime, name, etc.)
- `includeContent`: Preview file content

### `getGoogleDriveFile` - Download Drive Files
Download and process specific Google Drive files by ID.

**Example Usage:**
```
"Download the content of this Google Doc: [file-id]"
"Get the data from this spreadsheet and summarize it"
"Extract text from this presentation file"
```

**Parameters:**
- `fileId`: Google Drive file ID
- `exportFormat`: Export format for Google Workspace files
- `includeMetadata`: Include detailed file information

### `createGoogleDriveFile` - Upload to Drive
Create new files directly in Google Drive.

**Example Usage:**
```
"Create a new Google Doc with this meeting summary"
"Save this analysis as a text file in my Drive"
"Upload this JSON data as a new file in the reports folder"
```

**Parameters:**
- `name`: File name
- `content`: File content
- `mimeType`: File type
- `parentFolderId`: Destination folder (optional)
- `description`: File description

## 📄 Document Processing & Creation

### `processDocument` - AI-Powered Analysis
Analyze documents with advanced AI capabilities.

**Operations Available:**
- **extract_text**: Get plain text content
- **summarize**: AI-generated summary
- **analyze_structure**: Document structure analysis
- **extract_metadata**: File metadata and statistics
- **count_words**: Word and character counts
- **detect_language**: Language detection
- **extract_keywords**: Key terms and phrases
- **analyze_sentiment**: Sentiment analysis

**Example Usage:**
```
"Analyze this document and give me a summary with keywords"
"Process my resume and extract the key skills mentioned"
"Analyze the sentiment of this customer feedback document"
"Get metadata and structure analysis of this report"
```

**Input Sources:**
- Direct content: `"type": "content", "value": "text here"`
- Local file: `"type": "file_path", "value": "Documents/file.txt"`
- Google Drive: `"type": "google_drive_id", "value": "drive-file-id"`

### `createDocument` - AI-Assisted Creation
Generate documents with AI assistance, templates, and multiple formats.

**Document Types:**
- **text**: Plain text documents
- **markdown**: Markdown formatted documents  
- **html**: HTML web documents
- **json**: Structured JSON data
- **csv**: Comma-separated values

**AI Generation Options:**
- **Style**: formal, casual, technical, creative, academic
- **Length**: short, medium, long, detailed
- **Content Types**: article, report, proposal, email, letter

**Templates Available:**
- **letter**: Business letter format
- **report**: Technical report structure
- **proposal**: Project proposal template
- **memo**: Memorandum format

**Example Usage:**
```
"Create a formal business proposal for a new project using AI"
"Generate a technical report about our findings in markdown format"
"Write a casual blog post about productivity tips"
"Create a meeting memo template and save it to Google Drive"
```

### `generateContentWithAI` - Pure Content Generation
Generate high-quality content using advanced AI.

**Example Usage:**
```
"Generate a 1000-word article about sustainable technology"
"Write a technical documentation for our new API"
"Create email templates for customer onboarding"
"Generate creative content for social media campaigns"
```

## 🔄 Chaining Tools Together

The real power comes from chaining these tools together for complex workflows:

### Example Workflow 1: Document Analysis Pipeline
```
1. "Search Google Drive for quarterly reports"
2. "Download the Q3 report and analyze its content"
3. "Extract key metrics and create a summary"
4. "Save the analysis as a new document in Drive"
```

### Example Workflow 2: Content Creation Pipeline  
```
1. "Read my project notes from Documents/ideas.txt"
2. "Generate a formal proposal based on these notes"
3. "Create the proposal in HTML format"
4. "Upload the final proposal to Google Drive in the clients folder"
```

### Example Workflow 3: Research & Documentation
```
1. "List all research files in Documents/research/"
2. "Process each PDF file and extract key findings"
3. "Generate a comprehensive research summary"
4. "Create a markdown document with citations and save locally"
```

## 🔒 Security Features

- **Sandboxed File Access**: Only Documents, Desktop, Downloads folders
- **Google OAuth Integration**: Secure Drive access with user permissions
- **Input Validation**: All file paths and content validated
- **Error Handling**: Graceful failure with helpful error messages
- **Content Filtering**: Safe content processing and generation

## 💡 Tips for Best Results

1. **Be Specific**: "Analyze Documents/report.pdf and extract financial data" vs "analyze document"

2. **Chain Operations**: "Read this file, summarize it, and create a new document with the summary"

3. **Use Filters**: "Search Drive for PDFs modified this month containing 'budget'"

4. **Specify Formats**: "Create a markdown document" vs "create a document"

5. **Include Context**: "Generate a formal proposal for a mobile app development project"

## 🚀 Advanced Use Cases

### Document Automation
- Automatic report generation from data files
- Content localization and translation workflows
- Document format conversion pipelines
- Batch document processing and analysis

### Knowledge Management
- Personal document search and organization
- Research paper analysis and summarization  
- Meeting notes processing and action item extraction
- Content archival and retrieval systems

### Content Creation
- Blog post generation from research notes
- Technical documentation from code comments
- Marketing content creation with brand guidelines
- Educational material development

## 🤝 Integration with Other Tools

These file and document tools work seamlessly with existing Embr capabilities:

- **Calendar Integration**: Create meeting summaries, schedule follow-ups
- **Email Tools**: Process email attachments, generate responses
- **Web Research**: Save research findings, create reports
- **Voice Features**: Dictate content, listen to document summaries

The assistant can intelligently choose which tools to use based on your request, creating powerful automated workflows that save time and enhance productivity.