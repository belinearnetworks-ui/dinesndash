// import customParseFormat from "dayjs/plugin/customParseFormat";
const customParseFormat = require("dayjs/plugin/customParseFormat");

require("dotenv").config();
const express=require("express");
const app=express();
const path=require("path");
const {Server}=require("socket.io");
const http=require("http");
const mysql=require("mysql2");
const passport=require("passport");
const LocalStrategy=require("passport-local").Strategy;
const encrypt=require("bcrypt");
const flash=require("express-flash");
const session=require("express-session");
const multer=require("multer");
let dayjs=require("dayjs");
dayjs.extend(customParseFormat);

let Port=process.env.Port;
const unsplash_id=process.env.unsplash_id
const jwt=require("jsonwebtoken");
const sharp=require("sharp");
const uuid=require("uuid");
const os=require("os");
const crypto=require("crypto");
const axios=require("axios");
const dns=require("dns");
const querystring=require("querystring");
const nodemailer=require("nodemailer");
// const { setEngine } = require("crypto");
const {payfast}=require("./assets/servertest");
// const { Socket } = require("dgram");
// const { json } = require("body-parser");
// const { buffer } = require("stream/consumers");
app.set("view engine","ejs");
let passphrase=process.env.passphrase;

app.use(session({
    resave:false,
    saveUninitialized:false,
    secret:process.env.Secret
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname,"assets")));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static(path.join(__dirname,"uploads")));


app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(flash());

let server=http.createServer(app);
let io=new Server(server);


const EmailTranspoter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:'futuredladla33@gmail.com',
        pass:'vjww hxwm xwxp qeca'
    }
});

let storage=multer.memoryStorage();

passport.use(new LocalStrategy((username,password,done)=>{
  con.query("select * from allusers where email=?",[username],(err,results)=>{
    if(err) throw err;

    if(results.length==0){
      return done(null,false,io.emit("no user found",{
        message:"No user with that Email has been found in our databases. Try Creating an account."
      }));
    }

    let Results=results[0];
    encrypt.compare(password,Results.Password,(err,user)=>{
      if(err) throw err;

      if(!user){
        return done(null,false,io.emit("incorrect password",{
          error_message:"Incorrect Password"
        }))
      }

      return done(null,Results)
    })
  })
}))

passport.serializeUser((user,done)=>{
  return done(null,user.email)
})

passport.deserializeUser((email,done)=>{
  con.query("select * from allusers where email=? AND verified=?",[email,true],(err,results)=>{
    if(err) throw err;

    if(results.length==0){
      return done(new Error("No user found"));
    }

    let user=results[0];
    done(null,user)
  })
})

function NotAuthenticated(req,res,next){
    if(!req.isAuthenticated()){
      return res.redirect("/signup");
    }

    return next();
};

function authenticated(req,res,next){
    if(req.isAuthenticated()){
      return res.redirect('/home')
    }

    next()
}

function store(req,res,next){
  if(!req.user.store){
    return res.redirect("/home");
  }

  next();
};

function user(req,res,next){
  if(req.user.store){
    return res.redirect("/home")
  }

  next();
}

function driver(req,res,next){
  if(req.user.store){
    return res.redirect("/home")
  }

  next();
}

let con=mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10
});

// con.connect(err=>{
//     if(err) throw err;
//     console.log("Mysql Connected")
// })

app.get("/",authenticated,(req,res)=>{
    res.render("home")
});

app.get("/signup",authenticated,(req,res)=>{
    res.render("signup")
});
let order_ids=[]
function NewOrders(store_id,res){
  setInterval(async ()=>{
    let [ids]=await con.promise().query("SELECT id from orders o WHERE o.store_id=? and o.payment_status=? and o.order_status IN (?,?,?,?,?)",[store_id,"COMPLETE",'PAID', 'ACCEPTED','PREPARING','READY','WAITING_FOR_CODE']);
    let new_orders=ids.map(item=>item.id);
    console.log("New orders",new_orders);
    new_orders.forEach(id => {
      if(!order_ids.includes(id)){
        return true;
      }
      return false
    });
  },5000)
}

app.get("/home",NotAuthenticated,async (req,res)=>{
  if(req.user.driver){
    return res.redirect("/home/driver")
  }
  console.log("User info:",req.user.driver);
  try {
    if(!req.user.store){
      // console.log("Okay this is not a store but a user")
      let [user_info]=await con.promise().query("SELECT * FROM user_info WHERE id=?",[req.user.id]);
      let [meals]=await con.promise().query("SELECT m.*, s.storename,s.id,s.store_times,s.location FROM meals m JOIN store_info s ON m.store_id=s.id where availability=?",["AVAILABLE"]);
      let [Promocodes]=await con.promise().query("SELECT * from promocodes where user_id=? AND expiry>NOW()",[req.user.id]);
      // console.log(Promocodes);
      let Allergies=[JSON.parse(user_info[0].allergies)];
      Allergies=Allergies[0].split(",").map(i=>i.toLowerCase().trim()).filter(i=>i.length>0);

      for(let meal of meals){
        let size=await con.promise().query("select * from favourites where user_id=? AND meal_id=?",[req.user.id,meal.meal_id]);
        let store=await con.promise().query("select * from store_info where id=?",[meal.store_id]);
        let ingredients=JSON.parse(meal.ingredients);
        ingredients=ingredients.map(i=>i.toLowerCase().trim());
        let allergy_index = 0;
        
        ingredients.forEach(ingredient => {
            if (Allergies.some(allergy => ingredient.includes(allergy))) {
                allergy_index++;
            }
        });
        
        console.log(allergy_index); // 2

        meal.allergy_index=allergy_index;

        if(size[0].length==0){
          meal.fav=false
        }else{
          meal.fav=true
        }
      }

      let stores=await con.promise().query("SELECT id,storename,store_logo,store_times from store_info where verified=?",[true]);
      stores=stores[0].map(item=>{
        if(item.store_logo==null){
          item.store_logo="placeholder_image.png";
        }
        return item
      });

      let Now=dayjs();
      let day=dayjs().format("dd");

    meals.forEach(meal => {
      const store_times = JSON.parse(meal.store_times);
      let isOpen = false;
    
      for (const time of store_times) {
    
        // Match day
        const isSunday = day === "Su" && time.Days === "Sunday";
        const isSaturday = day === "Sa" && time.Days === "Saturday";
        const isWeekday =
          ["Mo", "Tu", "We", "Th", "Fr"].includes(day) &&
          time.Days === "Mon-Fri";
    
        if (!isSunday && !isSaturday && !isWeekday) continue;
        if (time.Trading !== "Opened") continue;
    
        let now = dayjs();
    
        let opening = dayjs(time.opening, "HH:mm");
        let closing = dayjs(time.closing, "HH:mm");
    
        // Handle overnight trading
        if (closing.isBefore(opening)) {
          // closing is next day
          if (now.isAfter(opening) || now.isBefore(closing)) {
            isOpen = true;
          }
        } else {
          if (now.isAfter(opening) && now.isBefore(closing)) {
            isOpen = true;
          }
        }
    
        if (isOpen) {
          meal.Trading = "open";
          meal.opening = opening.format("HH:mm");
          meal.closing = closing.format("HH:mm");
          break; // 🔥 stop checking other times
        }
      }
    
      if (!isOpen) {
        meal.Trading = "closed";
      }
    });

    meals=meals.sort((a,b)=>a.allergy_index-b.allergy_index);
    let trending=meals.sort((a,b)=>b.sales-a.sales).slice(0,5);
    let deals=meals.sort((a,b)=>a.price-b.price).slice(0,5);
    let quickbites=meals.sort((a,b)=>a.TimeTo-b.TimeTo).slice(0,5);
    let recommended=meals.sort((a,b)=>b.fav-a.fav).slice(0,5);
    let categories=await con.promise().query("SELECT * from catagories");
    let Meals = [{ title: "🔥 Trending Now", data: trending },
    { title: "💰 Best Deals", data: deals },
    { title: "⚡ Quick Bites", data: quickbites },
    { title: "✨ Recommended", data: recommended }];
    // console.log("meals",meals)

    return res.render("user_landing",{user:user_info[0],AllMeals:meals,promo:Promocodes[0],stores,msg:req.flash("error"),Category:categories[0],Meals});

    }else if(req.user.store){
      let [orders]=await con.promise().query("SELECT o.*,u.fullname,m.meal_name from orders o JOIN meals m ON o.meal_id=m.meal_id join user_info u on u.id=o.user_id WHERE o.store_id=? and o.payment_status=? and o.order_status IN (?,?,?,?,?)",[req.user.id,"COMPLETE",'PAID', 'ACCEPTED','PREPARING','READY','WAITING_FOR_CODE']);
      let [ids]=await con.promise().query("SELECT id from orders o WHERE o.store_id=? and o.payment_status=? and o.order_status IN (?,?,?,?,?)",[req.user.id,"COMPLETE",'PAID', 'ACCEPTED','PREPARING','READY','WAITING_FOR_CODE']);
      order_ids.push(ids.map(item=>item.id));
      let [categories]=await con.promise().query("select * from catagories where store_id=?",[req.user.id]);
      let name=await con.promise().query("SELECT storename from store_info WHERE id=?",[req.user.id]);
      let cat_names=await con.promise().query("SELECT catagory_name from catagories");
      let your_cat_names=await con.promise().query("SELECT catagory_name from catagories where store_id=?",[req.user.id]);
      let test=await con.promise().query("SELECT store_id ,GROUP_CONCAT(meal_id ORDER BY meal_id SEPARATOR ',') AS list from orders where store_id=? GROUP BY id",[req.user.id]);
      console.log("Testing....",test)
      cat_names=cat_names[0].map(item=>item.catagory_name);
      your_cat_names=your_cat_names[0].map(item=>item.catagory_name);

      let store=await con.promise().query("select * from store_info where id=?",[req.user.id]);
      let pending=await con.promise().query("SELECT quantity from orders where store_id=? AND order_status in (?,?,?)",[req.user.id,"PAID","ACCEPTED","PREPARING","READY","'WAITING_FOR_CODE"]);

      let amounts=await con.promise().query("SELECT sales*SellingPrice AS Sale from meals where store_id=?",[req.user.id]);
      amounts=amounts[0]
      let Total=amounts.reduce((sum,{Sale})=>sum+Sale,0);
      
      return res.render("store_landing",{Data:categories,msg:req.flash("error"),Name:name[0][0].storename,Orders:orders,store_id:req.user.id,cat_names,your_cat_names,pending:pending[0].length,Total});
    }

  } catch (error) {
    if(error){
      // return res.sendFile(path.join(__dirname,"assets","error500.html"));
      throw error;
    }
    
  }
});

