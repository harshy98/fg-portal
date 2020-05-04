require('dotenv').config()
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var localStrategy = require("passport-local").Strategy;
var methodOverride = require("method-override");
var session = require("express-session");
var flash = require("connect-flash");
var crypto = require("crypto");
var async = require("async");
var nodemailer = require("nodemailer");
var bcrypt = require("bcrypt");
var webpush = require("web-push");
let jsSHA = require('jssha');
let btoa = require('btoa');
let applicationId = "487689.vidyo.io";
let developerKey = process.env.DEVKEY;

app.use(express.static(__dirname + "/client"));
app.use(bodyParser.json());

/* push notifications not needed
const publicVapidKey='BO68kj27Xzwxq8FpHF69q7rz2h0L0VenRBYw_Xq-g1o25bUK2s8e3XOXqs4tUfE3Y6UF3aQlQwuGzfMjwQ9rqRw';
const privateVapidKey='WBnzAU9N752YAejQ1Z2gETr1mUQEoqgkoi-FopKW0lE';
webpush.setVapidDetails('mailto:test@test.com',publicVapidKey,privateVapidKey);
app.post('/subscribe',function(req, res, next) {
   const subscription = req.body; 
   res.status(201).json({});
   const payload = JSON.stringify({title:'pushtest'});
   webpush.sendNotification(subscription,payload).catch(err=>console.error(err));
});
*/

var index=0;
var setNum = 0;

app.use(session({ cookie: { maxAge: 120000 }, 
                  secret: 'woot',
                  resave: false, 
                  saveUninitialized: false,
                  rolling: true
}));

app.use(flash());
  
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));

app.use(express.static(__dirname + "/assets"));

app.use(methodOverride("_method"));

function getRandomInt() {
return Math.floor(Math.random() * Math.floor(9999));
}

function generateToken(expiresInSeconds) {
var EPOCH_SECONDS = 62167219200;
var expires = Math.floor(Date.now() / 1000) + expiresInSeconds + EPOCH_SECONDS;
var shaObj = new jsSHA("SHA-384", "TEXT");
shaObj.setHMACKey(developerKey, "TEXT");
var jid = "demoUser" + getRandomInt() + '@' + applicationId;
var body = 'provision' + '\x00' + jid + '\x00' + expires + '\x00';
shaObj.update(body);
var mac = shaObj.getHMAC("HEX");
var serialized = body + '\0' + mac;
return btoa(serialized);
}

app.get('/token', (req, res) => {
let thirtyMinutes = 30 * 60;
let response = JSON.stringify({
token: generateToken(thirtyMinutes)
});
res.send(response);
});

app.get('/interview',function(req,res){
	res.render('interview');
});

app.get('/admin/interview',function(req,res){
  res.render('admin_interview');
});

var User = require('./models/users.js');
var Admin = require('./models/admins.js');
var Problem = require('./models/problems.js');
var Tutorial = require("./models/tutorials.js");

mongoose.connect(process.env.MONGOURI,{useNewUrlParser: true},function(){
    console.log("db is on");    
});

/*app.use(session({
    secret: "This is unlocked",
    resave: false, 
    saveUninitialized: false
}));*/

app.use(passport.initialize());

app.use(passport.session());

passport.use('user',new localStrategy({usernameField: 'user_id'},function(user_id,password,done){
    User.findOne({
        user_id: user_id
    }).then(user => {
        if(!user){
            return done(null,false);
        }
        bcrypt.compare(password,user.password,(err,isMatch)=>{
            if(err) throw err;
            if(isMatch){
                return done(null,user);
            } else {
                return done(null,false);
            }
        });
    });
}));

passport.use('admin',new localStrategy({usernameField: 'user_id'},function(user_id,password,done){
    Admin.findOne({
        user_id: user_id
    }).then(admin => {
        if(!admin){
            return done(null,false);
        }
        bcrypt.compare(password,admin.password,(err,isMatch)=>{
            if(err) throw err;
            if(isMatch){
                return done(null,admin);
            } else {
                return done(null,false);
            }
        });
    });
}));

passport.serializeUser(function(user, done) {
  let type = user.is_admin ? 'admin' : 'user';
  done(null, { id: user.id, type: type});
});

passport.deserializeUser(function(data, done) {
  if(data.type === 'user'){
    User.findById(data.id, function(err, user) {
      done(err, user);
    });
  } else{
    Admin.findById(data.id, function(err, user) {
      done(err, user);
    });
  }
});

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   next();
});

app.use(function(err, req, res, next) {
    console.log(err);
});

app.get('/',function(req,res){
   res.render('index'); 
});

app.get('/register',function(req, res) {
   res.render('register'); 
});

