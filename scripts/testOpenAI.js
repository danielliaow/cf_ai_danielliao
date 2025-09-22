// Test script for OpenAI configuration
// Run with: node scripts/testOpenAI.js

require('dotenv').config();

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4';
const BASE_URL = process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';

async function testOpenAI() {
  console.log('🧪 Testing OpenAI Configuration...\n');

  console.log('📋 Configuration:');
  console.log(`• Model: ${MODEL}`);
  console.log(`• API Key: ${API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`• Base URL: ${BASE_URL}`);

  if (MODEL.startsWith('ft:')) {
    console.log(`• Fine-tuned Model: ✅ Yes`);
    const parts = MODEL.split(':');
    console.log(`  - Base Model: ${parts[1]}`);
    console.log(`  - Organization: ${parts[2]}`);
    console.log(`  - Model Name: ${parts[3]}`);
    console.log(`  - Model ID: ${parts[4]}`);
  } else {
    console.log(`• Standard Model: ✅ Yes`);
  }

  if (!API_KEY || API_KEY === 'your-openai-api-key-here') {
    console.log('\n❌ API Key not configured!');
    console.log('Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file');
    return;
  }

  console.log('\n🚀 Testing API Connection...\n');

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with "Connection test successful!" if you receive this message.'
          },
          {
            role: 'user',
            content: 'Hello, this is a connection test.'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      }),
    });

    console.log(`📡 HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ API Error Response:', errorData);

      if (response.status === 401) {
        console.log('\n🔑 Authentication Error: Invalid API key');
      } else if (response.status === 404 && MODEL.startsWith('ft:')) {
        console.log('\n🤖 Model Error: Fine-tuned model not found');
        console.log('   Please check your fine-tuned model ID');
      } else if (response.status === 429) {
        console.log('\n⏱️ Rate Limit: API quota exceeded');
      }

      return;
    }

    const data = await response.json();
    console.log('✅ API Response received');

    if (data.choices && data.choices.length > 0) {
      console.log('\n💬 AI Response:');
      console.log(`"${data.choices[0].message.content}"`);

      console.log('\n📊 Token Usage:');
      console.log(`• Prompt tokens: ${data.usage?.prompt_tokens || 'N/A'}`);
      console.log(`• Completion tokens: ${data.usage?.completion_tokens || 'N/A'}`);
      console.log(`• Total tokens: ${data.usage?.total_tokens || 'N/A'}`);

      if (MODEL.startsWith('ft:')) {
        console.log('\n🎯 Fine-tuned Model Test: ✅ SUCCESS');
        console.log('Your custom model is working correctly!');
      } else {
        console.log('\n🤖 Standard Model Test: ✅ SUCCESS');
      }

      console.log('\n✨ All tests passed! Your OpenAI configuration is ready to use.');

    } else {
      console.log('\n❌ No response generated');
    }

  } catch (error) {
    console.log('\n❌ Connection failed:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.log('🌐 Network Error: Cannot reach OpenAI API');
      console.log('   Check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Connection Error: Connection refused');
    }
  }
}

// Run the test
testOpenAI().catch(console.error);