app.get("/home/driver", NotAuthenticated, driver, async (req, res) => {
  try {
    let [driverData] = await con.promise().query("SELECT * FROM drivers WHERE user_id = ?", [req.user.id]);
    let orders=await con.promise().query("SELECT o.*,u.fullname,s.storename from orders o JOIN store_info s ON o.store_id=s.id JOIN user_info u ON o.user_id=u.id where o.delivery_status=? AND o.order_status <> 'created' ORDER BY CREATED_AT DESC",["WAITING_FOR_DRIVER"]);
    const uniqueOrders = Object.values(
    orders[0].reduce((acc, current) => {
        // If we haven't seen this ID yet, save it
        if (!acc[current.id]) {
            acc[current.id] = current;
        }
        return acc;
    }, {})
    );
    let [pending]=await con.promise().query("SELECT * from delivery where DRIVER_ID=? AND delivery_status <> ?",[req.user.id,"DELIVERED"]);

    return res.render("driver_landing",{orders:uniqueOrders,true_orders:orders,pending})//, //{ driver: driverData, orders });
  } catch (error) {
    throw error
  }
});

app.get("/driver/history",NotAuthenticated,driver,async(req,res)=>{
  try {
    let [HISTORY]=await con.promise().query("SELECT * from delivery where DRIVER_ID=? and delivery_status='DELIVERED'",[req.user.id]);
    return res.render("driver_history",{history:HISTORY})
  } catch (error) {
    if(error) throw error
  }
});

app.get("/driver/wallet",NotAuthenticated,driver,async(req,res)=>{
  try {
    let [Earnings]=await con.promise().query("SELECT * FROM driver_earnings WHERE driver_id=?",[req.user.id]);
    
    Earnings=Earnings[0];
    return res.render("driver_earnings",{Earnings});
  } catch (error) {
    if(error) throw error;
  }
})

app.post("/updated/driver/location/:orderId",NotAuthenticated,driver,async (req,res)=>{
  try {
    await con.promise().query("UPDATE delivery set driver_geolocation=? WHERE order_id=?",[req.body.current,req.params.orderId]);
    return res.json({Status:true})
  } catch (error) {
    if(error) throw error;
  }
})

app.get("/logout",NotAuthenticated,async (req,res)=>{
  try{
    let userAgent=req.headers["user-agent"]
    console.log(userAgent)
    userAgent=userAgent.slice(0,80)
    let now=dayjs().format("YYYY-MM-DD HH:mm");
    if(user){
      await con.promise().query("UPDATE user_info SET logoutdate=?,logoutos=?,logoutip=? where id=?",[now,userAgent,req.ip,req.user.id]);
    }else{
      await con.promise().query("UPDATE store_info SET logoutdate=?,logoutos=?,logoutip=? where id=?",[now,userAgent,req.ip,req.user.id]);

    }
    req.session.destroy();
    return res.json({Status:true});
  }catch(err){
    if(err) throw err;
  }
})

app.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect("/signup");

    req.logIn(user, async (err) => {
      if (err) return next(err);

      try {
        let userAgent = req.headers["user-agent"]?.slice(0, 80) || "unknown";
        let now = dayjs().format("YYYY-MM-DD HH:mm");
      

        if (!user.store) {
          await con.promise().query(
            "UPDATE user_info SET loginos=?, logindate=?, loginip=? WHERE id=?",
            [userAgent, now, req.ip, user.id]
          );
        } else if (user.store) {
          await con.promise().query(
            "UPDATE store_info SET loginos=?, logindate=?, loginip=? WHERE id=?",
            [userAgent, now, req.ip, user.id]
          );
        }

        return res.redirect("/home");
      } catch (error) {
        return next(error);
      }
    });
  })(req, res, next);
});


const upload=multer({storage,fileFilter:(req,file,cb)=>{
    let type=/jpg|jpeg|png|svg|webp/;
    let extname=type.test(path.extname(file.originalname).toLowerCase());
    let mimetype=type.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true)
    }else{
        return cb(new Error(`incorrect file extension name (${path.extname(file.originalname)}) uploaded`),false)
    }
}});