app.get('/admin/register',function(req, res) {
   res.render('admin_register'); 
});

app.get('/login',function(req,res){
    res.render('login',{success:req.flash('success'),error:req.flash('error')});    
});

app.get('/admin/login',function(req, res) {
   res.render('admin_login'); 
});

app.get('/forgot', function(req, res) {
  res.render('forgot', {
    user: req.user,error: req.flash('error'),success: req.flash('success')
  });
});

app.get('/admin/forgot', function(req, res) {
  res.render('admin_forgot', {
    user: req.user,error: req.flash('error'),success: req.flash('success')
  });
});

app.get('/createtest',isAdminLoggedIn,function(req, res) {
   res.render('create_test',{success: req.flash('success'),error:req.flash('error')}); 
});

app.post('/createtest',isAdminLoggedIn,function(req, res) {
    
      var newQuestion1 = new Problem({
        index: index+1,
        statement: req.body.statement1,
        op: req.body.op1,
        optA: req.body.optA1,
        optB: req.body.optB1,
        optC: req.body.optC1,
        optD: req.body.optD1
      });
      var newQuestion2 = new Problem({
        index: index+2,
        statement: req.body.statement2,
        op: req.body.op2,
        optA: req.body.optA2,
        optB: req.body.optB2,
        optC: req.body.optC2,
        optD: req.body.optD2
      });
       var newQuestion3 = new Problem({
        index: index+3,
        statement: req.body.statement3,
        op: req.body.op3,
        optA: req.body.optA3,
        optB: req.body.optB3,
        optC: req.body.optC3,
        optD: req.body.optD3
      });
       var newQuestion4 = new Problem({
        index: index+4,
        statement: req.body.statement4,
        op: req.body.op4,
        optA: req.body.optA4,
        optB: req.body.optB4,
        optC: req.body.optC4,
        optD: req.body.optD4
      });
       var newQuestion5 = new Problem({
        index: index+5,
        statement: req.body.statement5,
        op: req.body.op5,
        optA: req.body.optA5,
        optB: req.body.optB5,
        optC: req.body.optC5,
        optD: req.body.optD5
      });
       var newQuestion6 = new Problem({
        index: index+6,
        statement: req.body.statement6,
        op: req.body.op6,
        optA: req.body.optA6,
        optB: req.body.optB6,
        optC: req.body.optC6,
        optD: req.body.optD6
      });
       var newQuestion7 = new Problem({
        index: index+7,
        statement: req.body.statement7,
        op: req.body.op7,
        optA: req.body.optA7,
        optB: req.body.optB7,
        optC: req.body.optC7,
        optD: req.body.optD7
      });
       var newQuestion8 = new Problem({
        index: index+8,
        statement: req.body.statement8,
        op: req.body.op8,
        optA: req.body.optA8,
        optB: req.body.optB8,
        optC: req.body.optC8,
        optD: req.body.optD8
      });
       var newQuestion9 = new Problem({
        index: index+9,
        statement: req.body.statement9,
        op: req.body.op9,
        optA: req.body.optA9,
        optB: req.body.optB9,
        optC: req.body.optC9,
        optD: req.body.optD9
      });
       var newQuestion10 = new Problem({
        index: index+10,
        statement: req.body.statement10,
        op: req.body.op10,
        optA: req.body.optA10,
        optB: req.body.optB10,
        optC: req.body.optC10,
        optD: req.body.optD10
      });
      Problem.create([
        newQuestion1,newQuestion2,newQuestion3,newQuestion4,newQuestion5,newQuestion6,newQuestion7,newQuestion8,newQuestion9,newQuestion10
      ],function(err,problem){
        if(err){
          req.flash('error','Questions not inserted, please try again.');
          res.redirect('/createtest');
        }else{
          req.flash('success','Questions inserted successfully');
          res.redirect('/createtest');
        }
      });
});      

app.get('/taketest1',isLoggedIn,function(req, res) {
   Problem.find({index:{$gt:0,$lt:11}},function(err,problem){
     res.render('taketest1',{problem:problem});
   });
});

/* taketest2 route not used anymore
app.get('/taketest2',isLoggedIn,function(req, res) {
   Problem.find({index:{$gt:10,$lt:21}},function(err,problem){
     res.render('taketest2',{problem:problem});
   });
});
*/

