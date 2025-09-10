#  Intelligent Document RAG Application

A powerful Retrieval-Augmented Generation (RAG) application that allows users to upload various document types (PDFs, images, text files, URLs) and ask intelligent questions about their content using OpenAI's GPT models.

##  Live Demo

** [Try the Application Live](https://rag-chat-eight.vercel.app)**

> *Experience the power of AI-driven document analysis and question-answering in real-time*

##  Features

### 📄 Multi-Format Document Support
- **PDF Files**: Extract and process text from PDF documents
- **Images**: OCR and text extraction from images (JPEG, PNG, GIF, WebP)
- **Text Files**: Direct text processing and ingestion
- **Web URLs**: Scrape and process content from web pages

###  Intelligent Question Answering
- **Contextual Responses**: Ask questions and get accurate answers based on your uploaded documents
- **Semantic Search**: Advanced vector similarity search for relevant content retrieval
- **Multi-Document Queries**: Ask questions across multiple uploaded documents
- **Conversation History**: Maintain context across multiple questions

###  User Management
- **Individual Collections**: Each user has their own private document collection
- **Secure Access**: User-based authentication and data isolation
- **Document Management**: View, delete, and organize your uploaded documents

##  Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Beautiful icon library
- **React Hooks**: Modern state management

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **LangChain**: Document processing and text splitting
- **OpenAI GPT-4**: Text generation and vision capabilities

### Vector Database
- **Qdrant**: High-performance vector database for semantic search
- **OpenAI Embeddings**: text-embedding-ada-002 for vector generation

### Deployment
- **Vercel**: Serverless deployment platform
- **Environment Variables**: Secure configuration management

##  Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API Key
- Qdrant Database (local or cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/rag-document-app.git
cd rag-document-app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Qdrant Database Configuration
QDRANT_URL=http://localhost:6333
# For Qdrant Cloud:
# QDRANT_URL=https://your-cluster-url.qdrant.io
# QDRANT_API_KEY=your_qdrant_api_key

# Clerk.js Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
```

### 4. Set Up Qdrant Database

#### Option A: Local Qdrant (Docker)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

#### Option B: Qdrant Cloud
1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
2. Create a new cluster
3. Get your cluster URL and API key
4. Update your `.env.local` file

### 5. Run the Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

##  Usage Guide

### 1. Document Upload
1. **Navigate** to the upload section
2. **Select** your document type (PDF, Image, Text, URL)
3. **Upload** or paste your content
4. **Wait** for processing confirmation

### 2. Ask Questions
1. **Go** to the chat interface
2. **Type** your question about the uploaded documents
3. **Receive** intelligent, context-aware answers
4. **Continue** the conversation for follow-up questions

### 3. Document Management
1. **View** all your uploaded documents
2. **Delete** documents you no longer need
3. **Monitor** processing status and metadata







**Built with ❤️ using Next.js, OpenAI, and Qdrant**

*Transform your documents into intelligent, conversational experiences!*
