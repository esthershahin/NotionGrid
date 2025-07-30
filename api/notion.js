const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 30
    });

    const posts = response.results.map(page => ({
      caption: page.properties.Caption?.title[0]?.plain_text || '',
      postUrl: page.properties.Post?.files[0]?.file?.url || '',
      date: page.properties.Date?.date?.start || page.created_time
    }));

    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};