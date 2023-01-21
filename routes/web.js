import express from "express";
import UserController from "../controllers/UserController.js";
import AuthController from "../controllers/AuthController.js";
import authJwt from "../middleware/authJwt.js";
import FileParsing from "../middleware/FilesParsing.js";


const routerAuth = express.Router()

export default function routers(app) {

    app.use(FileParsing)
    app.post("/login", AuthController.login)
    app.post("/register", AuthController.register)
    app.get("/token", AuthController.refreshToken)
    app.delete("/logout", AuthController.logout)
    app.get("/test", (req, res) => {
        res.json
    })

    routerAuth.use(authJwt)
    routerAuth.get("/user", UserController.getUser)
    routerAuth.post("/upload", UserController.upload)
    app.use("/", routerAuth)
}