app.post("/signup/api/auth/:type/:processingcode",upload.single("Logo"),(req,res)=>{
    console.log("Api recieved");
    console.log(req.body)
    console.log(req.params.type)
    console.log(req.params.processingcode)
    let ProcessingCode="109283651432930948";

    if(req.params.processingcode!==ProcessingCode){
        return res.sendFile(path.join(__dirname,"assets","error500.html"))
    }

    if(req.params.type=="store"){
        console.log("We're working on stores now")
        let Body=req.body;
        if(Body.store_name==""||Body.StoreTimes.length==0 ||Body.store_signup_password==""||Body.store_signup_email==""){
            return res.json({Status:false,Reason:"Error 400:Bad request"})
        }

        console.log("checked for empty inputs and none were found so we will continue")
        console.log(Body.StoreTimes)


        let StoreID=uuid.v4();

        let DateNow=dayjs().format("YYYY-MM-DD")
        let TimeNow=dayjs().format("HH:mm:ss")
        
        try{

            console.log("So we'll now try and insert into the database")

            let filename;
 
            if(req.file){
                console.log("Filename: ",req.file)
                filename="StoreLogo"+Date.now()+path.extname(req.file.originalname);
                console.log("file renamed to: ",filename)
                let Dir=path.join(__dirname,"uploads",filename);

                console.log("About to try and compress the file")
                sharp(req.file.buffer)
                .resize({width:250})
                .jpeg({quality:75})
                .toFile(Dir)
            }

            console.log("File compressing done")

            encrypt.hash(Body.store_signup_password,10,async (err,HashedPassword)=>{
              
              console.log("So just hashed the password")
              if(err){
                  return res.json({Status:false,Reason:"Error. Code:500(Server error). It's not you it's us. Try again later"})
              }
              console.log("About to try and update database")

              await con.promise().query("INSERT INTO store_info Values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[StoreID,true,Body.store_name,filename||null,JSON.stringify(Body.StoreTimes),Body.store_signup_email,false,HashedPassword,DateNow,TimeNow,os.type(),req.ip,os.type(),req.ip,dayjs().format("YYYY-MM-DD HH:mm"),null,null,null]);
              await con.promise().query("INSERT INTO allusers values(?,?,?,?,?)",[StoreID,true,Body.store_signup_email,false,HashedPassword]);
               
              let token=jwt.sign({email:Body.store_signup_email,Type:"store"},process.env.JWT_SECRET,{expiresIn:"30m"});
       
              let Mailoptions={
                  from:"futuredlalda33@gmail.com",
                  to:Body.store_signup_email,
                  subject:'Please confirm your DinesNDash Account',
                  html:`
                      <!doctype html>
                      <html lang="en">
                      <head>
                        <meta charset="utf-8">
                        <title>Confirm your account</title>
                        <meta name="viewport" content="width=device-width,initial-scale=1.0">
                        <style>
                          /* Minimal responsive tweak — many clients ignore media queries, but harmless */
                          @media only screen and (max-width:600px) {
                            .container { width: 100% !important; }
                            .stack { display:block !important; width:100% !important; }
                            .btn { width: 100% !important; box-sizing: border-box; }
                          }
                        </style>
                      </head>
                      <body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:Helvetica,Arial,sans-serif;">
                        <!-- Preheader: invisible in body but useful for email previews -->
                        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
                          Confirm your email to activate your DinesNDash account.
                        </div>
                      
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
                          <tr>
                            <td align="center" style="padding:24px;">
                              <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;border-collapse:collapse;border:1px solid #000000;">
                                <!-- Header -->
                                <tr>
                                  <td style="padding:24px;text-align:center;border-bottom:1px solid #000000;">
                                    <!-- Replace with a small logo or plain text brand -->
                                    <div style="font-weight:700;font-size:20px;letter-spacing:1px;">DinesNDash</div>
                                    <div style="font-size:12px;color:#333333;margin-top:6px;">Fast food ordering made simple</div>
                                  </td>
                                </tr>
                      
                                <!-- Body -->
                                <tr>
                                  <td style="padding:32px;">
                                    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#000000;">Confirm your email</h1>
                                    <p style="margin:0 0 18px 0;color:#111111;line-height:1.5;">
                                      Hi <strong style="font-weight:600;">${Body.store_name}</strong>,
                                      <br><br>
                                      Thanks for creating an account at <strong>DinesNDash</strong>. Please confirm your email address so we can activate your account and get you ordering.
                                    </p>
                      
                                    <!-- Call to action button (black & white) -->
                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:18px;">
                                      <tr>
                                        <td align="center">
                                          <a class="btn"
                                             href="http://localhost:4000/auth/api/confirm/password?token=${token}"
                                             style="display:inline-block;padding:12px 22px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;border:1px solid #000000;border-radius:4px;">
                                            Confirm my email
                                          </a>
                                        </td>
                                      </tr>
                                    </table>
                      
                                    <!-- Fallback link for clients that block buttons -->
                                    <p style="margin:18px 0 0 0;color:#111111;font-size:14px;line-height:1.4;">
                                      If the button doesn't work, copy and paste this link into your browser:
                                      <br>
                                      <a href="http://localhost:4000/auth/api/confirm/password?token=${token}" style="color:#000000;text-decoration:underline;word-break:break-all;">Confirm Account</a>
                                    </p>
                      
                                    <hr style="border:none;border-top:1px solid #dddddd;margin:22px 0;">
                      
                                    <p style="margin:0;color:#666666;font-size:13px;line-height:1.45;">
                                      This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this message.
                                    </p>
                                  </td>
                                </tr>
                      
                                <!-- Footer -->
                                <tr>
                                  <td style="padding:18px;text-align:center;font-size:12px;color:#666666;border-top:1px solid #000000;">
                                    <div style="margin-bottom:6px;">©2025. DinesNDash Holdings or its affiliates</div>
                                    <div style="color:#999999">If you did not request this, please ignore. Do not reply to this email.</div>
                                    <div style="margin-top:8px;color:#999999;font-size:11px;"><a href="mailto:services@dinesndash.com">services@dinesndash.com</a></div>
                                  </td>
                                </tr>
                      
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                      </html>
                  `
              }
              EmailTranspoter.sendMail(Mailoptions,err=>{
                  if(err){
                      return res.json({Status:false,Reason:"Server Error:500.Failed to send confirmation Email. Please try again later"})   
                  }
                  console.log("email sent")
                  return res.json({Status:true})
              })
                })

        }catch{(err)=>{
            if(err){
                if(err.code==="ER_DUP_ENTRY"){
                    return res.json({Status:false, Reason:"The used Email has been used before. Please choose different one"})
                }
                // return res.json({Status:false,Reason:"Error. Code:500(Server error). It's not you it's us. Try again later"}).statusCode(500);
                throw err;
            }
        }}
    }else if(req.params.type=="user"){
      console.log("We're working on users Now");
      let Body=req.body;
      console.log(Body)
      console.log("New addition")
      if(Body.user_signup_name==""||Body.UserSignupEmail==""||Body.UserSignUpPassword==""){
        console.log("Signup name, signup email or password is '' ");
        return res.json({Status:false,Reason:"Error 400:Bad request"})
      }

      console.log("About to enter the hash function")

      encrypt.hash(Body.UserSignUpPassword,10,async (err,HashedPassword)=>{
        if(err){
          return res.json({Status:false,Reason:"Server Error(500). Please try again later"})
        }
        console.log("We're about to enter try-catch now");
        try {      
          let UserId=uuid.v4();
          console.log("About to update database")
        
          await con.promise().query("INSERT INTO user_info VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[UserId,false,Body.user_signup_name,false,Body.UserSignupEmail,HashedPassword,JSON.stringify(Body.Allergies),dayjs().format("YYYY-MM-DD"),dayjs().format("HH:mm:ss"),os.type(),req.ip,dayjs().format("YYYY-MM-DD HH:mm:ss"),os.type(),req.ip,null,null,null,null]);
          await con.promise().query("INSERT INTO allusers values(?,?,?,?,?)",[UserId,false,Body.UserSignupEmail,false,HashedPassword]);
          console.log("Done updating database. About to send email")
          let token=jwt.sign({email:Body.UserSignupEmail,Type:"user",ID:UserId},process.env.JWT_SECRET,{expiresIn:"30m"});
          let Mailoptions={
              from:"futuredlalda33@gmail.com",
              to:Body.UserSignupEmail,
              subject:'Please confirm your DinesNDash Account',
              html:`
                  <!doctype html>
                  <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <title>Confirm your account</title>
                    <meta name="viewport" content="width=device-width,initial-scale=1.0">
                    <style>
                      /* Minimal responsive tweak — many clients ignore media queries, but harmless */
                      @media only screen and (max-width:600px) {
                        .container { width: 100% !important; }
                        .stack { display:block !important; width:100% !important; }
                        .btn { width: 100% !important; box-sizing: border-box; }
                      }
                    </style>
                  </head>
                  <body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:Helvetica,Arial,sans-serif;">
                    <!-- Preheader: invisible in body but useful for email previews -->
                    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
                      Confirm your email to activate your DinesNDash account.
                    </div>
                  
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
                      <tr>
                        <td align="center" style="padding:24px;">
                          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;border-collapse:collapse;border:1px solid #000000;">
                            <!-- Header -->
                            <tr>
                              <td style="padding:24px;text-align:center;border-bottom:1px solid #000000;">
                                <!-- Replace with a small logo or plain text brand -->
                                <div style="font-weight:700;font-size:20px;letter-spacing:1px;">DinesNDash</div>
                                <div style="font-size:12px;color:#333333;margin-top:6px;">Fast food ordering made simple</div>
                              </td>
                            </tr>
                  
                            <!-- Body -->
                            <tr>
                              <td style="padding:32px;">
                                <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#000000;">Confirm your email</h1>
                                <p style="margin:0 0 18px 0;color:#111111;line-height:1.5;">
                                  Hi <strong style="font-weight:600;">${Body.user_signup_name}</strong>,
                                  <br><br>
                                  Thanks for creating an account at <strong>DinesNDash</strong>. Please confirm your email address so we can activate your account and get you ordering.
                                </p>
                  
                                <!-- Call to action button (black & white) -->
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:18px;">
                                  <tr>
                                    <td align="center">
                                      <a class="btn"
                                         href="http://localhost:4000/auth/api/confirm/password?token=${token}"
                                         style="display:inline-block;padding:12px 22px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;border:1px solid #000000;border-radius:4px;">
                                        Confirm my email
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                  
                                <!-- Fallback link for clients that block buttons -->
                                <p style="margin:18px 0 0 0;color:#111111;font-size:14px;line-height:1.4;">
                                  If the button doesn't work, copy and paste this link into your browser:
                                  <br>
                                  <a href="http://localhost:4000/auth/api/confirm/password?token=${token}" style="color:#000000;text-decoration:underline;word-break:break-all;">Confirm Account</a>
                                </p>
                  
                                <hr style="border:none;border-top:1px solid #dddddd;margin:22px 0;">
                  
                                <p style="margin:0;color:#666666;font-size:13px;line-height:1.45;">
                                  This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this message.
                                </p>
                              </td>
                            </tr>
                  
                            <!-- Footer -->
                            <tr>
                              <td style="padding:18px;text-align:center;font-size:12px;color:#666666;border-top:1px solid #000000;">
                                <div style="margin-bottom:6px;">©2025. DinesNDash Holdings or its affiliates</div>
                                <div style="color:#999999">If you did not request this, please ignore. Do not reply to this email.</div>
                                <div style="margin-top:8px;color:#999999;font-size:11px;"><a href="mailto:services@dinesndash.com">services@dinesndash.com</a></div>
                              </td>
                            </tr>
                  
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                  </html>
              `
          }

          console.log("Done Creating email options")

          EmailTranspoter.sendMail(Mailoptions,err=>{
            console.log("Attempting to send email")
              
            if(err){
              return res.json({Status:false,Reason:"Server Error:500.Failed to send confirmation Email. Please try again later"})   
            }
  
            console.log("email sent")
            return res.json({Status:true})
          })
        } catch (error) {
          if(error){
            if(error.code==="ER_DUP_ENTRY"){
              return res.json({Status:false, Reason:"The used Email has been used before. Please choose different one"})
            }
          }else{
            return res.json({Status:false,Reason:"Server Error(500). Please try again later"})
          }
          
        }
        })
    }

});
app.get("/auth/api/confirm/password/",async (req,res)=>{
    let Token=req.query.token;
    console.log(Token)

    jwt.verify(Token,process.env.JWT_SECRET,async (err,decoded)=>{
      try {
        if(decoded.Type=="store"){
          await con.promise().query("UPDATE store_info SET verified=? WHERE store_email=?",[true,decoded.email]);
          await con.promise().query("UPDATE allusers SET verified=? WHERE email=?",[true,decoded.email]);

          console.log("Just updated store table")

          return res.redirect("/home")
        
        }else if(decoded.Type=="user"){
          let PromoCode=uuid.v4();
          let PromoCodeExpiery=dayjs().add(45,"days");
          let PromoCodes=[];
          PromoCodes.push(PromoCode);
          PromoCodes=JSON.stringify(PromoCodes);
          await con.promise().query("UPDATE user_info SET verified=?,promocodes=? WHERE email=?",[true,PromoCodes,decoded.email]);
          await con.promise().query("INSERT INTO promocodes values(?,?,?,?)",[decoded.ID,PromoCode,0,dayjs(PromoCodeExpiery).format("YYYY-MM-DD")]);
          await con.promise().query("UPDATE allusers SET verified=? WHERE email=?",[true,decoded.email]);
          console.log("Just updated store table")

          return res.redirect("/home");
        }
        
      } catch (error) {
        if(error){
          return res.sendFile(path.join(__dirname,"assets","error500.html"))
        }
        
      }
    })
});

app.get("/forgot-password",authenticated,(req,res)=>{
  try {
    console.log("Rendering forget password page");
    return res.render("forgot");
  } catch (error) {
    
  }
});

app.post("/forgot-password/:email",async (req,res)=>{
  try{
    let [user]=await con.promise().query("SELECT * from user_info where email=? and verified=?",[req.params.email,true]);
    user=user[0];
    console.log("user",user);
    if(user===undefined){
      return res.json({Status:false,reason:"No user with that email has been found. Try creating an account <a href='/signup'>here</a>"});
    }

    let updates=await con.promise().query("SELECT date_of_update from info_updates where user_id=?",[user.id]);
    updates=updates[0];
    let now=dayjs();
    let difference=now.diff(dayjs(updates.date_of_update),"hours");
    if(difference<72){
      return res.json({Status:false,reason:"You can only request a password reset once every 72 hours. Please try again later."})
    }

    let resetCode=uuid.v4();
    await con.promise().query("INSERT INTO password_reset(email,reset_code,Timing) VALUES(?,?,?)",[req.params.email,resetCode,dayjs().format("YYYY-MM-DD HH:mm:ss")]);
    let token=jwt.sign({email:req.params.email,code:resetCode},process.env.JWT_SECRET,{expiresIn:"20m"});
    let Mailoptions={
      from:"futuredladla33@gmail.com",
      to:req.params.email,
      subject:'DinesNDash Password Reset',
      html:`
          <p>Click the link below to reset your password. This link will expire in 20 minutes.</p>
          <a href="http://localhost:4000/reset-password/api/auth/reset?token=${token}">Reset Password</a>
      `
    }
    EmailTranspoter.sendMail(Mailoptions,err=>{
      if(err){
        throw err
      }
      
    })
    return res.json({Status:true});
  }catch(err){}
});

app.get("/reset-password/api/auth/reset", async (req, res) => {
  try {
    const token = req.query.token;


    if (!token) {
      return res.status(400).send("Reset token is missing or invalid");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send("Reset token expired or invalid");
      }

      res.render("reset_password", {
        email: decoded.email,
        reset_code: decoded.code
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


app.post("/reset/password",async(req,res)=>{
  try {
    let [user]=await con.promise().query("SELECT * from user_info where email=?",[req.body.email]);
    user=user[0];
    if(user.length==0){
      return res.sendFile(path.join(__dirname,"assets","error500.html"));
    }
    let rest_info=await con.promise().query("SELECT * from password_reset where email=? ORDER BY Timing LIMIT 1",[req.body.email]);
    rest_info=rest_info[0];
    if(rest_info.length==0 ||rest_info.reset_code!==req.body.reset_code|| dayjs().diff(dayjs(rest_info.Timing),"minutes")>20){
      return res.sendFile(path.join(__dirname,"assets","error500.html"));
    }
    let UserAgent=req.headers["user-agent"];
    UserAgent=UserAgent.slice(0,80);
    encrypt.hash(req.body.password,10,async (err,HashedPassword)=>{
      if(err) throw err;
      await con.promise().query("UPDATE user_info SET password=? where email=?",[HashedPassword,req.body.email]);
      await con.promise().query("DELETE from password_reset where email=?",[req.body.email]);
      await con.promise().query("UPDATE allusers SET Password=? where email=?",[HashedPassword,req.body.email]);
      await con.promise().query("UPDATE info_updates SET update_type=?,date_of_update=?,update_os=? WHERE user_id=?",["password update",dayjs().format("YYYY-MM-DD HH:mm:ss"),UserAgent,user.id])
      return res.redirect("/signup");
    })
  } catch (error) {
    if(error) throw error;
  }
})

app.post("/update-profile",NotAuthenticated,user,async (req,res)=>{
  try {
    console.log(req.body)
    if(req.body.fullname===""){
      return res.redirect("/home");
    }

    let [updates]=await con.promise().query("SELECT date_of_update from info_updates where user_id=?",[req.user.id]);
    updates=updates[0];
    let now=dayjs();
    let difference=now.diff(dayjs(updates.date_of_update),"hours");
    if(difference<72){
      return res.send("You can only update profile once in 72 hours")
    }
    let UserAgent=req.headers["user-agent"];
    UserAgent=UserAgent.slice(0,80);
    await con.promise().query("UPDATE info_updates SET update_type=?,date_of_update=?,update_os=? WHERE user_id=?",["profile update",dayjs().format("YYYY-MM-DD"),UserAgent,req.user.id])
    await con.promise().query("UPDATE user_info SET fullname=? where id=?",[req.body.fullname,req.user.id]);
    return res.redirect("/home");
  } catch (error) {
    if(error) throw error;
  }
});

app.post("/accept/order",NotAuthenticated,driver,async (req,res)=>{
  try {
    console.log("Body",req.body)
    let [data]=await con.promise().query("SELECT * from orders where id=?",[req.body.orderId]);
    let [delivery_check]=await con.promise().query("SELECT * FROM DELIVERY where DRIVER_ID=? AND delivery_status <> ?",[req.user.id,"DELIVERED"]);
    console.log(delivery_check);
    if(delivery_check.length>0){
      return res.json({Status:false,reason:`You have ${delivery_check.length} pending Deliveries. Please finish the trip to accept new order.`})
    }
    data=data[0];
    console.log("Order data:",data);
    if(req.body.location=={}||req.body.location==undefined||data==undefined){
      console.log("Redirecting back to driver home");
      return res.json({success:false});
    }
    console.log("Everything is fine so far");
    console.log("Calculating distance between",req.body.location,"and",JSON.parse(data.delivery_geolocation));
    let Distance=getDistanceInMeters(req.body.location,JSON.parse(data.delivery_geolocation));
    console.log("Distance in meters:",Distance);
    let estimated_time=Distance/22.2;
    console.log("Estimated time in seconds:",estimated_time);
    console.log("about to fetch store location")
    let store_location=await con.promise().query("SELECT location from store_info where id=?",[data.store_id]);
    store_location=store_location[0][0].location;
    console.log("Calculating distance between",req.body.location,"and store location",JSON.parse(store_location));
    let DistanceToStore=getDistanceInMeters(req.body.location,JSON.parse(store_location));
    console.log("Trying to update database")
    await con.promise().query("INSERT INTO delivery VALUES(?,?,?,?,?,?,?,?,?,?,?)",[data.user_id,req.user.id,data.delievery_fee*0.75,req.body.orderId,"FETCHING_ORDER",data.delivery_geolocation,JSON.stringify(req.body.location),store_location,estimated_time,dayjs().format("YYYY-MM-DD HH:mm:ss"),dayjs().format("YYYY-MM-DD HH:mm:ss")]);
    await con.promise().query("UPDATE orders set delivery_status=? where id=?",["FETCHING_ORDER",req.body.orderId]);
    console.log("Data base updated successfully")
    return res.json({success:true})
  } catch (error) {
    throw error;
  }
})

app.get("/order/for/driver/:order_id",NotAuthenticated,driver,async (req,res)=>{
  try {
    let [order_info]=await con.promise().query("SELECT d.*,u.fullname from delivery d JOIN user_info u ON u.id=d.user_id where d.order_id=? and d.DRIVER_ID=?",[req.params.order_id,req.user.id]);
    order_info=order_info[0];
    console.log(order_info);
    if(order_info.delivery_status=="DELIVERED"){
      let stats
      let [check]=await con.promise().query("SELECT * FROM driver_feedback where order_id=? AND driver_id=?",[req.params.order_id,req.user.id]);
      if(check.length>0){
        stats=true
      }else{
        stats=false;
      }
      return res.render("successful_order",{order_info,stats});
    }
    let [fullData]=await con.promise().query("SELECT * from orders where id=?",[req.params.order_id]);

    fullData.forEach(data=>{
      let el=JSON.parse(data.dilivery_address);
      data.delivery_address=decrypt(el);
    })
   
    let [order_code]=await con.promise().query("SELECT oder_code from orders where id=?",[req.params.order_id]);
    order_code=order_code[0].oder_code;
    if(order_info===undefined||order_info.length==0){
      return res.redirect("/home/driver");
    }
    console.log("Order info for driver:",order_info);
    
    let [chats]=await con.promise().query("SELECT * FROM chat where order_id=? and driver_id=? ORDER BY datesent ASC",[req.params.order_id,req.user.id]);
    // console.log("Chats for order:",chats[0]);
  
    return res.render("driver_delivery",{order:order_info,chats,order_code,Data:fullData});
  } catch (error) {
    if(error) throw error;
  }
});

app.post("/driver_feedback/:order_id",NotAuthenticated,driver,async (req,res)=>{
  console.log(req.body);
  try {
    let [check]=await con.promise().query("SELECT * FROM driver_feedback where order_id=? AND driver_id=?",[req.params.order_id,req.user.id]);
    if(check.length>0){
      return res.redirect(`/order/for/driver/${req.params.order_id}`);
    }  

    await con.promise().query("INSERT INTO driver_feedback VALUES(?,?,?,?,?,?,?)",[req.params.order_id,req.user.id,req.body.map_rating,req.body.feedback,req.body.user_rating,req.body.user_feedback,dayjs().format("YYYY-MM-DD HH:mm:ss")]);
    return res.redirect(`/order/for/driver/${req.params.order_id}`);
  } catch (error) {
    if(error) throw error
  }
})

app.post("/driver/arrived/:order_id",NotAuthenticated,driver,async (req,res)=>{
  try {
    console.log("Order ID:",req.params.order_id);
    await con.promise().query("UPDATE delivery SET delivery_status=? where order_id=? AND DRIVER_ID=? ",["ARRIVED",req.params.order_id,req.user.id]);
    await con.promise().query("UPDATE orders SET order_status=?,delivery_status=? where id=?",["ARRIVED","ARRIVED",req.params.order_id])
    io.emit("Data Base Updated",{
      order_id:req.params.order_id,
      status:"The driver is here!"
    });
    return res.json({Status:true});

  } catch (error) {
    if(error) throw error;
  }
});

app.post("/order/delivered/:order_id",NotAuthenticated,driver,async (req,res)=>{
  try {
    
    let user_code=await con.promise().query("SELECT user_code FROM orders where id=?",[req.params.order_id]);
    user_code=user_code[0][0].user_code;
    let frontend_code=JSON.parse(req.body.confirmationCode);
    
    if(user_code!==frontend_code){
      return res.json({Status:false,reason:"Incorrect code entered"});
    }


    let [data]=await con.promise().query("SELECT * FROM orders where id=?",[req.params.order_id]);

    data=data[0];
    let store_id=data.store_id;
    let amount=data.subtotal;
    let earning=data.delievery_fee*0.75;
    let meal_id=data.meal_id;
    let quantity=data.quantity;

    await con.promise().query("UPDATE delivery SET delivery_status=? where order_id=? AND DRIVER_ID=? ",["DELIVERED",req.params.order_id,req.user.id]);
    await con.promise().query("UPDATE orders SET delivery_status=?,order_status=?, updated_at=? where id=? ",["DELIVERED","DELIVERED",dayjs().format("YYYY-MM-DD HH:mm:ss"),req.params.order_id]);
    await con.promise().query("UPDATE meals SET sales=sales+? WHERE meal_id=?",[quantity,meal_id]);
    await con.promise().query("UPDATE store_wallet SET amount=amount+? where store_id=?",[amount,store_id])
    await con.promise().query("UPDATE driver_earnings SET amount=amount+? where driver_id=?",[earning,req.user.id]);


    return res.json({Status:true});
    
  } catch (error) {
    if(error) throw error;
  }
})

app.post("/send/order/chat",NotAuthenticated,driver,async (req,res)=>{
  try {
    console.log("Body:",req.body);
    let [user_id]=await con.promise().query("SELECT user_id from orders where id=?",[req.body.orderId]);
    if(user_id[0]===undefined){
      return res.json({Status:false,reason:"Order not found"});
    }

    console.log("Inserting chat into database");
    await con.promise().query("INSERT INTO chat VALUES(?,?,?,?,?,?)",[user_id[0].user_id,req.user.id,req.body.orderId,"driver",req.body.chatValue,dayjs().format("YYYY-MM-DD HH:mm:ss")]);
    io.emit("new chat",{
      orderId:req.body.orderId,chat_value:req.body.chatValue
    })
    return res.json({Status:true});
  } catch (error) {
    if(error) throw error;
  }
})

app.post("/send/order/chat/by/user",NotAuthenticated,user,async (req,res)=>{
  try {
    console.log("Body:",req.body);
    let [user_id]=await con.promise().query("SELECT DRIVER_ID from delivery where order_id=? AND user_id=?",[req.body.orderId,req.user.id]);
    if(user_id[0]===undefined){
      return res.json({Status:false,reason:"Order not found"});
    }

    console.log("Inserting chat into database");
    await con.promise().query("INSERT INTO chat VALUES(?,?,?,?,?,?)",[req.user.id,user_id[0].DRIVER_ID,req.body.orderId,"user",req.body.chatValue,dayjs().format("YYYY-MM-DD HH:mm:ss")]);
    io.emit("new chat for driver",{
      orderId:req.body.orderId,chatValue:req.body.chatValue,message_by:"user"
    })
    return res.json({Status:true});
  } catch (error) {
    if(error) throw error;
  }
})

app.get("/drivers/signup",authenticated,(req,res)=>{
  try {
    
  } catch (error) {
    if(error) throw error;
  }
})

app.get("/search/:value",NotAuthenticated,user,async (req,res)=>{
  try {
    let cheap=await con.promise().query("SELECT * FROM meals ORDER BY SellingPrice DESC");
    let Trending=await con.promise().query("SELECT * FROM meals ORDER BY sales DESC");
    cheap=cheap[0];
    Trending=Trending[0];

    let stores=await con.promise().query("SELECT storename,store_logo,id from store_info where verified=?",[true])
    stores=stores[0]
    console.log(stores)
    return res.render("search",{first_value:req.params.value,hot:Trending,cheap,stores})

    
  } catch (error) {
    if(error) throw error;
  }  
});


app.post('/update/category/:Cat_id',NotAuthenticated,store,upload.single('category_pic'),async (req,res)=>{
  try {
    let FrontendCode=req.body.safety_code;
    let Safety=await con.promise().query("SELECT store_code FROM store_info where id=?",[req.user.id]);
    Safety=Safety[0][0].store_code;

    if(Safety!==FrontendCode){
      return res.redirect("/categories")
    }
  
    if(req.file){
     console.log("file exist")
     let filename=req.body.category_name+Date.now()+path.extname(req.file.originalname);
     console.log(filename);
     let ToFile=path.join(__dirname,"public",filename);
     sharp(req.file.buffer).resize({width:300}).jpeg({quality:90}).toFile(ToFile);
     await con.promise().query("UPDATE catagories SET category_pic=?,catagory_name=? where Cat_id=?",[filename,req.body.category_name,req.params.Cat_id]);
    }else{
      await con.promise().query("UPDATE catagories SET catagory_name=? where Cat_id=?",[req.body.category_name,req.params.Cat_id]);
    }
    return res.redirect("/categories");
    
  } catch (error) {
    throw error;
  }
});

app.post("/update/product/:meal_id",NotAuthenticated,store,upload.array("product_pic",5),async (req,res)=>{
  try {
    let [code]=await con.promise().query("SELECT store_code from store_info where id=?",[req.user.id])
    code=code[0];
    console.log(code);
    if(req.body.safety_code!==code.store_code||req.body.safety_code==""){
      return res.sendFile(path.join(__dirname,"assets","error500.html"));
    }

    let body=req.body;
    if(body.product_name==""||body.product_price==""||body.from==""||body.to==""||body.ingredients==""){
      return res.sendFile(path.join(__dirname,"assets","error500.html"));
    }

    console.log("Body",req.body)
    await con.promise().query("UPDATE meals SET meal_name=?,price=?,SellingPrice=?")

  } catch (error) {
    if(error) throw error;
  }
})

app.post('/meal/availability/:a/:meal_id',NotAuthenticated,store,async (req,res)=>{
  try {
    let security_code=JSON.parse(req.body.security_code);

    let [Code]=await con.promise().query("SELECT store_code FROM store_info WHERE id=?",[req.user.id]);
    Code=Code[0];

    if(!security_code==Code){
      return res.redirect("/all/products")
    }
    
    await con.promise().query("UPDATE meals SET availability=? WHERE meal_id=?",[req.params.a,req.params.meal_id])
    return res.redirect("/all/products")
  } catch (error) {
    if(error) throw error;
  }
})

app.post("/search/:value",NotAuthenticated,user,async (req,res)=>{
  try {
    // let stores=await con.promise().query(`SELECT s.storename,s.id from store_info s ON JOIN meals m ON m.store_id=s.id where s.storename REGEXP ? AND s.verified=${true}`,[req.params.value]);
    let stores = await con.promise().query(`SELECT DISTINCT s.storename, s.id FROM store_info s JOIN meals m ON m.store_id = s.id WHERE s.storename REGEXP ? AND s.verified = 1`, [`.*${req.params.value}.*`]);

    let meals=await con.promise().query("select * from meals m JOIN catagories c on m.Cat_id=c.Cat_id where m.meal_name REGEXP ? OR m.keywords REGEXP ? OR c.catagory_name REGEXP ?",[req.params.value,req.params.value,req.params.value]);
    let categories=await con.promise().query("select * from catagories where catagory_name REGEXP ? ",[req.params.value]);
    categories=categories[0]
    meals=meals[0]
    stores=stores[0]
    console.log("Returned Stores",stores);
    console.log("Returned meals",meals);
    console.log("Returned categories",categories)

    if(stores.length==0 && meals.length==0 && categories==0){
      return res.json({Status:false})
    }

    return res.status(200).json({Status:true,stores,meals,categories})
    
  } catch (error) {
    if(error) throw error;
  }
});

app.get("/categories",NotAuthenticated,store,async (req,res)=>{
  try {
    let categories=await con.promise().query("SELECT c.catagory_name,c.Cat_id,c.category_pic,SUM(m.sales) AS total_sales FROM catagories c LEFT JOIN meals m ON m.Cat_id = c.Cat_id WHERE c.store_id = ? GROUP BY c.Cat_id, c.catagory_name,c.category_pic",[req.user.id]);
    let name=await con.promise().query("SELECT storename from store_info WHERE id=?",[req.user.id]);

    categories=categories[0];

    return res.render("full_categories",{categories,Name:name[0][0].storename,store_id:req.user.id});
  } catch (error) {
    if(error) throw error;
  }
});

app.get("/all/products",NotAuthenticated,store,async (req,res)=>{
  try {
    let products=await con.promise().query("SELECT m.*,c.catagory_name FROM meals m JOIN catagories c on c.Cat_id=m.Cat_id where m.store_id=?",[req.user.id]);
    products=products[0];
    console.log("All products",products);
    let name=await con.promise().query("SELECT storename from store_info WHERE id=?",[req.user.id]);
    return res.render("all_products",{Products:products,Name:name[0][0].storename,store_id:req.user.id})
  } catch (error) {
    throw error
  }
})

app.get("/settings",NotAuthenticated,user,async (req,res)=>{
  try {
    let info=await con.promise().query("SELECT numbers,number_verified,email,verified,fullname,allergies,loginos,logindate,logoutos,logoutdate FROM user_info where id=?",[req.user.id]);
    info=info[0][0]
    console.log(info);

    // let meals=await con.promise().query("select *, count(*) from orders group by m.meal_name from JOIN meals m on m.meal_id=o.meal_id where user_id=? ",[req.user.id]);
    const [meals] = await con.promise().query( `SELECT m.meal_id,m.meal_name,COUNT(o.id) AS total_orders FROM orders o JOIN meals m ON m.meal_id = o.meal_id WHERE o.user_id = ? AND order_status=? GROUP BY m.meal_id, m.meal_name`,[req.user.id,"COLLECTED"]);
   let name=await con.promise().query("SELECT fullname from user_info where id=?",[req.user.id]);
   let Name=name[0][0].fullname;

    return res.render("settings_user",{user:info,meals,Name})
  } catch (error) {
    if(error) throw error;
  }
})

app.get("/meal/details/:meal_id", NotAuthenticated, user, async (req, res) => {
  console.log("Request for ID:", req.params.meal_id);
  
  // 1. Ignore favicon requests immediately
  if (req.params.meal_id === 'favicon.ico') {
      return res.status(204).end(); 
  }

  try {
    let [rows] = await con.promise().query(
        "SELECT m.*, s.storename FROM meals m JOIN store_info s ON m.store_id=s.id WHERE meal_id=?", 
        [req.params.meal_id]
    );

    // 2. Check if the meal actually exists
    if (!rows || rows.length === 0) {
        console.log("Meal not found in database");
        return res.status(404).send("Meal not found");
    }

    let ratings=await con.promise().query("SELECT rating from ratings where meal_id=?",[req.params.meal_id]);
    console.log(ratings[0]);
    console.log("Ratings length", ratings[0].length)
    let voters=ratings[0].length;
    let Total=0
    ratings[0].forEach(el=>{
      Total+=el.rating;
    });

    console.log("Total",Total);
    console.log("So average rating",Total/voters)

    let mealData = rows[0];
    console.log("Meal found:", mealData.meal_name);

    let Ingredients = JSON.parse(mealData.ingredients || "[]");
    let images = JSON.parse(mealData.Images || "[]");
    console.log("images",images);

    return res.render("meal_info", { Meals: mealData, Ingredients, images });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/all/orders/users",NotAuthenticated,user,async (req,res)=>{
  try {
    let orders=await con.promise().query("SELECT * FROM orders where user_id=?",[req.user.id]);
    // console.log("Orders",orders);
    let user=await con.promise().query("select fullname from user_info where id=?",[req.user.id]);
    return res.render("all_orders",{Orders:orders[0],user:user[0][0]});
  } catch (error) {
    if(error) throw error;
  }
});

app.get("/new/orders",NotAuthenticated,store,async (req,res)=>{
  console.log("New orders route triggered");
  NewOrders(req.user.id,res);
});

app.get("/category/user/:cat_id",NotAuthenticated,user,async (req,res)=>{
  console.log("Category Id:",req.params.cat_id);
  try{
    let [meals]=await con.promise().query("select m.*,s.storename from meals m JOIN store_info s on s.id=m.store_id where Cat_id=? ORDER BY price",[req.params.cat_id]);
    let [cat_name]=await con.promise().query("select catagory_name from catagories where Cat_id=?",[req.params.cat_id]);
    let store_name=await con.promise().query("SELECT c.*,s.storename from catagories c JOIN store_info s ON s.id=c.store_id where Cat_id=?",[req.params.cat_id]);
    let [user_info]=await con.promise().query("SELECT fullname FROM user_info WHERE id=?",[req.user.id]);
    if(cat_name.length===0){
      return
    }
    console.log("cat name",cat_name);
    return res.render("categories",{meals,Category_name:cat_name[0].catagory_name,CategoryId:req.params.cat_id,StoreName:store_name[0][0].storename,user:user_info[0]});
  }catch(err){
    if(err){
      throw err;
    }
  }
})

app.post("/stock/images",NotAuthenticated,store,async (req,res)=>{
  console.log("Api received");
  try {
    console.log(req.body.query);
    if(req.body.query=="") return;
    let photos=[]


    await fetch(`https://api.unsplash.com/search/photos?client_id=${unsplash_id}&query=${req.body.query}&per_page=5`)
    .then(res=>res.json()).then(data=>{
      data.results.forEach(url=>{
        console.log(url.urls.raw)
        photos.push(url.urls.raw)
      })
    });
    console.log(photos)
    return res.status(200).json({status:true,images:photos});
    
  } catch (error) {
    if(error) return;
  }
})


app.get("/store/:id",NotAuthenticated,user,async (req,res)=>{
  console.log("Page accessed")
  try {
    let Trending=await con.promise().query("SELECT * FROM meals where store_id=? order by sales desc",[req.params.id]);
    let Deals=await con.promise().query("SELECT * FROM meals where store_id=? order by price",[req.params.id]);
    let Categories=await con.promise().query("SELECT * FROM catagories where store_id=?",[req.params.id]);
    let StoreName=await con.promise().query("SELECT storename from store_info where id=?",[req.params.id]);
    let user=await con.promise().query("select fullname from user_info where id=?",[req.user.id]);
    console.log("Categories", Categories[0])
    console.log(StoreName[0][0])
    return res.render("store_info",{storename:StoreName[0][0].storename,Deals:Deals[0],Trending:Trending[0],Categories:Categories[0],user:user[0][0]});
  } catch (error) {
    if(error){
      throw error
    }
    
  }
})

app.get("/category/:cat_id",NotAuthenticated,store,async (req,res)=>{
  try{
    let [meals]=await con.promise().query("select * from meals where Cat_id=? ORDER BY price",[req.params.cat_id]);
    let [cat_name]=await con.promise().query("select catagory_name from catagories where Cat_id=?",[req.params.cat_id]);
    let StoreID=await con.promise().query("select store_id from catagories where Cat_id=?",[req.params.cat_id]);
    console.log("Store ID:",StoreID[0][0].store_id);
    console.log(meals)
    return res.render("category",{meals,Category_name:cat_name[0].catagory_name,CategoryId:req.params.cat_id,StoreId:StoreID[0][0].store_id});
  }catch(err){
    if(err){
      throw err;
    }
  }
});

app.post("/upload/meal/:storeId/:catId",NotAuthenticated,store,upload.array("images",5),async (req,res)=>{
  console.log("API recieved");
  console.log(req.params.catId);
  console.log(req.params.storeId);
  console.log(req.body);
  console.log(req.files);
 
  try{
    let images=[];
    let Filename=req.body.MealName+Date.now()+Math.floor(Math.random())+".png";
    let Path=path.join(__dirname,"public",Filename)
    for(let image of req.files){
      sharp(image.buffer)
      .resize({width:320})
      .jpeg({quality:89})
      .toFile(Path)
      images.push(Filename);
    }
    images=JSON.stringify(images);
    let meal_id=uuid.v1();
    con.promise().query("INSERT INTO meals values(?,?,?,?,?,?,?,?,?,?,?,?)",[req.params.storeId,req.params.catId,meal_id,req.body.MealName,req.body.price,req.body.price*1.25,0,images,req.body.ingredients,req.body.keywords,req.body.from,req.body.to]);
    return res.status(200).json({Status:true});
  }catch(err){
    if(err){
      throw err;
    }
  }
});

app.post("/new/category",NotAuthenticated,store,upload.single("images"),async (req,res)=>{
  try {
    let filename;
    if(req.file){
      filename=req.body.cat_name+"-"+Date.now()+"-"+path.extname(req.file.originalname);
      let ToRoute=path.join(__dirname,"uploads",filename);
      sharp(req.file.buffer)
      .jpeg({quality:90})
      .resize({width:340})
      .toFile(ToRoute);
    }

    let cat_id=uuid.v4();
    console.log(req.body)
    if(!req.body.selected_stock_image){
      console.log("This time we will append uploaded file")
      await con.promise().query("INSERT INTO catagories VALUES(?,?,?,?,?)",[req.user.id,req.body.cat_name,cat_id,filename,"no"]);
    }else if(req.body.selected_stock_image){
      console.log("This time we will append Stock Image")
      await con.promise().query("INSERT INTO catagories VALUES(?,?,?,?,?)",[req.user.id,req.body.cat_name,cat_id,req.body.selected_stock_image,"yes"]);
    }
    return res.status(200).json({success:true});
  } catch (error) {
    if(error){
      throw error
    }
    
  }
});

app.post("/send/feedback",NotAuthenticated,user,async (req,res)=>{
  console.log(req.body);
  try {
    console.log("Now we are inside try")
    if(req.body.feedback_text==""||req.body.Type==""||req.body.meal_id==""){
      console.log("Okay something is broken");
      return res.status(400).json({status:false,message:"something is broken"});
    }
    console.log(req.body.meal_id);

    if(req.body.Type=="feedback"||req.body.Type=="report"||req.body.Type=="suggestion"){
      await con.promise().query("UPDATE orders set feedback_status='yes', feed_back_type=?, feedback_message=? where user_id=? AND id=? AND meal_id=?",[req.body.Type,req.body.feedback_text,req.user.id,req.body.OrderId,req.body.meal_id]);
      await con.promise().query("INSERT INTO meal_feedback VALUES(?,?,?,?)",[req.body.meal_id,req.user.id,req.body.Type,req.body.feedback_text]);
      return res.status(200).json({status:true})
    }
    return res.status(400).json({status:false,message:"something is broken"});

    
  } catch (error) {
    if(error){
      throw error
    }
    
  }
})

app.get("/order/for/customer/:order_id",NotAuthenticated,user,async (req,res)=>{
  console.log("order Id",req.params.order_id);
  try {
    let [user_info]=await con.promise().query("SELECT * FROM user_info WHERE id=?",[req.user.id]);

    let [order]=await con.promise().query("SELECT * FROM orders o JOIN meals m on m.meal_id=o.meal_id where o.id=? AND o.user_id=?",[req.params.order_id,req.user.id]);
    if(order.length==0){
      return res.redirect("/home")
    }
    
    let [chats]=await con.promise().query("SELECT * FROM chat where order_id=? and user_id=? ORDER BY datesent ASC",[req.params.order_id,req.user.id]);
    let [delivery_fee]=await con.promise().query("SELECT delievery_fee FROM orders where id=?",[req.params.order_id]);
    let [delivery_info]=await con.promise().query("SELECT * FROM delivery where order_id=?",[req.params.order_id]);
    delivery_fee=delivery_fee[0].delievery_fee;
    return res.render("order",{Orders:order,user:user_info[0],order_id:req.params.order_id,UserId:req.user.id,chats,delivery_fee,delivery_info});
  } catch (error) {
    if(error){
      throw error;
    }
    
  }
})

app.post("/post/to/ratings",NotAuthenticated,user,async (req,res)=>{
  console.log("API received");
  console.log(req.body);
  try {
    let check=await con.promise().query("SELECT rated from orders where id=? and meal_id=?",[req.body.OrderId,req.body.meal_id]);
    if(check[0].length==0 || check[0][0].rated=="yes"){
      return res.status(400).json({status:false,message:"Something went wrong"});
    }
    await con.promise().query("INSERT INTO ratings VALUES(?,?,?)",[req.body.meal_id,req.body.UserId,req.body.Value]);
    await con.promise().query("UPDATE orders set rated=? where id=? AND meal_id=?",["yes",req.body.OrderId,req.body.meal_id]);
  } catch (error) {
    if(error){
      throw error
    }
    
  }
});

function getDistanceInMeters(loc1, loc2) {
    const R = 6371; // Earth radius in KM

    const lat1 = loc1.lat * Math.PI / 180;
    const lat2 = loc2.lat * Math.PI / 180;
    const deltaLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = R * c;
    return distanceKm * 1000; // meters
}

function getLocationAsync() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                const locationData = {
                    lat: latitude,
                    lng: longitude,
                    expiry: new Date().toISOString()
                };

                // Save to localStorage
                localStorage.setItem("Cookies", JSON.stringify([locationData]));

                resolve(locationData);
            },
            error => reject(error)
        );
    });
}

async function init() {
    try {
        const location = await getLocationAsync();
        console.log("Location:", location);
    } catch (err) {
        console.error("Location error:", err.message);
    }
}

app.get("/gateway/payment/route/:order_id",NotAuthenticated,user,async (req,res)=>{
  console.log(req.params.order_id);
  try {
    let Orders=await con.promise().query("SELECT o.dilivery_type,o.order_status,o.quantity,o.amount,o.subtotal,m.meal_name FROM orders o JOIN meals m on m.meal_id=o.meal_id where id=?",[req.params.order_id]);
    Orders=Orders[0]
    if(Orders.length==0){
      return
    }
    console.log(Orders[0])
    if(Orders[0].order_status!=="CREATED"){
      return res.redirect(`/order/for/customer/${req.params.order_id}`)
    }

    let type=Orders[0].dilivery_type;
    let cards=await con.promise().query("SELECT card_number,card_id,year,month FROM payment_info where user_id=?",[req.user.id]);
    let addresses=await con.promise().query("SELECT * FROM delivery_adress where user_id=?",[req.user.id]);
    let Cards=cards[0]
    if(cards[0].length!==0){
      cards[0].forEach(card=>{
        card.card_number=decrypt(JSON.parse(card.card_number)).slice(-4),
        card.year=decrypt(JSON.parse(card.year)),
        card.month=decrypt(JSON.parse(card.month))
      })
    }
    let [delivery_fee]=await con.promise().query("SELECT delievery_fee from orders where id=?",[req.params.order_id]);
    console.log(delivery_fee.delievery_fee);
    delivery_fee=delivery_fee[0].delievery_fee;
   let delivery=Orders[0].dilivery_type;
    let subtotal=Orders[0].subtotal;
    res.render("gateway",{Orders,subtotal,order_id:req.params.order_id,addresses:addresses[0],cards:cards[0],type,delivery,fee:delivery_fee})
  } catch (error) {
    if(error) throw error;
    
  }  
})

function orderCode(){
  return Math.floor(10000+Math.random()*90000);
}

app.post("/gateway",NotAuthenticated,user,async (req,res)=>{
  console.log(req.body);
  console.log("API Received");
  let FrontendTotal=req.body.Total;
  let BackendTotal=0;
  let Orders=req.body.orders;
  const now = dayjs();
  const today = dayjs().format("dd"); // Mo, Tu, We, Th, Fr, Sa, Su
  
  for (let item of Orders) {
  
    let [rows] = await con.promise().query(
      "SELECT store_times FROM store_info WHERE id=?",
      [item.id]
    );
  
    if (!rows.length) continue;
  
    let Store_times = JSON.parse(rows[0].store_times);
    if (!Store_times.length) continue;
  
    let todaySchedule;
  
    // 🔹 Determine today's schedule
    if (["Mo","Tu","We","Th","Fr"].includes(today)) {
      todaySchedule = Store_times.find(t => t.Days === "Mon-Fri");
    } else if (today === "Sa") {
      todaySchedule = Store_times.find(t => t.Days === "Sat");
    } else if (today === "Su") {
      todaySchedule = Store_times.find(t => t.Days === "Sun");
    }
  
    // No schedule for today → assume closed
    if (!todaySchedule) {
      return res.json({
        Status: false,
        reason: "Store closed today"
      });
    }
  
    // 🔴 Trading status check FIRST (no time logic yet)
    if (todaySchedule.Trading?.toLowerCase() === "closed") {
      return res.json({
        Status: false,
        reason: "Store is not trading today"
      });
    }
  
    // 🕒 Build opening & closing times using today's date
    let opening = dayjs(
      `${now.format("YYYY-MM-DD")} ${todaySchedule.opening}`,
      "YYYY-MM-DD HH:mm"
    );
  
    let closing = dayjs(
      `${now.format("YYYY-MM-DD")} ${todaySchedule.closing}`,
      "YYYY-MM-DD HH:mm"
    );
  
    // 🌙 Handle overnight stores (e.g. 18:00 → 02:00)
    if (closing.isBefore(opening)) {
      closing = closing.add(1, "day");
    }
  
    const isOpen = now.isAfter(opening) && now.isBefore(closing);
  
    if (!isOpen) {
      return res.json({
        Status: false,
        reason: `Store closed. Trading hours: ${opening.format("HH:mm")} to ${closing.format("HH:mm")}`
      });
    }
  }
  
  Orders.forEach(order=>{
    BackendTotal+=order.qty*order.SellingPrice
  });

  console.log("Backend Total",BackendTotal);
  console.log("Frontend Total",FrontendTotal);

  if(BackendTotal!==FrontendTotal){
    throw new Error("Hmm something is fishy")
  }

  console.log("Okay we are good both totals are equal. Backend total",BackendTotal,"frontend Total",FrontendTotal);
  let NewTotal=0;
  for(let order of Orders){
   let sellingprice=await con.promise().query("SELECT sellingPrice from meals WHERE meal_id=?",[order.meal_id]);
   if(sellingprice[0].length==0){
     throw new Error("Something is fishy")
   }
   console.log(sellingprice[0]);
   NewTotal+=sellingprice[0][0].sellingPrice*order.qty;
  }

  console.log("new Total",NewTotal);
  if(NewTotal!==FrontendTotal){
    throw new Error("Error!")
  }

  // console.log("Okay everything seems fine for now")

  try {
    let orderId=uuid.v4();
    let order_code=orderCode();
    let user_order_code=orderCode();
    let Today=dayjs().format("YYYY-MM-DD HH:mm:ss");
    // console.log(req.body)
    let status;
    if(req.body.promocode==" "){
      status=false;
    }else{
      status=true;
    }

    let geolocation=req.body.location;
    let userLocation={lat:geolocation.lat,lng:geolocation.lng};
    let first=Orders[0].id;
    let [store_location]=await con.promise().query("SELECT location from store_info where id=?",[first]);
    store_location=JSON.parse(store_location[0].location);
    let distance=getDistanceInMeters(store_location,userLocation);
    userLocation=JSON.stringify(userLocation);
    let deliveryFee=0;
    if(distance<=1000){
        deliveryFee=25;
    }else if(distance>1000){
        let addedDistance=distance-1000;
        let extraFee=addedDistance*0.01;
        console.log("Extra Fee:",extraFee.toFixed(2));
        deliveryFee=25+extraFee;
        console.log("Total Delivery Fee: R",deliveryFee.toFixed(2));
    }

    for(let item of Orders){
      await con.promise().query("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[orderId,req.user.id,item.id,item.meal_id,item.qty,order_code,user_order_code,"PENDING","none",item.SellingPrice*item.qty,NewTotal+deliveryFee,status,req.body.promocode,"CREATED","no",null,null,"no","DILIVERY","WAITING_FOR_DRIVER",deliveryFee,null,userLocation,null,null,null,Today,Today]);
    }

    cartTotal+=(NewTotal+deliveryFee);
    console.log("Cart Total", cartTotal);

    return res.json({Status:true, RedirectURL:"/gateway/payment/route/"+orderId});
  }catch(err){
    if(err) throw err
  }
});

app.get("/wallet/for/store/:store_id",NotAuthenticated,store,async (req,res)=>{
  try {
    if(req.params.store_id!==req.user.id){
      return res.redirect("/home")
    }
    let Sales=await con.promise().query("SELECT o.*,m.meal_name FROM orders o JOIN meals m ON m.meal_id=o.meal_id where o.store_id=? AND o.order_status=?",[req.params.store_id,"collected"]);
    console.log("Sales",Sales[0]);
    let wallet=await con.promise().query("SELECT s.*,i.storename FROM store_wallet s JOIN store_info i on i.id=s.store_id where s.store_id=?",[req.params.store_id]);
    console.log("Wallet",wallet[0]);
    return res.render("wallet_store",{Wallet:wallet[0][0],Sales:Sales[0]});
  } catch (error) {
    if(error){
      throw error
    }
  }
})

app.get("/customers/for/:store_id",NotAuthenticated,store,async (req,res)=>{
  try {
    let customers = await con.promise().query(`SELECT u.user_id, o.fullname, COUNT(*) AS successful_orders,SUM(amount) as total_spent FROM orders u JOIN user_info o ON o.id = u.user_id WHERE u.order_status IN ('COMPLETE', 'PAID', 'COLLECTED', 'READY') AND u.store_id=? GROUP BY u.user_id, o.fullname ORDER BY total_spent DESC`,[req.user.id]);
    customers=customers[0]
    let name=await con.promise().query("SELECT storename from store_info WHERE id=?",[req.user.id]);
    console.log(customers)

    return res.render("customers",{store_id:req.user.id,Name:name[0][0].storename,customers})
  } catch (error) {
    if(error) throw error
    
  }
});

app.get("/full/store/orders",NotAuthenticated,store,async (req,res)=>{
  try {
    let success=await con.promise().query("SELECT o.*,m.meal_name FROM orders o JOIN meals m ON m.meal_id=o.meal_id where o.store_id=? AND o.order_status=? ",[req.user.id,"COLLECTED"]);
    let pending=await con.promise().query("SELECT o.*,m.meal_name FROM orders o JOIN meals m ON m.meal_id=o.meal_id where o.store_id=? AND o.order_status=? ",[req.user.id,"PAID"]);
    let failed=await con.promise().query("SELECT o.*,m.meal_name FROM orders o JOIN meals m ON m.meal_id=o.meal_id where o.store_id=? AND o.order_status=? ",[req.user.id,"REFUNDED"]);

    let waiting=await con.promise().query("SELECT o.*,m.meal_name FROM orders o JOIN meals m ON m.meal_id=o.meal_id where o.store_id=? AND o.order_status=?",[req.user.id,"ACCEPTED"]);
    waiting=waiting[0];
    success=success[0];
    pending=[0];
    failed=failed[0];
    let name=await con.promise().query("SELECT storename from store_info WHERE id=?",[req.user.id]);
    console.log(failed,success)
    return res.render("all_store_orders",{failed,waiting,success,pending,store_id:req.user.id,Name:name[0][0].storename});
  } catch (error) {
    if(error) throw error;
  }
})


let cartTotal=0;

const generateSignature = (data, passPhrase = null) => {
  // Create parameter string
  let pfOutput = "";
  for (let key in data) {
    if(data.hasOwnProperty(key)){
      if (data[key] !== "") {
        pfOutput +=`${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}&`
      }
    }
  }

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);
  if (passPhrase !== null) {
    getString +=`&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
  }

  return crypto.createHash("md5").update(getString).digest("hex");
};
let key=Buffer.from(process.env.key,"hex");
function encryption(value){
  const size=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",key,size)
  let encrypted=cipher.update(value,"utf-8","hex");
  encrypted+=cipher.final("hex");

  const authTag=cipher.getAuthTag();

  return{
    iv:size.toString("hex"),
    content:encrypted,
    authTag:authTag.toString("hex")
  }
}

function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  let decrypted = decipher.update(encryptedData.content, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// checking out
app.post("/checkout/first",NotAuthenticated,user,async (req,res)=>{
  console.log("API Received");
  console.log(req.body)
  try {
    let Today=dayjs().format("YYYY-MM-DD HH:mm:ss");
    
    let order=await con.promise().query("SELECT subtotal,dilivery_type FROM  orders where id=?",[req.body.OrderId]);
    let Subtotal=order[0][0].subtotal;

    let Adrress={Stand:req.body.stand,Ext:req.body.ext,Town:req.body.town,extra_info:req.body.directions||null}

    Adrress=encryption(JSON.stringify(Adrress));
    
    await con.promise().query("UPDATE orders SET DILIVERY_ADDRESS=? where id=?",[JSON.stringify(Adrress),req.body.OrderId]);
  
    if(req.body.addressSave && !req.body.oldAddress){
      await con.promise().query("INSERT into delivery_adress VALUES(?,?,?,?,?)",[req.user.id,req.body.town,req.body.ext,req.body.stand,req.body.directions])
    }
    

    let card_id=uuid.v4();

    if(req.body.cardSave && !req.body.OldCard){
      await con.promise().query("INSERT into payment_info VALUES(?,?,?,?,?,?,?,?)",[req.user.id,JSON.stringify(encryption(req.body.cvv)),JSON.stringify(encryption(req.body.cardNumber)),JSON.stringify(encryption(req.body.card_name)),JSON.stringify(encryption(req.body.month)),JSON.stringify(encryption(req.body.year)),card_id,0])
    }

    let merchant_id=process.env.Merchant_ID;
    let merchant_key=process.env.Merchant_Key;
    let passphrase=process.env.passphrase;
    let basic_url=process.env.ngrok_url;
    let return_url=`${basic_url}payment/response`;
    let cancel_url=`${basic_url}payment/cancel`;
    let notify_url=`${basic_url}payment/notify`;
    // let pfHost="sandbox.payfast.co.za";
    const myData = [];
    // Merchant details
    myData["merchant_id"] = merchant_id;
    myData["merchant_key"] = merchant_key;
    myData["return_url"] = return_url;
    myData["cancel_url"] = cancel_url;
    myData["notify_url"] = notify_url;
    // Buyer details
    myData["email_address"] = req.user.email;
    // Transaction details
    myData["m_payment_id"] = req.body.OrderId; //Unique payment ID to pass through to notify_url
    myData["amount"] = Subtotal;
    myData["item_name"] = `Order#${req.body.OrderId}`;
    
    // Generate signature
    const myPassphrase = passphrase;
    myData["signature"] = generateSignature(myData, myPassphrase);
    
    let htmlForm = `<form action="https://${pfHost}/eng/process" method="post">`;
    for (let key in myData) {
      if(myData.hasOwnProperty(key)){
        value = myData[key];
        if (value !== "") {
          htmlForm +=`<input name="${key}" type="hidden" value="${value}" />`;
        }
      }
    }
    
    htmlForm += '<input type="submit" value="Pay Now" id="payfast-btn" /></form>';
   
    return res.json({Status:true,form:htmlForm});
  } catch (error) {
    if(error){
      throw error;
    }
    
  }
});

const testingMode = true;
const pfHost = testingMode ? "sandbox.payfast.co.za" : "www.payfast.co.za";

const pfValidSignature = (pfData, pfParamString, pfPassphrase = null) => {
  if (pfPassphrase !== null) {
    pfParamString += `&passphrase=${encodeURIComponent(pfPassphrase.trim()).replace(/%20/g, "+")}`;
  }
  const signature = crypto.createHash("md5").update(pfParamString).digest("hex");
  return pfData["signature"] === signature;
};

async function ipLookup(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, { all: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses.map(a => a.address));
    });
  });
}