app.post('/taketest1',isLoggedIn, (req, res) => {
  Problem.find({index:{$gt:0,$lt:11}}, function(err, problem) {
    console.log(problem);
    let score = 0;
    if (req.body.op1 === problem[0].op)
      score += 10;
    if (req.body.op2 === problem[1].op)
      score += 10;
    if (req.body.op3 === problem[2].op)
      score += 10;
    if (req.body.op4 === problem[3].op)
      score += 10;
    if (req.body.op5 === problem[4].op)
      score += 10;
    if (req.body.op6 === problem[5].op)
      score += 10;
    if (req.body.op7 === problem[6].op)
      score += 10;
    if (req.body.op8 === problem[7].op)
      score += 10;
    if (req.body.op9 === problem[8].op)
      score += 10;
    if (req.body.op10 === problem[9].op)
      score += 10;
      req.user.score = score;
      req.user.save();
      res.render('score', { currentUser:req.user });
  });
});

/* taketest2 post not required
app.post('/taketest2',isLoggedIn, (req, res) => {
  Problem.find({index:{$gt:10,$lt:21}}, function(err, problem) {
    console.log(problem);
    let score = 0;
    if (req.body.op1 === problem[0].op)
      score += 10;
    if (req.body.op2 === problem[1].op)
      score += 10;
    if (req.body.op3 === problem[2].op)
      score += 10;
    if (req.body.op4 === problem[3].op)
      score += 10;
    if (req.body.op5 === problem[4].op)
      score += 10;
    if (req.body.op6 === problem[5].op)
      score += 10;
    if (req.body.op7 === problem[6].op)
      score += 10;
    if (req.body.op8 === problem[7].op)
      score += 10;
    if (req.body.op9 === problem[8].op)
      score += 10;
    if (req.body.op10 === problem[9].op)
      score += 10;
     res.render('score', { score: score });
  });
});
*/

app.get('/addtutorials',isAdminLoggedIn,function(req, res) {
   res.render('addtutorials'); 
});

app.post('/addtutorials',isAdminLoggedIn,function(req,res){
  var newTutorial = {};
  newTutorial.title = req.body.title;
  newTutorial.content = req.body.content;
  Tutorial.create(newTutorial,function(err,tutorial){
    if(err){
      console.log(err);
    }
    res.redirect('/addtutorials');
  });
});

app.get('/showtutorials',isLoggedIn,function(req, res) {
   Tutorial.find({},function(err,tutorials){
     if(err){
       console.log(err);
     }
     res.render('showtutorials',{tutorials:tutorials});
   });
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
          host: 'smtp.zoho.in',
          port: 465,
          secure: true,
          auth: {
             user: 'futuregen@zohomail.in',
             pass: process.env.MAILPASS
         }
      });
      var mailOptions = {
        to: user.email,
        from: 'futuregen@zohomail.in',
        subject: 'Future Generali Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.post('/admin/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      Admin.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/admin/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
          host: 'smtp.zoho.in',
          port: 465,
          secure: true,
          auth: {
             user: 'futuregen@zohomail.in',
             pass: process.env.MAILPASS
         }
      });
      var mailOptions = {
        to: user.email,
        from: 'futuregen@zohomail.in',
        subject: 'Future Generali Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/admin/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/admin/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

app.get('/admin/reset/:token', function(req, res) {
  Admin.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/admin/forgot');
    }
    res.render('admin_reset', {token: req.params.token});
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password == req.body.confirm) {
          user.password = req.body.password;
          bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) throw err;
            user.password = hash;
            user
              .save()
              .then(user => {
                res.redirect('/login');
              })
              .catch(err => console.log(err));
          });
        });
        user.setPassword(user.password);
		
		/*
             user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
               req.logIn(user, function(err) {
                done(err, user);
              
            });
          })
        });
        */
		  
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        host: 'smtp.zoho.in',
        port: 465,
        secure: true, 
        auth: {
             user: 'futuregen@zohomail.in',
             pass: process.env.MAILPASS
         }
      });
      var mailOptions = {
        to: user.email,
        from: 'futuregen@zohomail.in',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    console.log(err);
    res.redirect('/');
  });
});

app.post('/admin/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      Admin.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password == req.body.confirm) {
          user.password = req.body.password;
          bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) throw err;
            user.password = hash;
            user
              .save()
              .then(user => {
                res.redirect('/admin/login');
              })
              .catch(err => console.log(err));
          });
        });
        user.setPassword(user.password);
		
		/*
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
               done(err, user);
              
           });
          })
        });
        */
		
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        host: 'smtp.zoho.in',
        port: 465,
        secure: true,
        auth: {
             user: 'futuregen@zohomail.in',
             pass: process.env.MAILPASS
         }
      });
      var mailOptions = {
        to: user.email,
        from: 'futuregen@zohomail.in',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    console.log(err);
    res.redirect('/');
  });
});

