import db from "../config/db.js";

export const getActiveSession = async (phone_number, business_id) => {
  try {
    return await db("user_sessions")
      .where({
        phone_number,
        business_id,
        is_active: true,
      })
      .whereNull("ended_at")
      .first();
  } catch (error) {
    console.error("Error fetching active session:", error);
    throw error;
  }
};

export const createSession = async (phone_number, business_id) => {
  try {
    const [session] = await db("user_sessions")
      .insert({
        business_id,
        phone_number,
        is_active: true,
        context: {},
        started_at: db.fn.now(),
      })
      .returning("*");

    return session;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
};

export const updateSession = async (sessionId, updates) => {
  try {
    const [updatedSession] = await db("user_sessions")
      .where({ id: sessionId })
      .update({
        ...updates,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return updatedSession;
  } catch (error) {
    console.error("Error updating session:", error);
    throw error;
  }
};

export const closeSession = async (sessionId) => {
  try {
    const [closedSession] = await db("user_sessions")
      .where({ id: sessionId })
      .update({
        is_active: false,
        ended_at: db.fn.now(),
      })
      .returning("*");

    return closedSession;
  } catch (error) {
    console.error("Error closing session:", error);
    throw error;
  }
};

export const cleanupInactiveSessions = async (timeout) => {
  try {
    const now = new Date();
    const cutoffTime = new Date(now - timeout);

    const expiredSessions = await db("user_sessions")
      .where("is_active", true)
      .whereNull("ended_at")
      .where("updated_at", "<=", cutoffTime)
      .update({
        is_active: false,
        ended_at: db.fn.now(),
      })
      .returning("*");

    return expiredSessions;
  } catch (error) {
    console.error("Error cleaning up inactive sessions:", error);
    throw error;
  }
};

export const logMessage = async (messageData) => {
  try {
    const [message] = await db("whatsapp_messages")
      .insert({
        ...messageData,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    return message;
  } catch (error) {
    console.error("Error logging message:", error);
    throw error;
  }
};
