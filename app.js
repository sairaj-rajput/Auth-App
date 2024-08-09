const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
   res.render("index");
});

app.get("/register", (req, res) => {
   res.render("register");
});

app.post("/register", async (req, res) => {
   let { username, name, email, password } = req.body;
   let user = await userModel.findOne({ email });
   if (user) return res.status(500).send("user already registered");

   bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
         let user = await userModel.create({
            username,
            name,
            email,
            password: hash,
         });
         let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
         res.cookie("token", token);
         res.send("registered");
      });
   });
});

app.get("/login", (req, res) => {
   res.render("login");
});

app.post("/login", async (req, res) => {
   let { email, password } = req.body;
   let user = await userModel.findOne({ email });
   if (!user) return res.status(500).send("Something Went Wrong!");

   bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
         let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
         res.cookie("token", token);
         res.status(200).redirect("/profile");
      } else res.redirect("/login");
   });
});

app.get("/profile", isLoggedIn, async (req, res) => {
   let user = await userModel.findOne({email: req.user.email}).populate("posts");
   res.render("profile",{user});
});

app.post("/post", isLoggedIn, async (req, res) => {
   let user = await userModel.findOne({email: req.user.email});
   let {content} = req.body;
   let post = await postModel.create({
      user: user._id,
      content: content
   })
   user.posts.push(post._id);
   await user.save();
   res.redirect("/profile");
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
   let post = await postModel.findOne({_id: req.params.id}).populate("user");

   if(post.likes.indexOf(req.user.userid) === -1){
   post.likes.push(req.user.userid);
   }else{
      post.likes.splice(post.likes.indexOf(req.user.userid), 1);
   }

   await post.save();
   res.redirect("/profile");
});









app.get("/logout", (req, res) => {
   res.clearCookie("token");
   res.redirect("/login");
});


function isLoggedIn(req, res, next) {
   const token = req.cookies.token;

   if (!token || token === "") {
      return res.redirect('/login'); // Redirect to login page
   } else {
      jwt.verify(token, "shhhh", (err, decoded) => {
         if (err) {
            return res.redirect('/login'); // Redirect to login page if token is invalid
         } else {
            req.user = decoded;
            next();
         }
      });
   }
}


app.listen(3000, () => console.log("app listening on port 3000!"));
