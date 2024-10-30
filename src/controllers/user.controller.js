// import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
// const registerUser = asyncHandler(async (req, res) => {
//   return res.status(200).json({ message: "ok" });
// });

async function registerUser(req, res) {
  try {
    // get user details from frontend
    const { username, email, fullname, password } = req.body;

    // validation - if empty
    if (
      [username, email, fullname, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All field are required");
    }

    // check if user is already registered
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
      throw new ApiError(409, "User with username or email already exists");
    }

    // check for images, check for avatar
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
      throw new ApiError(
        500,
        "Something went wrong whilw registering the user"
      );

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    return res.json({ error: error.message });
  }
}

async function loginUser(req, res) {
  try {
    // get user details
    const { email, username, password } = req.body;

    // check if the username or email exists in req.body
    if (!username && !email)
      throw new ApiError(400, "username or email and password is required");

    const user = await User.findOne({ $or: [{ email }, { username }] });

    // check if user exists in db
    if (!user) throw new ApiError(404, "User does not exist");

    // check the password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

    // if user exists then generate a token and give it to the user for furthur use by the user
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    return res.json({ error: error.message });
  }
}

async function logoutUser(req, res) {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
}

async function refreshAccessToken(req, res) {
  try {
    const incomingRefreshToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized access");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { refreshToken, accessToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    return res.status(error?.statusCode).json({ error: error?.message });
  }
}

async function changeCurrentPassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const id = req.user?._id;
    const user = await User.findById(id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) throw new ApiError(400, "Invalid password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    return res.status(error?.statusCode).json({ error: error?.message });
  }
}

async function getCurrentUser(req, res) {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
}

async function updateAccountDetails(req, res) {
  try {
    const { fullname, email } = req.body;
    if (!fullname && !email) {
      throw new ApiError(400, "All fileds are required");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fullname, email } },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  } catch (error) {}
}

async function updateAvatar(req, res) {
  try {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
      $set: { avatar: avatar.url },
    }).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "avatar updated successfully"));
  } catch (error) {
    return res.status(error?.statusCode).json({ error: error?.message });
  }
}

async function updateCoverImage(req, res) {
  try {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(400, "coverImage file is missing");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading coverImage");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
      $set: { coverImage: coverImage.url },
    }).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover image updated successfully"));
  } catch (error) {
    return res.status(error?.statusCode).json({ error: error?.message });
  }
}

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
};