const pfValidIP = async (req) => {
  const validHosts = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];
  const pfIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  let validIps = [];
  for (let host of validHosts) {
    const ips = await ipLookup(host);
    validIps = [...validIps, ...ips];
  }

  return validIps.includes(pfIp);
};

const pfValidPaymentData = async (pfData) => {
  const [order] = await con.promise().query(
    "SELECT subtotal FROM orders WHERE id = ?",
    [pfData.m_payment_id]
  );
  if (!order[0]) return false;

  const cartTotal = parseFloat(order[0].subtotal);
  const amountGross = parseFloat(pfData.amount_gross);

  return Math.abs(cartTotal - amountGross) <= 0.01;
};

const pfValidServerConfirmation = async (pfHost, pfParamString) => {
  try {
    const res = await axios.post(`https://${pfHost}/eng/query/validate`, pfParamString);
    return res.data === "VALID";
  } catch (err) {
    console.error(err);
    return false;
  }
};

app.post("/payment/notify", async (req, res) => {
  try {
    // Now req.body exists
    const pfData = { ...req.body };

    // Build param string exactly like docs
    let pfParamString = "";
    for (let key in pfData) {
      if (key !== "signature") {
        pfParamString += `${key}=${encodeURIComponent(pfData[key].trim()).replace(/%20/g, "+")}&`;
      }
    }
    pfParamString = pfParamString.slice(0, -1);

    // Run all checks
    const check1 = pfValidSignature(pfData, pfParamString, passphrase);
    const check2 = await pfValidIP(req);
    const check3 = await pfValidPaymentData(pfData);
    const check4 = await pfValidServerConfirmation(pfHost, pfParamString);
    console.log(req.body)
    if (check1 && check2 && check3 && check4) {
      console.log("Everything is fine in payments")
      await con.promise().query("UPDATE orders SET order_status='paid',payment_status=?,updated_at=?,payment_reference=? where id=?",[req.body.payment_status,dayjs().format("YYYY-MM-DD HH:mm"),req.body.pf_payment_id,req.body.m_payment_id]);
    } else {
      console.log("Payment validation failed!");
      console.log(check1,check2,check3,check4);
      console.log(req.body);
      console.log(req.body.payment_status);
      // await con.promise().query("INSERT INTO error_transactions values (m_payment_id=?,pf_payment_id=?,payment_status=?,signature=?,email=?)",[req.body.m_payment_id,req.body.pf_payment_id,req.body.payment_status,req.body.signature,req.body.email_address])
      await con.promise().query(`INSERT INTO error_transactions (m_payment_id, pf_payment_id, payment_status, signature, email)VALUES (?, ?, ?, ?, ?)`,[req.body.m_payment_id,req.body.pf_payment_id,req.body.payment_status,req.body.signature,req.body.email_address ]);
      return res.redirect('/home')

    }
    let [ids]=await con.promise().query("SELECT store_id from orders where id=?",[req.body.m_payment_id]);
    let IDS=ids.map(item=>item.store_id);
    console.log(IDS);
    io.emit("New Order Alert",{
      TheIds:IDS
    });
    cartTotal=0
    res.send("OK");
  } catch (err) {
    console.error(err);
    // res.status(500).send("ERROR");
    throw err
  }
});

