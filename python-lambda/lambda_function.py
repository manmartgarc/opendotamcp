import httpx
from fastmcp import FastMCP
from mangum import Mangum


# Custom HTTP client that strips authentication from OpenDota API calls.
# This allows the MCP server to work with OpenDota's public, rate-limited endpoints
# without requiring API credentials.
class NoAuthClient(httpx.AsyncClient):
    """Client that strips any authentication headers or parameters"""

    async def send(self, request, *args, **kwargs):
        # Remove any auth headers
        auth_headers = ["authorization", "x-api-key", "api-key"]
        for header in auth_headers:
            if header in request.headers:
                del request.headers[header]

        # Remove api_key from query params
        if "api_key" in request.url.params:
            params = dict(request.url.params)
            del params["api_key"]
            request.url = request.url.copy_with(params=params)

        response = await super().send(request, *args, **kwargs)

        # Handle encoding issues only for OpenDota API responses
        if hasattr(response, "content") and isinstance(response.content, bytes):
            # Only apply encoding fix to OpenDota API URLs
            if "api.opendota.com" in str(request.url):
                try:
                    response.content.decode("utf-8")
                except UnicodeDecodeError:
                    # If UTF-8 decoding fails, try with error handling
                    response._content = response.content.decode(
                        "utf-8", errors="replace"
                    ).encode("utf-8")

        return response


def clean_openapi_spec_for_no_auth(spec):
    """Remove all authentication requirements from OpenAPI spec"""

    # Remove global security requirements
    if "security" in spec:
        del spec["security"]

    # Remove security schemes from components
    if "components" in spec:
        if "securitySchemes" in spec["components"]:
            del spec["components"]["securitySchemes"]

    # Remove security from all paths and operations
    if "paths" in spec:
        for path_item in spec["paths"].values():
            if isinstance(path_item, dict):
                for operation in path_item.values():
                    if isinstance(operation, dict) and "security" in operation:
                        del operation["security"]

    return spec


# Create a factory function to ensure fresh instances
def create_app():
    # Load OpenAPI spec fresh for each invocation
    with httpx.Client() as sync_client:
        openapi_spec = sync_client.get("https://api.opendota.com/api").json()

    # Clean the spec to remove all authentication
    openapi_spec = clean_openapi_spec_for_no_auth(openapi_spec)

    # Create an HTTP client for your API
    client = NoAuthClient(base_url="https://api.opendota.com/api")

    # Create the FastMCP server fresh for each invocation
    mcp_server = FastMCP.from_openapi(
        openapi_spec=openapi_spec,
        client=client,
        name="OpenDota MCP",
    )
    return mcp_server.http_app(path="/mcp", stateless_http=True, transport="http")


# Lambda handler that creates a fresh app for each invocation
def lambda_handler(event, context):
    app = create_app()
    mangum_handler = Mangum(app=app)
    return mangum_handler(event, context)


# For backwards compatibility
handler = lambda_handler

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(create_app(), host="localhost", port=8000)
