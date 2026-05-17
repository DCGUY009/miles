import asyncio
from mcp.client.streamable_http import streamable_http_client
from mcp.client.session import ClientSession

async def main():
    try:
        async with streamable_http_client("http://localhost:8000/mcp") as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                print("Initialized")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
