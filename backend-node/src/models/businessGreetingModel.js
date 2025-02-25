import db from "../config/db.js";

export const getBusinessGreeting = async (business_id) => {
  try {
    return await db("business_greetings").where({ business_id }).first();
  } catch (error) {
    console.error("Error fetching business greeting:", error);
    throw error;
  }
};

export const updateBusinessGreeting = async (business_id, greetingData) => {
  try {
    const [greeting] = await db("business_greetings")
      .where({ business_id })
      .update({
        ...greetingData,
        updated_at: db.fn.now(),
      })
      .returning("*");

    return greeting;
  } catch (error) {
    console.error("Error updating business greeting:", error);
    throw error;
  }
};
