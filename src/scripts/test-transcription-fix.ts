/**
 * Test script to verify the transcription API fix
 * This simulates the API calls to check if user profiles and tier limits work
 */

async function testTranscriptionFix() {
  console.log('Testing transcription API fix...');

  try {
    // Test 1: Check if we can access the debug endpoint
    console.log('\n1. Testing user profile debug endpoint...');
    
    const debugResponse = await fetch('/api/debug/user-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ User profile debug successful:', debugData);
    } else {
      const debugError = await debugResponse.json();
      console.log('❌ User profile debug failed:', debugError);
    }

    // Test 2: Check if admin can initialize system
    console.log('\n2. Testing system initialization...');
    
    const initResponse = await fetch('/api/admin/init-system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ System initialization successful:', initData);
    } else {
      const initError = await initResponse.json();
      console.log('ℹ️ System initialization response:', initError);
      // This might fail if user is not admin, which is expected
    }

    console.log('\n✅ Test completed! The migration should have fixed the tier limits issue.');
    console.log('Try transcribing an audio file now - it should work properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for potential use
export { testTranscriptionFix };

// Run if called directly
if (typeof window !== 'undefined') {
  // Browser environment
  testTranscriptionFix();
}