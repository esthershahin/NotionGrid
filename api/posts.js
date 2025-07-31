// api/posts.js - Vercel serverless function
import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query Notion database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [
        {
          property: 'Date', // Your date property name in Notion
          direction: 'descending',
        },
      ],
      page_size: 30, // Limit to 30 posts
      filter: {
        and: [
          {
            property: 'Published', // Optional: filter by published status
            checkbox: {
              equals: true,
            },
          },
        ],
      },
    });

    // Transform Notion data to our format
    const posts = response.results.map((page, index) => {
      const properties = page.properties;
      
      // Extract media URL (file or external URL)
      let mediaUrl = null;
      let mediaType = 'image';
      
      if (properties.Media) {
        if (properties.Media.files && properties.Media.files.length > 0) {
          const file = properties.Media.files[0];
          if (file.type === 'file') {
            mediaUrl = file.file.url;
          } else if (file.type === 'external') {
            mediaUrl = file.external.url;
          }
          
          // Determine media type based on URL or file extension
          if (mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm'))) {
            mediaType = 'video';
          }
        }
      }

      // Extract caption
      let caption = '';
      if (properties.Caption && properties.Caption.rich_text) {
        caption = properties.Caption.rich_text
          .map(text => text.plain_text)
          .join('');
      }

      // Extract date
      let date = new Date().toISOString();
      if (properties.Date && properties.Date.date) {
        date = properties.Date.date.start;
      }

      return {
        id: page.id,
        media: mediaUrl,
        caption: caption || `Post ${index + 1}`,
        date: date,
        type: mediaType,
        notionUrl: page.url,
      };
    });

    // Return successful response
    res.status(200).json({
      success: true,
      posts: posts,
      total: posts.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Notion API Error:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts from Notion',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper function to validate environment variables
export function validateEnv() {
  const required = ['NOTION_TOKEN', 'NOTION_DATABASE_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}