var express = require('express');
var app = express();

var path = require('path');


var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

var session = require('express-session');
app.use(session({
    secret: 'keyboardkitteh',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));

var flash = require('express-flash');
app.use(flash());

var bcrypt = require('bcrypt-as-promised');

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/lognreg');

var usersSchema = new mongoose.Schema({
    first_name: { type: String, required: true, minlength: 2 },
    last_name: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true, minlength: 7 },
    password: { type: String, required: true, minlength: 7 },
    birthday: { type: String, required: true }
},
    { timestamps: true })
mongoose.model('User', usersSchema);
var User = mongoose.model('User')

app.get('/', function (req, res) {
    res.render('index');
})

app.post('/', function (req, res) {
    console.log('HERE IS THE REG FORM: ', req.body);
    var h_pw = bcrypt.hash(req.body.password, 10)
        .then(h_pw => {
            console.log("this is hashed pw:", h_pw)
            var user = new User({ first_name: req.body.fname, last_name: req.body.lname, email: req.body.email, password: h_pw, birthday: req.body.birthday });
            console.log("HERE IS OUR USER: ", user)
            user.save(function (err, result) {
                if (err) {
                    console.log("error while posting registration", err);
                    req.session.logged_in = false;
                    console.log("REG ERR: Here is req.session.logged_in", req.session.logged_in)
                    res.redirect('/')
                } else {
                    console.log("Successfully registered: ", result);
                    //THE PROBLEM IS HERE. USER._ID IS NOT MATCHING THE _ID OF ABOVE
                    console.log(result._id);
                    req.session.user_id = result._id;
                    console.log("HERE IS USER ID:", req.session.user_id)
                    req.session.logged_in = true;
                    console.log("REGISTER: Here is req.session.logged_in", req.session.logged_in)
                    res.redirect('/logged')
                }

            })
        })
        .catch(error => {
            console.log(error)
            res.redirect('/')
        });
})

app.get('/logged', function (req, res) {
    User.find({ _id: req.session.user_id }, function (err, result) {
        if (err) {
            console.log('error while loading l_page', err)
            req.session.logged_in = false;
            console.log("/LOGGED GET ERR: Here is req.session.logged_in", req.session.logged_in)
            res.redirect('/')
        } else {
            console.log("log in stuff", result)
            req.session.logged_in = true;
            console.log("/LOGGED GET: Here is req.session.logged_in", req.session.logged_in)
            console.log(result[0].first_name)
            res.render('l_page', { name: result[0].first_name})
        }
    })
})

app.post('/logged', function (req, res) {
    console.log("HERE IS THE LOG-IN FORM: ", req.body)
    User.find({ email: req.body.email }, function (err, result) {
        if (err) {
            console.log('finding user in log in post: ', err)
            req.session.logged_in = false;
            res.redirect('/')
        } else {
            console.log("log in stuff", result)
            var h_pw = result[0].password
            console.log("here is the password now: ", h_pw)
            console.log("here is logged_in status: ", req.session.logged_in)
            if (!req.session.logged_in) {
                bcrypt.compare(req.body.password, h_pw)
                    .then(result => {
                        User.find({ email: req.body.email }, function (err, user) {
                            if (err) {
                                console.log("Something went wrong with log in");
                                req.session.logged_in = false;
                                console.log("/LOGGED POST ERR: Here is req.session.logged_in", req.session.logged_in)
                                res.redirect('/');
                            } else {
                                console.log("Here is our user that is logging in: ", user)
                                req.session.user_id = user[0]._id;
                                req.session.name = user[0].first_name;
                                req.session.logged_in = true;
                                console.log(req.session.user_id, req.session.name)
                                console.log("/LOGGED POST: Here is req.session.logged_in", req.session.logged_in)
                                res.redirect('/logged');
                            }
                        })

                    })
                    .catch(error => {
                        console.log("Error while getting pw: ", error)
                    })
            }
        }
    })
});

app.post('/logout', function (req, res) {
    req.session.logged_in = false;
    console.log("/LOGOUT POST: Here is logged_in status: ", req.session.logged_in)
    res.redirect('/')
})

app.listen(8000)