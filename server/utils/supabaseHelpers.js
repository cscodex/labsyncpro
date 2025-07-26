const { supabase } = require('../config/supabase');

/**
 * Helper function to execute Supabase queries with graceful error handling
 * @param {Function} queryFn - Function that returns a Supabase query
 * @param {Object} fallbackData - Data to return if query fails
 * @param {string} errorMessage - Custom error message
 */
async function executeSupabaseQuery(queryFn, fallbackData = null, errorMessage = 'Query failed') {
  try {
    const result = await queryFn();
    
    if (result.error) {
      console.error(`Supabase error: ${errorMessage}`, result.error);
      return { success: false, data: fallbackData, error: result.error };
    }
    
    return { success: true, data: result.data, error: null };
  } catch (error) {
    console.error(`Supabase query failed: ${errorMessage}`, error);
    return { success: false, data: fallbackData, error };
  }
}

/**
 * Helper function to get all records from a table with optional filters
 * @param {string} table - Table name
 * @param {Object} filters - Filters to apply
 * @param {string} select - Fields to select
 */
async function getRecords(table, filters = {}, select = '*') {
  return executeSupabaseQuery(
    () => {
      let query = supabase.from(table).select(select);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      return query;
    },
    [],
    `Failed to fetch ${table}`
  );
}

/**
 * Helper function to get a single record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {string} select - Fields to select
 */
async function getRecordById(table, id, select = '*') {
  return executeSupabaseQuery(
    () => supabase.from(table).select(select).eq('id', id).limit(1),
    null,
    `Failed to fetch ${table} by ID`
  );
}

/**
 * Helper function to create a new record
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 */
async function createRecord(table, data) {
  return executeSupabaseQuery(
    () => supabase.from(table).insert([data]).select(),
    null,
    `Failed to create ${table} record`
  );
}

/**
 * Helper function to update a record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {Object} data - Data to update
 */
async function updateRecord(table, id, data) {
  return executeSupabaseQuery(
    () => supabase.from(table).update(data).eq('id', id).select(),
    null,
    `Failed to update ${table} record`
  );
}

/**
 * Helper function to delete a record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 */
async function deleteRecord(table, id) {
  return executeSupabaseQuery(
    () => supabase.from(table).delete().eq('id', id),
    null,
    `Failed to delete ${table} record`
  );
}

module.exports = {
  executeSupabaseQuery,
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord
};
