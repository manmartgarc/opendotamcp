# Contributing

This is a **showcase/demonstration project** showing how to transform an OpenAPI REST API into an MCP server using FastMCP.

## Project Status

- **Maintenance Level**: Limited (showcase project)
- **Active Development**: No
- **Bug Fixes**: Accepted
- **New Features**: Not planned

## Getting Started

### Local Development

```bash
# Install dependencies
npm run install:deps

# Start local MCP server
npm run dev:local
```

The server will be available at `http://127.0.0.1:8000/mcp`

### Testing

```bash
# Build TypeScript
npm run build

# Preview CDK changes
npm run diff
```

## Forking & Adapting

This project is designed to be forked and adapted for your own use cases. Feel free to:
- Modify the OpenAPI spec handling
- Customize the MCP tool generation
- Adapt the AWS deployment configuration
- Extend with additional features

## Blog Post

See the accompanying blog post for architectural insights and best practices on building MCP servers from OpenAPI specifications.

## Questions?

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions
- Review the code comments in `python-lambda/lambda_function.py` and `lib/fastmcp-opendota-stack.ts`
- Refer to [FastMCP documentation](https://gofastmcp.com)
