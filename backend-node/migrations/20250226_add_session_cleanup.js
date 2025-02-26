/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  /*
      # Add session cleanup function with user notification
      
      1. Changes
        - Create cleanup function that notifies users
        - Schedule cleanup job
        - Uses existing whatsapp_messages table for logging
        
      Note: Requires superuser privileges to enable pg_cron
    */

  // Create the cleanup function
  await knex.raw(`
      CREATE OR REPLACE FUNCTION cleanup_inactive_sessions() RETURNS void AS $$
      DECLARE
        session_record RECORD;
      BEGIN
        -- Get sessions to close
        FOR session_record IN 
          SELECT * FROM user_sessions 
          WHERE 
            is_active = true 
            AND ended_at IS NULL
            AND updated_at <= NOW() - INTERVAL '5 minutes'
        LOOP
          -- First log the notification message
          INSERT INTO whatsapp_messages (
            business_id,
            session_id,
            phone_number,
            message_direction,
            message_text,
            message_type,
            message_status,
            metadata
          ) VALUES (
            session_record.business_id,
            session_record.id,
            session_record.phone_number,
            'outgoing',
            'Your chat session has been closed due to inactivity. Feel free to send a new message to start a fresh conversation.',
            'text',
            'sent',
            jsonb_build_object(
              'cleanup_time', NOW(),
              'reason', 'session_timeout'
            )
          );
  
          -- Then close the session
          UPDATE user_sessions
          SET 
            is_active = false,
            ended_at = NOW()
          WHERE id = session_record.id;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

  // Schedule the cron job (requires superuser)
  await knex.raw(`
      SELECT cron.schedule(
        'cleanup-inactive-sessions',      -- job name
        '*/5 * * * *',                   -- every 5 minutes
        'SELECT cleanup_inactive_sessions()'
      );
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Remove the scheduled job
  await knex.raw(`
      SELECT cron.unschedule('cleanup-inactive-sessions');
    `);

  // Drop the cleanup function
  await knex.raw("DROP FUNCTION IF EXISTS cleanup_inactive_sessions();");
}
