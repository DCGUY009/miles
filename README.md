# Miles

Miles is a friendly, approachable, and powerful System Operations and Security AI assistant built using the Model Context Protocol (MCP) and LangGraph. Named "Miles" because he always goes the extra mile for your system's health, this context-aware agent performs system diagnostics, monitors real-time metrics (CPU/RAM/Disk), checks for software updates, and reviews security configurations.

## Features

- **MCP Integration**: Dynamically load and manage Model Context Protocol servers in real-time.
- **Agentic Memory**: LangGraph agent retains conversation history for seamless context-aware interactions.
- **Real-time Diagnostics**: Utilize the backend APIs to fetch actual system metrics and run local system checks safely.
- **Modern UI**: A React-based interface with chat history persistence, dynamic Markdown rendering, and real-time execution traces.

## Project Structure

- `main.py`: The FastAPI server containing standard API routes and the MCP Server endpoint. It also houses the LangGraph ReAct agent.
- `chatbot-ui/`: A modern Vite + React application providing the chat interface and MCP Settings management.

## Prerequisites

- Python 3.9+
- Node.js 18+
- An OpenAI API Key (for the LLM reasoning agent)

## Setup and Installation

### 1. Backend Setup

1. Rename the provided `.env.example` file to `.env` in the root directory:
   ```bash
   mv .env.example .env
   ```
2. **IMPORTANT**: Open the new `.env` file and add your OpenAI API Key for the app to work:
   ```env
   OPENAI_API_KEY="your-api-key-here"
   ```
3. Ensure you have a virtual environment set up and activated:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On macOS/Linux
   ```
4. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn mcp langchain-mcp-adapters langchain-openai langgraph psutil python-dotenv
   ```
5. Start the backend server:
   ```bash
   python main.py
   ```
   *The server will run on http://0.0.0.0:8000.*

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd chatbot-ui
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open the local address provided by Vite (e.g., `http://localhost:5173`) in your browser.
2. Head to the **MCP Servers** page to ensure the local FastApiMCP server is enabled and its tools are successfully fetched.
3. Switch to the **Chatbot** page to start a conversation with Miles!
