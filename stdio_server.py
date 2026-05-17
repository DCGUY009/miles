from fastmcp import FastMCP

# Create a standalone MCP server (defaults to stdio transport)
mcp = FastMCP("my-standalone-server")

@mcp.tool()
async def get_system_status() -> str:
    """Returns the current system status (MCP Tool)."""
    return "Operational (Version 1.0.0)"

@mcp.tool()
async def calculate_sum(a: int, b: int) -> int:
    """Calculates the sum of two integers (MCP Tool)."""
    return a + b

if __name__ == "__main__":
    # This runs the MCP server on stdio transport, perfect for the Inspector!
    mcp.run()