app.get("/payment/cancel",async (req,res)=>{
  console.log("Payment cancel API received");
  console.log(req.query);
  console.log(req.body);
});

app.get("/payment/response",async (req,res)=>{
  console.log("Payment response API received");
  const {m_payment_id,payment_status}=req.query;
  console.log("API for next payment is Received")
  console.log(req.query);
  // res.send("Response received")
  return res.redirect(`/order/for/customer/${req.params.orderId}`);
})

// Created success😭
app.get("/payment/next/:payment_status/:orderId",NotAuthenticated,async (req,res)=>{
  console.log("API for next payment is Received")
  console.log(req.params.payment_status);
  if(req.params.payment_status="COMPLETE"){
    console.log(req.params.orderId)
    await con.promise().query("UPDATE orders SET payment_status=?,order_status=?,updated_at=? where id=?",["COMPLETE","PAID",dayjs().format("YYYY-MM-DD HH:mm:ss"),req.params.orderId]);
    let [ids]=await con.promise().query("SELECT store_id from orders where id=?",[req.params.orderId]);
    let IDS=ids.map(item=>item.store_id);
    console.log(IDS);
    io.emit("New Order Alert",{
      TheIds:IDS
    });
  }
  return res.redirect(`/order/for/customer/${req.params.orderId}`);
})

