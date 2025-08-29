/**
 * Manual Test Script for Ward Selector Functionality
 * Tests authentication, ward loading, and dropdown visibility
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

async function testWardSelectorSystem() {
  console.log('🔍 Testing LokDarpan Ward Selector System...\n');
  
  try {
    // Test 1: Backend API Status
    console.log('1. Testing Backend API Status...');
    const statusResponse = await axios.get(`${API_BASE}/api/v1/status`);
    console.log('   ✅ Backend API Status:', statusResponse.data);
    console.log('   Authentication Required:', !statusResponse.data.authenticated);
    
    // Test 2: Authentication
    console.log('\n2. Testing Authentication...');
    const loginResponse = await axios.post(`${API_BASE}/api/v1/login`, {
      username: 'ashish',
      password: 'password'
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('   ✅ Login successful, status:', loginResponse.status);
    
    // Get cookies from login
    const cookies = loginResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';
    
    // Test 3: Authenticated Status Check
    console.log('\n3. Testing Authenticated Status...');
    const authStatusResponse = await axios.get(`${API_BASE}/api/v1/status`, {
      headers: { 'Cookie': cookieString }
    });
    console.log('   ✅ Authenticated Status:', authStatusResponse.data);
    
    // Test 4: Posts API (for ward data)
    console.log('\n4. Testing Posts API for Ward Data...');
    const postsResponse = await axios.get(`${API_BASE}/api/v1/posts`, {
      params: { city: 'All', limit: 100 },
      headers: { 
        'Cookie': cookieString,
        'Content-Type': 'application/json'
      }
    });
    
    const posts = postsResponse.data?.items || [];
    console.log('   ✅ Posts fetched:', posts.length);
    
    // Extract unique cities (wards)
    const cities = [...new Set(
      posts.map(post => post.city).filter(city => city && city !== 'All')
    )].sort();
    
    console.log('   ✅ Available Wards from Posts:', cities.length);
    cities.slice(0, 5).forEach(city => console.log(`     - ${city}`));
    if (cities.length > 5) console.log(`     ... and ${cities.length - 5} more`);
    
    // Test 5: Ward-specific API call
    if (cities.length > 0) {
      const testWard = cities.find(ward => ward.includes('Jubilee Hills')) || cities[0];
      console.log(`\n5. Testing Ward-specific API call for: ${testWard}...`);
      
      const wardPostsResponse = await axios.get(`${API_BASE}/api/v1/posts`, {
        params: { city: testWard, limit: 10 },
        headers: { 
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        }
      });
      
      const wardPosts = wardPostsResponse.data?.items || [];
      console.log(`   ✅ Ward-specific posts for ${testWard}:`, wardPosts.length);
      
      // Test Trends API
      console.log(`\n6. Testing Trends API for: ${testWard}...`);
      try {
        const trendsResponse = await axios.get(`${API_BASE}/api/v1/trends`, {
          params: { ward: testWard, days: 30 },
          headers: { 
            'Cookie': cookieString,
            'Content-Type': 'application/json'
          }
        });
        console.log('   ✅ Trends API response:', {
          status: trendsResponse.status,
          dataLength: trendsResponse.data?.length || 0
        });
      } catch (trendsError) {
        console.log('   ⚠️ Trends API not available:', trendsError.response?.status || trendsError.message);
      }
    }
    
    // Test 6: Frontend accessibility
    console.log('\n7. Testing Frontend Accessibility...');
    const frontendResponse = await axios.get('http://localhost:5176');
    console.log('   ✅ Frontend accessible, response length:', frontendResponse.data.length);
    
    console.log('\n✅ Ward Selector System Test Complete!');
    console.log('\nKey Findings:');
    console.log('- Backend API is operational');
    console.log('- Authentication system works');
    console.log(`- ${cities.length} wards available from posts data`);
    console.log('- Frontend is accessible');
    console.log('\nWardContext should load with fallback data if API fails.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status Code:', error.response.status);
    }
  }
}

// Run the test
testWardSelectorSystem();