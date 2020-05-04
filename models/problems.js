const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const ProblemSchema = mongoose.Schema({
        index: Number,
        statement: {type: String, required: true},
        op: {type:String,required:true},
        optA: {type: String, required: true},
        optB: {type: String, required: true},
        optC: {type: String, required: true},
        optD: {type: String, required: true}
});

ProblemSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Problem", ProblemSchema);