app.post("/checkout/second/order/action/:safeCode",NotAuthenticated,store,async (req,res)=>{
  console.log(req.params.safeCode);
  let safeCode=process.env.SafeCode;
  console.log("API Received")

  if(req.params.safeCode!==safeCode) return res.status(400).json({status:false,Reason:"Error: Something is fish"});
  console.log("Everything is fine");
  console.log(req.body);
  let Now=dayjs().format("YYYY-MM-DD HH:mm:ss");

  try {
    if(req.body.Status=="ACCEPTED"){
      await con.promise().query("update orders SET order_status=?,accepted_at=?,updated_at=? WHERE id=? AND meal_id=? AND store_id=?",[req.body.Status,Now,Now,req.body.order_id,req.body.meal_id,req.user.id]);
    }else  if(req.body.Status=="READY"){
      console.log("Order status is ready")
      await con.promise().query("update orders SET order_status=?,prepared_at=?,updated_at=? WHERE id=? AND meal_id=? AND store_id=?",[req.body.Status,Now,Now,req.body.order_id,req.body.meal_id,req.user.id]);
    }else{
      return res.status(400).json({status:false})
    }    
    io.emit("Data Base Updated",{
      order_id:req.body.order_id,
      status:req.body.Status
    });
    return res.status(200).json({status:true});
  } catch (error) {
    if(error){
      throw error;
    }
    
  }

});

