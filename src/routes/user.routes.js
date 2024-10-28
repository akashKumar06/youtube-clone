import express from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = express();

router
  .route("/register")
  .get((req, res) => {
    return res.send("Register user");
  })
  .post(registerUser);

export default router;