app.post('/register', (req, res) => {
    const {firstName, lastName, gender, dob, contact, address, email, user_id, password, password2} = req.body;
    const linkedin = req.body.linkedin;
    const is_admin = false;
    User.findOne({ user_id: user_id }).then(user => {
      if (user) {
        res.render('register');
      } else {
        const newUser = new User({
         firstName,
         lastName,
         gender,
         dob,
         contact,
         address,
         email,
         linkedin,
         user_id,
         password,
         password2,
         is_admin
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                res.redirect('/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
});

app.post('/admin/register', (req, res) => {
    const {firstName, lastName, gender, dob, contact, address, email, user_id, password, password2} = req.body;
    const is_admin = true;
    Admin.findOne({ user_id: user_id }).then(admin => {
      if (admin) {
        res.render('admin_register');
      } else {
        const newAdmin = new Admin({
         firstName,
         lastName,
         gender,
         dob,
         contact,
         address,
         email,
         user_id,
         password,
         password2,
         is_admin
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newAdmin.password, salt, (err, hash) => {
            if (err) throw err;
            newAdmin.password = hash;
            newAdmin
              .save()
              .then(admin => {
                res.redirect('/admin/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
});
    
app.post("/login", function(req,res,next){
    passport.authenticate('user',{
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: 'Login is unsuccessful, please login again.'
    })(req,res,next);
});

app.post("/admin/login",function(req, res, next) {
   passport.authenticate('admin',{
       successRedirect: '/admin/dashboard',
       failureRedirect: '/admin/login',
       failureFlash: 'Login is unsuccessful, please login again.'
   })(req,res,next);
});

app.get('/dashboard',isLoggedIn,function(req, res) {
    res.render('dashboard');
});

app.get('/admin/dashboard',isAdminLoggedIn,function(req, res, next) {
   res.render('admin_dashboard');
});

app.get('/skills',isLoggedIn,function(req, res) {
   res.render('skills',{currentUser:req.user}); 
});

app.post('/skills',isLoggedIn,function(req, res) {
    User.findOne({user_id:req.user.user_id},function(err, user) {
       if(err){
         console.log('error');
       } 
       user.skills=req.body.skills;
       user.accomplishments=req.body.accomplishments;
       user.save(function(err){
         if(!err){
          res.redirect('/dashboard'); 
         }
       });
    });
});

app.get('/scores',function(req, res) {
   res.render('score',{currentUser:req.user}); 
});

app.get('/profile',function(req, res) {
   res.render('profile'); 
});

app.get('/editprofile',isLoggedIn,function(req, res) {
   res.render('edit_profile'); 
});

app.post('/editprofile',isLoggedIn,function(req, res, next) {
   User.findById({_id:req.user._id},function(err,user){
      user.firstName= req.body.firstName;
      user.lastName= req.body.lastName;
      user.dob= req.body.dob;
      user.contact= req.body.contact;
      user.address= req.body.address;
      user.IRDA= req.body.IRDA;
      user.linkedin= req.body.linkedin;
      user.save(function(err){
        req.flash('success','Profile updated');
        res.redirect('/login');
      });
   }); 
});

app.get('/contactus', isLoggedIn, function(req, res) {
  res.render('contactus');
});
app.post('/contactus', (req, res) => {
  const output = `
    <p>You have a new contact request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Name: ${req.body.name}</li>
      <li>Email: ${req.body.email}</li>
    </ul>
    <h3>Message</h3>
    <p>${req.body.message}</p>
  `;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'branson.wintheiser@ethereal.email', // generated ethereal user
      pass: process.env.ETHEREALPASS // generated ethereal password
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Nodemailer Contact" ${req.body.email}', // sender address
    to: 'futuregen@zohomail.in', // list of receivers
    subject: 'Node Contact Request', // Subject line
    text: 'Hello world?', // plain text body
    html: output // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    res.render('dashboard');
  });
});

app.get('/interview',isLoggedIn,function(req, res) {
   res.render('interview'); 
});

app.get('/admin/interview',isAdminLoggedIn,function(req, res) {
   res.render('admin_interview'); 
});

app.get('/logout',function(req, res) {
    req.logout();
    res.redirect("/login");
});

//leaderboard(admin)
app.get("/admin/leaderboard",isLoggedIn,function(req,res){
  User.find({}).sort({score:-1}).exec(function(err,users){
    res.render("leaderboard",{users:users});
  });
});
app.get("/details/:id",function(req,res){
  User.findById(req.params.id).exec(function(err,user){
    res.render("profile",{user:user});
  });
});

function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated()){
        return next();
    }
    
    res.redirect("/login");
}

function isAdminLoggedIn(req,res,next){
    
    if(req.isAuthenticated()){
        return next();
    }
 
    res.redirect("/admin/login");
}

app.listen(process.env.PORT);