// checking order ID
io.on("connection",socket=>{
  // console.log("Use connected wit id",socket.id);
  socket.on("check order code",async (data)=>{
    console.log("Trying to update order");
  })
});

app.post("/check/order/code",NotAuthenticated,store,async (req,res)=>{
  try {
   let data=req.body;
   let OrderCode=data.OrderCode;
   let order_id=data.order_id;
   let meal_id=data.meal_id;
   let store_id=data.store_id
   console.log("Meal ID",meal_id);
   console.log("order id",order_id);
   let check=await con.promise().query("SELECT storename from store_info where id=?",[store_id]);
   if(check[0][0].length===0){
     console.log("error",check)
     return
   }
   let Code=await con.promise().query("SELECT oder_code from orders where id=? AND meal_id=?",[order_id,meal_id]);
   console.log("code",Code);
   console.log("Length",Code[0].length)
   if(Code[0].length==0){
     return socket.emit("Order code Error",{
       message:`Hmmm.. Something went wrong, please refresh the page and try again.`
     })
   }
   Code=Code[0][0].oder_code;
  //  console.log("Returned Code",Code);
   if(Code!==OrderCode){
    return res.json({Status:false,reason:"Codes do not match. Try again"})
   }
   console.log("Everything is fine")
   let Now=dayjs().format("YYYY-MM-DD HH:mm:ss");
   await con.promise().query("UPDATE orders SET order_status=?,updated_at=?,collected_at=?,delivery_status=? WHERE oder_code=? AND meal_id=? AND id=?",["COLLECTED_BY_DRIVER",Now,Now,"COLLECTED_BY_DRIVER",Code,meal_id,order_id]);
   await con.promise().query("UPDATE delivery SET delivery_status=? where order_id=?",["FETCHED",order_id]);
   let quantity=await con.promise().query("select quantity from orders where id=? and meal_id=? and oder_code=?",[order_id,meal_id,Code]);
   let amount=await con.promise().query("select amount from orders where id=? and meal_id=? and oder_code=?",[order_id,meal_id,Code]);
   let promocode=await con.promise().query("select promocode from orders where id=? and meal_id=? and oder_code=?",[order_id,meal_id,Code]);
   quantity=quantity[0][0].quantity;
   amount=amount[0][0].amount;
   promocode=promocode[0][0].promocode;
   console.log("promo",promocode);
   if(promocode!==""){
     await con.promise().query("Update promocodes set number_of_times_used=number_of_times_used+1 where promocode=?",[promocode])
   }
   console.log("Quantity",quantity);
   // await con.promise().query("UPDATE meals SET sales=sales+? WHERE meal_id=?",[quantity,meal_id]);
   // await con.promise().query("UPDATE store_wallet SET amount=amount+? where store_id=?",[amount,store_id])

   console.log("Amount",amount);
   console.log("Quantity",quantity)
   io.emit("Data Base Updated",{
     order_id:order_id,
     status:"COLLECTED"
   });
   console.log("everything is fine")
   return res.status(200).json({Status:true});
    
  } catch (error) {
    if(error) throw error
  }
})

