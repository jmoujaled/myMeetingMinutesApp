/**
 * Test script to verify the search and filtering functionality
 * This script tests the database functions directly
 */

import { createClient } from '@/lib/supabase/server';

async function testSearchFunctionality() {
  console.log('🔍 Testing Search and Filtering Functionality...\n');
  
  try {
    const supabase = await createClient();
    
    // Test 1: Get user transcription history without filters
    console.log('Test 1: Basic transcription history retrieval');
    const { data: basicHistory, error: basicError } = await supabase
      .rpc('get_user_transcription_history', {
        target_user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
        search_query: null,
        date_from: null,
        date_to: null,
        status_filter: null,
        record_type_filter: null,
        limit_count: 10,
        offset_count: 0,
      });
    
    if (basicError) {
      console.log('❌ Basic history test failed:', basicError.message);
    } else {
      console.log('✅ Basic history test passed');
      console.log(`   Retrieved ${basicHistory?.length || 0} records`);
    }
    
    // Test 2: Search functionality
    console.log('\nTest 2: Search functionality');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('get_user_transcription_history', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: 'meeting',
        date_from: null,
        date_to: null,
        status_filter: null,
        record_type_filter: null,
        limit_count: 10,
        offset_count: 0,
      });
    
    if (searchError) {
      console.log('❌ Search test failed:', searchError.message);
    } else {
      console.log('✅ Search test passed');
      console.log(`   Found ${searchResults?.length || 0} records matching "meeting"`);
    }
    
    // Test 3: Date filtering
    console.log('\nTest 3: Date filtering');
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { data: dateResults, error: dateError } = await supabase
      .rpc('get_user_transcription_history', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: null,
        date_from: oneWeekAgo.toISOString(),
        date_to: null,
        status_filter: null,
        record_type_filter: null,
        limit_count: 10,
        offset_count: 0,
      });
    
    if (dateError) {
      console.log('❌ Date filtering test failed:', dateError.message);
    } else {
      console.log('✅ Date filtering test passed');
      console.log(`   Found ${dateResults?.length || 0} records from last week`);
    }
    
    // Test 4: Status filtering
    console.log('\nTest 4: Status filtering');
    const { data: statusResults, error: statusError } = await supabase
      .rpc('get_user_transcription_history', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: null,
        date_from: null,
        date_to: null,
        status_filter: 'completed',
        record_type_filter: null,
        limit_count: 10,
        offset_count: 0,
      });
    
    if (statusError) {
      console.log('❌ Status filtering test failed:', statusError.message);
    } else {
      console.log('✅ Status filtering test passed');
      console.log(`   Found ${statusResults?.length || 0} completed records`);
    }
    
    // Test 5: Record type filtering
    console.log('\nTest 5: Record type filtering');
    const { data: typeResults, error: typeError } = await supabase
      .rpc('get_user_transcription_history', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: null,
        date_from: null,
        date_to: null,
        status_filter: null,
        record_type_filter: 'meetings',
        limit_count: 10,
        offset_count: 0,
      });
    
    if (typeError) {
      console.log('❌ Record type filtering test failed:', typeError.message);
    } else {
      console.log('✅ Record type filtering test passed');
      console.log(`   Found ${typeResults?.length || 0} meeting records`);
    }
    
    // Test 6: Count function
    console.log('\nTest 6: Count function');
    const { data: countResult, error: countError } = await supabase
      .rpc('get_user_transcription_history_count', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: null,
        date_from: null,
        date_to: null,
        status_filter: null,
        record_type_filter: null,
      });
    
    if (countError) {
      console.log('❌ Count function test failed:', countError.message);
    } else {
      console.log('✅ Count function test passed');
      console.log(`   Total count: ${countResult || 0}`);
    }
    
    // Test 7: Search suggestions
    console.log('\nTest 7: Search suggestions');
    const { data: suggestions, error: suggestionsError } = await supabase
      .rpc('get_search_suggestions', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_prefix: 'me',
        limit_count: 5,
      });
    
    if (suggestionsError) {
      console.log('❌ Search suggestions test failed:', suggestionsError.message);
    } else {
      console.log('✅ Search suggestions test passed');
      console.log(`   Found ${suggestions?.length || 0} suggestions for "me"`);
    }
    
    // Test 8: Content search
    console.log('\nTest 8: Content search with snippets');
    const { data: contentSearch, error: contentError } = await supabase
      .rpc('search_transcription_content', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        search_query: 'meeting',
        limit_count: 5,
      });
    
    if (contentError) {
      console.log('❌ Content search test failed:', contentError.message);
    } else {
      console.log('✅ Content search test passed');
      console.log(`   Found ${contentSearch?.length || 0} content matches`);
    }
    
    // Test 9: Analytics
    console.log('\nTest 9: Search analytics');
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_search_analytics', {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        days_back: 30,
      });
    
    if (analyticsError) {
      console.log('❌ Analytics test failed:', analyticsError.message);
    } else {
      console.log('✅ Analytics test passed');
      console.log(`   Analytics data:`, analytics?.[0] || 'No data');
    }
    
    console.log('\n🎉 All search functionality tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  testSearchFunctionality();
}

export { testSearchFunctionality };