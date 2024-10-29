// import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// const registerUser = asyncHandler(async (req, res) => {
//   return res.status(200).json({ message: "ok" });
// });

async function registerUser(req, res) {
  // get user details from frontend
  const { username, email, fullname, password } = req.body;

  // validation - if empty
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  // check if user is already registered
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  // check for images, check for avatar
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  // upload them to cloudinary, check for avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) throw new ApiError(400, "Avatar file is required");

  // create user object - create entry in DB
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser)
    throw new ApiError(500, "Something went wrong whilw registering the user");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
}

export { registerUser };
