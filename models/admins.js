const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const passportLocalMongoose = require('passport-local-mongoose');

const AdminSchema = mongoose.Schema({
    firstName: String,
    lastName: String,
    gender: String,
    dob: String,
    contact: Number,
    address: String,
    email: {type:String,required:true,unique:false},
    user_id: {type: String,required: true,unique: true},
    password: {type:String,required:true},
    is_admin: Boolean,
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

AdminSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Admin", AdminSchema);
