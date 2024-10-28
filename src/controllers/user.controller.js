import { asyncHandler } from "../utils/asyncHandler.js";

// const registerUser = asyncHandler(async (req, res) => {
//   return res.status(200).json({ message: "ok" });
// });

async function registerUser(req, res) {
  return res.status(200).json({ message: "success" });
}

export { registerUser };
