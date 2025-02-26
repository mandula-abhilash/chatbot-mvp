import db from "../config/db.js";

export const getBusinessById = async (businessId) => {
  try {
    return await db("businesses").where({ id: businessId }).first();
  } catch (error) {
    console.error("Error fetching business:", error);
    throw error;
  }
};
