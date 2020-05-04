const mongoose = require('mongoose');

const passportLocalMongoose = require('passport-local-mongoose');

const TutorialSchema = mongoose.Schema({
    title: {type:String,required:true},
    content: {type: String,required:true}
});

TutorialSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Tutorial", TutorialSchema);
