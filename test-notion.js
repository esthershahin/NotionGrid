// test-notion.js (ES Module version)
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function testNotionConnection() {
  console.log('🔍 Testing Notion connection...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('✓ NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Set (length: ' + process.env.NOTION_TOKEN.length + ')' : '❌ Missing');
  console.log('✓ NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID ? 'Set (' + process.env.NOTION_DATABASE_ID + ')' : '❌ Missing');
  console.log('');

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.log('❌ Missing environment variables. Check your .env file.');
    return;
  }

  try {
    // Test database access
    console.log('📊 Testing database access...');
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 5,
    });

    console.log('✅ Successfully connected to Notion!');
    console.log(`📝 Found ${response.results.length} records in database\n`);

    if (response.results.length > 0) {
      const firstPage = response.results[0];
      console.log('🏗️  Database Properties Found:');
      Object.keys(firstPage.properties).forEach(prop => {
        const type = firstPage.properties[prop].type;
        console.log(`   • ${prop} (${type})`);
      });
      console.log('');

      console.log('📋 Sample Posts:');
      response.results.forEach((page, index) => {
        const properties = page.properties;

        let mediaUrl = 'No media';
        if (properties.Post?.files?.length > 0) {
          const file = properties.Post.files[0];
          mediaUrl = file.type === 'file'
            ? file.file.url.substring(0, 50) + '...'
            : file.external.url.substring(0, 50) + '...';
        }

        let caption = properties.Caption?.rich_text?.[0]?.plain_text?.substring(0, 50) + '...' || 'No caption';
        let date = properties.Date?.date?.start || 'No date';
        let hideStatus = properties.Hide?.checkbox !== undefined
          ? (properties.Hide.checkbox ? '🙈 Hidden' : '👁️ Visible')
          : 'Not set';

        console.log(`   ${index + 1}. ${caption}`);
        console.log(`      📸 Media: ${mediaUrl}`);
        console.log(`      📅 Date: ${date}`);
        console.log(`      👁️ Visibility: ${hideStatus}`);
        console.log('');
      });

      console.log('🔍 Property Validation:');
      const requiredProps = ['Post', 'Caption', 'Date', 'Hide'];
      const foundProps = Object.keys(firstPage.properties);
      requiredProps.forEach(prop => {
        console.log(foundProps.includes(prop)
          ? `   ✅ ${prop} - Found`
          : `   ❌ ${prop} - Missing (you need to add this property to your database)`
        );
      });
    } else {
      console.log('⚠️  Database is empty. Add some posts to test properly.');
    }

  } catch (error) {
    console.log('❌ Error connecting to Notion:');
    console.log('Error:', error.message);

    if (error.code === 'unauthorized') {
      console.log('\n🔧 Fix: Check your NOTION_TOKEN or make sure the integration has access to the database');
    } else if (error.code === 'object_not_found') {
      console.log('\n🔧 Fix: Check your NOTION_DATABASE_ID or make sure the database exists');
    }
  }
}

testNotionConnection();
