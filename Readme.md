# backend series

This is a backend project

# controllers

## Register user

    - get user details from frontend
    - validation - if empty
    - check if user is already registered
    - check for images, check for avatar
    - upload them to cloudinary, check for avatar
    - create user object    - create entry in DB
    - remove password and refresh token field from response
    - check for user creation
    - return res

## Login user

    - Get login details from frontend
    - Validation if empty
    - Check if user exists
    - Generate access and refresh token
    - return the access and refresh token in cookies
    - learnt the save() method of the mongoose
    - learnt how to select fields in monogDB

## Verification

    - get the cookies from the request object
    - verify using jwt.verify
