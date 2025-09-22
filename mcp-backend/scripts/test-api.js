#!/usr/bin/env node

const https = require("https");
const http = require("http");

const BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;
const TEST_TOKEN = "your_supabase_access_token_here";

// Helper function to make HTTP requests
function makeRequest(path, method = "GET", data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log("🔍 Testing health check...");
  try {
    const response = await makeRequest("/health");
    console.log("✅ Health check:", response.status, response.body);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

async function testAPIInfo() {
  console.log("🔍 Testing API info...");
  try {
    const response = await makeRequest("/");
    console.log("✅ API info:", response.status, response.body);
  } catch (error) {
    console.error("❌ API info failed:", error.message);
  }
}

async function testGoogleAuthUrl() {
  console.log("🔍 Testing Google auth URL generation...");
  try {
    const response = await makeRequest("/auth/google");
    console.log("✅ Google auth URL:", response.status, response.body);
  } catch (error) {
    console.error("❌ Google auth URL failed:", error.message);
  }
}

async function testMCPToolsList() {
  console.log("🔍 Testing MCP tools list...");
  try {
    const response = await makeRequest("/mcp/tools", "GET", null, TEST_TOKEN);
    console.log("✅ MCP tools list:", response.status, response.body);
  } catch (error) {
    console.error("❌ MCP tools list failed:", error.message);
  }
}

async function testAuthStatus() {
  console.log("🔍 Testing auth status...");
  try {
    const response = await makeRequest("/auth/status", "GET", null, TEST_TOKEN);
    console.log("✅ Auth status:", response.status, response.body);
  } catch (error) {
    console.error("❌ Auth status failed:", error.message);
  }
}

async function testToolExecution() {
  console.log("🔍 Testing tool execution (should fail without Google auth)...");
  try {
    const response = await makeRequest(
      "/mcp/tools/getTodaysEvents/execute",
      "POST",
      { params: {} },
      TEST_TOKEN
    );
    console.log("✅ Tool execution test:", response.status, response.body);
  } catch (error) {
    console.error("❌ Tool execution test failed:", error.message);
  }
}

// Run all tests
async function runTests() {
  console.log("🚀 Starting API tests...\n");

  await testHealthCheck();
  console.log("");

  await testAPIInfo();
  console.log("");

  await testGoogleAuthUrl();
  console.log("");

  if (TEST_TOKEN !== "your_supabase_access_token_here") {
    await testAuthStatus();
    console.log("");

    await testMCPToolsList();
    console.log("");

    await testToolExecution();
    console.log("");
  } else {
    console.log(
      "⚠️  Skipping authenticated tests - please set TEST_TOKEN in the script"
    );
    console.log("");
  }

  console.log("✅ API tests completed!");
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest("/health");
    console.log("✅ Server is running on http://localhost:3001");
    return true;
  } catch (error) {
    console.error(
      "❌ Server is not running. Please start it with: npm run dev"
    );
    return false;
  }
}

// Main execution
checkServer().then((isRunning) => {
  if (isRunning) {
    runTests();
  }
});
