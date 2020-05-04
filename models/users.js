const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = mongoose.Schema({
    firstName: String,
    lastName: String,
    gender: String,
    dob: String,
    contact: Number,
    address: String,
    email: {type:String,required:true,unique:false},
    image: String,
    skills: String,
    accomplishments: String,
    linkedin: String,
    score: {type:Number,default:0},
    user_id: {type: String,required: true,unique: true},
    password: {type:String,required:true},
    is_admin: Boolean,
    IRDA: {type:String,default:"XXXXXX"},
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
