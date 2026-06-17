import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const FIGMA_API_URL = 'https://api.figma.com/v1'

const server = new McpServer({
  name: 'figma-mcp',
  version: '1.0.0',
})

// Tool: Get file data
server.tool(
  'get_figma_file',
  'Get Figma file data including components, styles, and nodes',
  {
    file_key: z.string().describe('The Figma file key'),
    node_ids: z.array(z.string()).optional().describe('Specific node IDs to fetch'),
  },
  async ({ file_key, node_ids }) => {
    const token = process.env.FIGMA_ACCESS_TOKEN
    if (!token) {
      return { content: [{ type: 'text', text: 'FIGMA_ACCESS_TOKEN not set' }], isError: true }
    }

    const url = node_ids
      ? `${FIGMA_API_URL}/files/${file_key}?ids=${node_ids.join(',')}&depth=2`
      : `${FIGMA_API_URL}/files/${file_key}?depth=2`

    const res = await fetch(url, {
      headers: { 'X-Figma-Token': token },
    })

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `Figma API error: ${res.status}` }],
        isError: true,
      }
    }

    const data = await res.json()
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// Tool: Extract design tokens from Figma styles
server.tool(
  'extract_design_tokens',
  'Extract colors, typography, and spacing from Figma file',
  {
    file_key: z.string().describe('The Figma file key'),
  },
  async ({ file_key }) => {
    const token = process.env.FIGMA_ACCESS_TOKEN
    if (!token) {
      return { content: [{ type: 'text', text: 'FIGMA_ACCESS_TOKEN not set' }], isError: true }
    }

    const res = await fetch(`${FIGMA_API_URL}/files/${file_key}/styles`, {
      headers: { 'X-Figma-Token': token },
    })

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `Figma API error: ${res.status}` }],
        isError: true,
      }
    }

    const data = await res.json()
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// Tool: Get images from Figma
server.tool(
  'get_figma_images',
  'Export images from Figma nodes',
  {
    file_key: z.string().describe('The Figma file key'),
    node_ids: z.array(z.string()).describe('Node IDs to export'),
    format: z.enum(['svg', 'png', 'jpg']).default('svg'),
  },
  async ({ file_key, node_ids, format }) => {
    const token = process.env.FIGMA_ACCESS_TOKEN
    if (!token) {
      return { content: [{ type: 'text', text: 'FIGMA_ACCESS_TOKEN not set' }], isError: true }
    }

    const res = await fetch(
      `${FIGMA_API_URL}/images/${file_key}?ids=${node_ids.join(',')}&format=${format}&scale=2`,
      { headers: { 'X-Figma-Token': token } }
    )

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `Figma API error: ${res.status}` }],
        isError: true,
      }
    }

    const data = await res.json()
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Figma MCP Server running on stdio')
}

main().catch(console.error)