app.post("/add/to/fav",user,NotAuthenticated,async (req,res)=>{
  console.log("Body",req.body);
  try{
    let size=await con.promise().query("select * from meals where meal_id=? ",[req.body.MealId]);
    console.log("Size:",size);
    console.log("Length:",size.length);
    if(size[0].length==0){
      return res.status(400).json({status:false,reason:"Something went wrong. Please try again"});
    }

    console.log(req.body.MealId);

    let checking=await con.promise().query("SELECT * FROM favourites where meal_id=? and user_id=?",[req.body.MealId,req.user.id]);

    if(checking[0]>0){
      return
    }

    await con.promise().query("INSERT INTO favourites VALUES(?,?)",[req.user.id,req.body.MealId]);
    return res.status(200).json({status:true});

  }catch(err){
    return res.status(400).json({status:false,reason:err.message})
  }
});

app.post("/delete/to/fav",user,NotAuthenticated,async (req,res)=>{
  try {
    console.log("Trying to delete favourites");
    console.log("user id:", req.user.id)
    console.log("Meal Id:",req.body.MealId);
    await con.promise().query("DELETE FROM favourites where user_id=? AND meal_id=?",[req.user.id,req.body.MealId]);
    return res.status(200).json({status:true})
  } catch (error) {
    return res.status(400).json({status:false,reason:"Something went wrong please try again."});
  }
})

server.listen(Port,err=>{
  if(err) throw err;
  console.log("Sever running on port: ",Port);
})