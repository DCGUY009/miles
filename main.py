import asyncio
import subprocess
import psutil
import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi_mcp import FastApiMCP

# Langchain & Langgraph imports
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from mcp.client.streamable_http import streamable_http_client
from mcp.client.session import ClientSession
from langchain_mcp_adapters.tools import load_mcp_tools
from contextlib import AsyncExitStack

import os
from dotenv import load_dotenv

load_dotenv()

# 1. Create your standard FastAPI App
app = FastAPI(title="My APIs and MCP Server")

# Add CORS middleware to allow the Vite frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Define Real macOS System & Security Tools
@app.get("/api/system-stats")
async def get_system_stats() -> dict:
    """Returns real CPU, RAM, and Disk usage statistics of the current machine."""
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "cpu_percent": cpu,
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_percent": mem.percent,
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": disk.percent
    }

@app.get("/api/macos-security")
async def check_macos_security() -> dict:
    """Checks actual macOS security settings: FileVault, SIP, and Firewall."""
    def run_cmd(cmd: list[str]) -> str:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            return result.stdout.strip() or result.stderr.strip()
        except Exception as e:
            return str(e)
            
    # Run these blocking commands in a separate thread so we don't block the async event loop
    sip_status = await asyncio.to_thread(run_cmd, ["csrutil", "status"])
    fdesetup_status = await asyncio.to_thread(run_cmd, ["fdesetup", "status"])
    firewall_status = await asyncio.to_thread(run_cmd, ["/usr/libexec/ApplicationFirewall/socketfilterfw", "--getglobalstate"])
    
    return {
        "system_integrity_protection": sip_status,
        "filevault_encryption": fdesetup_status,
        "application_firewall": firewall_status
    }

@app.get("/api/pending-updates")
async def check_pending_updates() -> str:
    """Checks for pending macOS software updates which might contain security patches."""
    def run_update_check():
        try:
            # softwareupdate -l can take a long time, so we just return a summary or the raw output
            result = subprocess.run(["softwareupdate", "-l"], capture_output=True, text=True, check=False)
            output = result.stdout.strip()
            if "No new software available" in output:
                return "Your Mac is fully up to date. No pending security patches."
            return output
        except Exception as e:
            return str(e)
            
    return await asyncio.to_thread(run_update_check)

# 3. Create an MCP server using FastApiMCP
mcp = FastApiMCP(app)
mcp.mount_http()

# 4. Agent Endpoint
class ChatRequest(BaseModel):
    message: str
    enabled_servers: list[str] = []

class ServerToolsRequest(BaseModel):
    url: str

@app.post("/api/server-tools")
async def get_server_tools(req: ServerToolsRequest):
    """Fetches tools from a specific MCP server for the UI."""
    try:
        async with streamable_http_client(req.url) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.list_tools()
                return {"tools": [{"name": t.name, "description": t.description} for t in result.tools]}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """LangGraph agent that connects to the local MCP server over Streamable HTTP and streams traces and tokens."""
    if not os.getenv("OPENAI_API_KEY"):
        return {"response": "Error: OPENAI_API_KEY is not set in the environment."}
        
    async def event_generator():
        try:
            mcp_tools = []
            
            # Use AsyncExitStack to handle dynamic number of server connections
            async with AsyncExitStack() as stack:
                if req.enabled_servers:
                    yield f"data: {json.dumps({'type': 'trace', 'content': f'🚀 Connecting to {len(req.enabled_servers)} active MCP server(s)...'})}\n\n"
                    
                    for server_url in req.enabled_servers:
                        try:
                            # Enter context managers dynamically
                            (read_stream, write_stream, _) = await stack.enter_async_context(
                                streamable_http_client(server_url)
                            )
                            session = await stack.enter_async_context(
                                ClientSession(read_stream, write_stream)
                            )
                            await session.initialize()
                            
                            # Retrieve the tools exposed by this MCP server
                            tools = await load_mcp_tools(session)
                            mcp_tools.extend(tools)
                            
                        except Exception as e:
                            yield f"data: {json.dumps({'type': 'trace', 'content': f'⚠️ Failed to connect to {server_url}: {str(e)}'})}\n\n"
                            
                    yield f"data: {json.dumps({'type': 'trace', 'content': f'📦 Loaded a total of {len(mcp_tools)} tools.'})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'trace', 'content': '⚠️ No MCP servers enabled. Agent will act as a standard LLM.'})}\n\n"

                # Initialize the LLM
                llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
                
                # Create the ReAct agent with the MCP tools (or just standard agent if empty)
                agent = create_react_agent(llm, tools=mcp_tools) if mcp_tools else create_react_agent(llm, tools=[])
                
                # Stream events from LangGraph
                async for event in agent.astream_events({"messages": [("user", req.message)]}, version="v2"):
                    kind = event["event"]
                    
                    if kind == "on_chat_model_stream":
                        # Stream final answer tokens
                        content = event["data"]["chunk"].content
                        if isinstance(content, str) and content:
                            yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                            
                    elif kind == "on_tool_start":
                        tool_name = event["name"]
                        inputs = event["data"].get("input", {})
                        msg = f"🔨 Running Tool: {tool_name}\nInputs: {json.dumps(inputs)}"
                        yield f"data: {json.dumps({'type': 'trace', 'content': msg})}\n\n"
                        
                    elif kind == "on_tool_end":
                        tool_name = event["name"]
                        output = event["data"].get("output", "")
                        
                        # Parse output. Output might be an object, str, or ToolMessage
                        try:
                            if hasattr(output, 'content'):
                                out_str = str(output.content)
                            else:
                                out_str = str(output)
                        except Exception:
                            out_str = str(output)
                            
                        msg = f"✅ Tool Result ({tool_name}):\n{out_str}"
                        yield f"data: {json.dumps({'type': 'trace', 'content': msg})}\n\n"
                            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Agent Error: {str(e)}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Important: Run with enough workers or rely on standard async handling
    uvicorn.run(app, host="0.0.0.0", port=8000)
